import { reactive, readonly, toRaw } from './reactive'
import { OperationTypes } from './operations'
import { track, trigger } from './effect'
import { LOCKED } from './lock'
import { isObject, hasOwn } from '@vue/shared'
import { isRef } from './ref'

/** 得到Symbol的内置symbole属性 */
// 为了避免篇幅过长，采用立即执行包裹，使得editor可折叠效果
const builtInSymbols = (() =>
  new Set(
    Object.getOwnPropertyNames(Symbol)
      .map(key => (Symbol as any)[key]) // 相当于点语法
      .filter(value => typeof value === 'symbol')

    /**
     * 知识拓展：Object.getOwnPropertyNames()
     * 返回对象自身属性对应的字符串数组，包含不可枚举属性，
     * 但不包含以Symbol作为key的属性
     *
     * @example 可枚举属性
     * ['a', 'b'] => ['0', '1', 'length']
     * { 0: 0, 1: 0 } => ['0', '1']
     *
     * @example 不可枚举属性
     * var obj = Object.create({}, {
     *   getFoo: {
     *     value() => this.foo,
     *     enumerable: false
     *   }
     * });
     * obj.foo = 1;
     * => [ 'foo', 'getFoo' ]
     *
     * @note 获取可枚举属性
     * Object.keys 或者
     * for...in（还会获得原型链的可枚举属性，用hasOwnProperty() 过滤一下）
     *
     * @nb 这个函数能够得到Symbol自身的Symbol属性
     */
  ))()

/**
 * Reflect.Getter访问器 (会track get)
 * @point1 如果key是Symbol内置属性，则返回原值，不做任何处理
 * @point2 如果key的value已经是ref，那就返回ref.value, 不做任何处理
 * @point3 对target的key进行追踪：
 * key的value是Object，返回readonly(res)或者reactive(res)，依赖isReadonly。
 * key的value不是Object，直接返回result。
 */
// to do
// reactive.readonly(), reactive.reactive(), reactive.track() 具体做了什么？
function createGetter(isReadonly: boolean) {
  return function get(target: any, key: string | symbol, receiver: any) {
    const res = Reflect.get(target, key, receiver) // Reflect.get知识拓展
    // step1,
    // key是symbol, 且是Symbol内置属性，直接返回res
    // 为什么呢？难道不对Symbol进行track
    if (typeof key === 'symbol' && builtInSymbols.has(key)) {
      return res
    }
    // step2,
    // 具备ref，说明已经track过了，那就直接返回res.value
    if (isRef(res)) {
      return res.value
    }

    // step3,
    // 跟踪target的get操作
    track(target, OperationTypes.GET, key)

    // res是Object，如果计划标记为readonly，那就返回readonly(res)，否则返回reactive
    // res不是Object，那就返回res（因为js万物皆是obj，除了值类型、null、undefined）
    return isObject(res)
      ? isReadonly
        ? // need to lazy access readonly and reactive here to avoid
          // circular dependency
          readonly(res)
        : reactive(res)
      : res
  }
  /**
   * Reflect知识拓展
   * Reflect.get(target, propertyKey[, receiver])
   * 与target[propertyKey]读取属性类似，但它是用过一个函数来执行操作的。
   *
   * 如果target中制定了getter，receiver则为getter调用时的this
   */
}

/**
 * Reflect.Setter设置器 (会trigger add/set)
 */
// to do
// effect.trigger(), reactive.toRaw()
function set(
  target: any,
  key: string | symbol,
  value: any,
  receiver: any
): boolean {
  // step1,
  // 将要写入的value，转换为original value
  value = toRaw(value)
  // step2,
  // target 是否具有这个key，为什么要判断这个？
  // 因为好像代理不能污染original，所以target不存在的key，就不往original去写入
  const hadKey = hasOwn(target, key)
  // step3,
  // oldValue，嗯？
  // 好像如果写入的value如果跟oldValue一样的话，就不响应effect
  const oldValue = target[key]
  // step4,
  // oldValue具有ref特性，且，要写入的value不具备ref特性
  // 那么，就得用res.value = value 方式来赋值
  if (isRef(oldValue) && !isRef(value)) {
    oldValue.value = value
    return true
  }
  const result = Reflect.set(target, key, value, receiver)
  // don't trigger if target is something up in the prototype chain of original
  // 如果target跟receiver<->this 是一样一样的
  if (target === toRaw(receiver)) {
    /* istanbul ignore else */
    if (__DEV__) {
      const extraInfo = { oldValue, newValue: value }
      // 如果original没有这个key，那就采用add操作方式
      if (!hadKey) {
        trigger(target, OperationTypes.ADD, key, extraInfo)
      }
      // 如果oritinal有这个key 且 新旧value不一样
      // 那就采用set操作方式
      else if (value !== oldValue) {
        trigger(target, OperationTypes.SET, key, extraInfo)
      }
    } else {
      // 正式环境
      // original不具备这个key，那就采用add操作方式
      if (!hadKey) {
        trigger(target, OperationTypes.ADD, key)
      }
      // original具备这个key，且，新旧value不同，那就采用set操作方式
      else if (value !== oldValue) {
        trigger(target, OperationTypes.SET, key)
      }
    }
  }
  return result

  /**
   * Reflect.set 知识拓展
   * 静态方法，效果类似给Object设置属性
   * return 一个boolean
   */
}

/** Reflect.deleteProperty （会trigger delete) */
function deleteProperty(target: any, key: string | symbol): boolean {
  // target 是否具有key
  const hadKey = hasOwn(target, key)
  // target old value
  const oldValue = target[key]
  const result = Reflect.deleteProperty(target, key)
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

/** Reflect.has (会track has) */
function has(target: any, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  track(target, OperationTypes.HAS, key)
  return result
}

/** Reflect.ownKeys （会track iterate） */
function ownKeys(target: any): (string | number | symbol)[] {
  track(target, OperationTypes.ITERATE)
  return Reflect.ownKeys(target)
}

/** 导出 可变的handler */
export const mutableHandlers: ProxyHandler<any> = {
  get: createGetter(false),
  set,
  deleteProperty,
  has,
  ownKeys
}

/** 导出 只读的handler */
export const readonlyHandlers: ProxyHandler<any> = {
  get: createGetter(true),

  set(target: any, key: string | symbol, value: any, receiver: any): boolean {
    if (LOCKED) {
      if (__DEV__) {
        console.warn(
          `Set operation on key "${String(key)}" failed: target is readonly.`,
          target
        )
      }
      return true
    } else {
      return set(target, key, value, receiver)
    }
  },

  deleteProperty(target: any, key: string | symbol): boolean {
    if (LOCKED) {
      if (__DEV__) {
        console.warn(
          `Delete operation on key "${String(
            key
          )}" failed: target is readonly.`,
          target
        )
      }
      return true
    } else {
      return deleteProperty(target, key)
    }
  },

  has,
  ownKeys
}
