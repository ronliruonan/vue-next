import { toRaw, reactive, readonly } from './reactive'
import { track, trigger } from './effect'
import { OperationTypes } from './operations'
import { LOCKED } from './lock'
import { isObject, capitalize, hasOwn } from '@vue/shared'

/** 如果是Object就返回reactive()，否则就是纯value */
const toReactive = (value: any) => (isObject(value) ? reactive(value) : value)
/** 如果是Object就返回readonly()，否则就是纯value */
const toReadonly = (value: any) => (isObject(value) ? readonly(value) : value)

/** 通过 Reflect.getPrototypeOf 原型的 get 方法 */
// effect.track get 操作
function get(target: any, key: any, wrap: (t: any) => any): any {
  // target转换为 original
  target = toRaw(target)
  // key 转换为 original
  key = toRaw(key)
  // 原型
  const proto: any = Reflect.getPrototypeOf(target)
  track(target, OperationTypes.GET, key)
  // 使用原型的get方法
  // 可不是所有集合都有get方法？？？？？？？
  const res = proto.get.call(target, key)
  return wrap(res)

  /**
   * Reflect.getPrototypeOf 知识拓展
   * 跟Object.getPrototypeOf() 类似
   */
}

/** 通过 Reflect.getPrototypeOf 原型的 has 方法 */
// effect.track has 操作
function has(this: any, key: any): boolean {
  const target = toRaw(this)
  key = toRaw(key)
  const proto: any = Reflect.getPrototypeOf(target)
  track(target, OperationTypes.HAS, key)
  return proto.has.call(target, key)
}

/** 通过 Reflect.getPrototypeOf 原型的 size 属性 */
// effect.track size 操作
function size(target: any) {
  target = toRaw(target)
  const proto = Reflect.getPrototypeOf(target)
  track(target, OperationTypes.ITERATE)
  return Reflect.get(proto, 'size', target)
}

/** 通过 Reflect.getPrototypeOf 原型的 add 方法 */
// effect.track add 操作
function add(this: any, value: any) {
  value = toRaw(value)
  const target = toRaw(this)
  const proto: any = Reflect.getPrototypeOf(this)
  const hadKey = proto.has.call(target, value)
  const result = proto.add.call(target, value)

  // 如果原来没有这个key，就trigger add一下
  if (!hadKey) {
    /* istanbul ignore else */
    if (__DEV__) {
      trigger(target, OperationTypes.ADD, value, { value })
    } else {
      trigger(target, OperationTypes.ADD, value)
    }
  }
  return result
}

/** set */
function set(this: any, key: any, value: any) {
  // original 的值
  value = toRaw(value)
  const target = toRaw(this)
  const proto: any = Reflect.getPrototypeOf(this)
  const hadKey = proto.has.call(target, key)
  const oldValue = proto.get.call(target, key)

  // 通过set赋值
  const result = proto.set.call(target, key, value)

  // 如果新旧vlaue 不一样才出发trigger
  // 原来有key，就trigger set
  // 原来没key，就trigger add
  if (value !== oldValue) {
    /* istanbul ignore else */
    if (__DEV__) {
      const extraInfo = { oldValue, newValue: value }
      if (!hadKey) {
        trigger(target, OperationTypes.ADD, key, extraInfo)
      } else {
        trigger(target, OperationTypes.SET, key, extraInfo)
      }
    } else {
      if (!hadKey) {
        trigger(target, OperationTypes.ADD, key)
      } else {
        trigger(target, OperationTypes.SET, key)
      }
    }
  }
  return result
}

/** 删除一个实体 */
function deleteEntry(this: any, key: any) {
  const target = toRaw(this) // original
  const proto: any = Reflect.getPrototypeOf(this)
  const hadKey = proto.has.call(target, key)
  // 如果原型有get 就返回get值，没有就是undefined
  const oldValue = proto.get ? proto.get.call(target, key) : undefined
  // forward the operation before queueing reactions
  // 在reaction队列前 操作
  const result = proto.delete.call(target, key)
  if (hadKey) {
    /* istanbul ignore else */
    if (__DEV__) {
      trigger(target, OperationTypes.DELETE, key, { oldValue })
    } else {
      trigger(target, OperationTypes.DELETE, key)
    }
  }
  return result
}

/** clear */
function clear(this: any) {
  const target = toRaw(this)
  const proto: any = Reflect.getPrototypeOf(this)
  const hadItems = target.size !== 0
  // 为什么缓存原始的target，在rollup时，能shaking掉？
  const oldTarget = target instanceof Map ? new Map(target) : new Set(target)
  // forward the operation before queueing reactions
  // 在反应队列前 发生操作
  const result = proto.clear.call(target)

  // 如果有child才触发trigger clear
  if (hadItems) {
    /* istanbul ignore else */
    if (__DEV__) {
      trigger(target, OperationTypes.CLEAR, void 0, { oldTarget })
    } else {
      trigger(target, OperationTypes.CLEAR)
    }
  }
  return result
}

/** forEach 迭代器 */
// effect.trigger iterate
function createForEach(isReadonly: boolean) {
  return function forEach(this: any, callback: Function, thisArg?: any) {
    const observed = this
    // original
    const target = toRaw(observed)
    const proto: any = Reflect.getPrototypeOf(target)

    // 包裹
    const wrap = isReadonly ? toReadonly : toReactive
    track(target, OperationTypes.ITERATE)
    // important: create sure the callback is
    // 1. invoked with the reactive map as `this` and 3rd arg
    // 2. the value received should be a corresponding reactive/readonly.
    function wrappedCallback(value: any, key: any) {
      return callback.call(observed, wrap(value), wrap(key), observed)
    }
    return proto.forEach.call(target, wrappedCallback, thisArg)
  }
}

/** 创建迭代方法 */
function createIterableMethod(method: string | symbol, isReadonly: boolean) {
  return function(this: any, ...args: any[]) {
    const target = toRaw(this)
    const proto: any = Reflect.getPrototypeOf(target)
    // 键值对？？？？
    const isPair =
      method === 'entries' ||
      (method === Symbol.iterator && target instanceof Map)
    // 内置迭代
    const innerIterator = proto[method].apply(target, args)
    const wrap = isReadonly ? toReadonly : toReactive
    track(target, OperationTypes.ITERATE)
    // return a wrapped iterator which returns observed versions of the
    // values emitted from the real iterator
    return {
      // iterator protocol
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this
      }
    }
  }
}

/** 创建只读方法 */
function createReadonlyMethod(
  method: Function,
  type: OperationTypes
): Function {
  return function(this: any, ...args: any[]) {
    if (LOCKED) {
      if (__DEV__) {
        const key = args[0] ? `on key "${args[0]}" ` : ``
        console.warn(
          `${capitalize(type)} operation ${key}failed: target is readonly.`,
          toRaw(this)
        )
      }
      return type === OperationTypes.DELETE ? false : this
    } else {
      return method.apply(this, args)
    }
  }
}

/** 可变的工具 */
const mutableInstrumentations: any = {
  get(key: any) {
    return get(this, key, toReactive)
  },
  get size() {
    return size(this)
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false)
}

/** 只读的工具 */
const readonlyInstrumentations: any = {
  get(key: any) {
    return get(this, key, toReadonly)
  },
  get size() {
    return size(this)
  },
  has,
  add: createReadonlyMethod(add, OperationTypes.ADD),
  set: createReadonlyMethod(set, OperationTypes.SET),
  delete: createReadonlyMethod(deleteEntry, OperationTypes.DELETE),
  clear: createReadonlyMethod(clear, OperationTypes.CLEAR),
  forEach: createForEach(true)
}

// 迭代方法
const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator]
iteratorMethods.forEach(method => {
  mutableInstrumentations[method] = createIterableMethod(method, false)
  readonlyInstrumentations[method] = createIterableMethod(method, true)
})

/** 创建工具的Getter */
function createInstrumentationGetter(instrumentations: any) {
  return function getInstrumented(
    target: any,
    key: string | symbol,
    receiver: any
  ) {
    target =
      hasOwn(instrumentations, key) && key in target ? instrumentations : target
    return Reflect.get(target, key, receiver)
  }
}

export const mutableCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(mutableInstrumentations)
}

export const readonlyCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(readonlyInstrumentations)
}
