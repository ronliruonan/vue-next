import { isObject, toTypeString } from '@vue/shared'
import { mutableHandlers, readonlyHandlers } from './baseHandlers'

import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers
} from './collectionHandlers'

import { UnwrapNestedRefs } from './ref'
import { ReactiveEffect } from './effect'

/** 使用key值标记的数据容器 */
{
  /** 映射 */
  // @points Map vs Object
  // 1. Map 和 Set 承载的数据元素，可按照insert顺序被iteration
  // 2. Object的键均为String类型，而Map的键可以任意类型
  // 3. Map.size非常easy，而Object得手动计算
  // 4. Object有原型，映射中会有一些缺省的键，可以用Object.create(null) 来回避
  // @notes 可以决定你选择Map还是Object
  // 1. 如果键在运行时才知道，/或 所有的件类型相同，所有的值类型相同，那就用Map
  // 2. 如果需要将原始值作为key，那就用Map
  // 3. 如果需要对个别元素进行操作，就用Object

  // @points WeakMpa vs Map
  // 1. Map的key是任意类型，WeakMap的key必须是对象类型
  // 2. WeakMap的key是弱保持，也就是说当key所指的对象在没有被引用的时候，会被GC回收掉。
  // 因为WeakMap的key是弱保持，所有key是不可枚举的。

  /** 集合 */
  // @point Set Array.from 或者展开操作符 来完成Set->Array的转换

  // @point Array vs Set
  // 1. Array.prototype.indexOf 效率低下，且，indexOf 无法找到NaN
  // 2. Set允许根据value来删除元素，而Array必须基于下标的splice方法
  // 3. Set 自动去重

  // @point WeakSet 中的对象不重复，且，不可枚举
  // @point WeakSet vs Set
  // 1. WeakSets中的值必须是对象类型，不能是别的
  // 2. WeakSet 中的weak指的是，在集合中的对象，如果不存在其他引用，那么就会垃圾回收，所以不可枚举

  // Map的值 与 Set的值得等值判断是根据same-value-zero algorighm
  // ===
  // -0 == +0
  // NaN 与自身相等

  const ronan_a = '100'
  if (__DEV__) console.log(ronan_a)
}

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class which maintains a Set of subscribers,
// but we simply store them as raw Sets to reduce memory overhead.
// 主WeakMap用来存储target->key->dep的关联
// 从概念上讲，它很容易认为是一个Dep类的依赖，一个用来维护订阅者的Set
// 但，我们简单地用Set存储original的，来减少内存开销
export type Dep = Set<ReactiveEffect>
export type KeyToDepMap = Map<string | symbol, Dep>
export const targetMap = new WeakMap<any, KeyToDepMap>()

// WeakMaps that store {raw <-> observed} pairs.
// 用WeakMap 来记录 raw 和 observed 这对关系
const rawToReactive = new WeakMap<any, any>()
const reactiveToRaw = new WeakMap<any, any>()
const rawToReadonly = new WeakMap<any, any>()
const readonlyToRaw = new WeakMap<any, any>()

// WeakSets for values that are marked readonly or non-reactive during observable creation.
// WeakSet 来记录创建过程中的被标记为readonly 或 无效reactive的值
/** 记录仅readonly的values */
const readonlyValues = new WeakSet<any>()
/** 记录无效reactive的值们 */
const nonReactiveValues = new WeakSet<any>()

/** 集合的类型们 */
const collectionTypes = new Set<Function>([Set, Map, WeakMap, WeakSet])
/** 可被observable的类型[object xxx] */
const observableValueRE = /^\[object (?:Object|Array|Map|Set|WeakMap|WeakSet)\]$/

/**
 * ？是否可被Observe
 * 1. Vue，VNode -> false
 * 2. observableValueRE -> true
 * 3. nonReactiveValues
 */
const canObserve = (value: any): boolean => {
  return (
    !value._isVue &&
    !value._isVNode &&
    observableValueRE.test(toTypeString(value)) &&
    !nonReactiveValues.has(value)
  )
}

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  // step1,
  // 如果发现对readonly进行reactive，就返回readonly
  if (readonlyToRaw.has(target)) {
    return target
  }
  // target is explicitly marked as readonly by user
  // step2,
  // 手动标记为readonly，就先readonly 再返回
  if (readonlyValues.has(target)) {
    return readonly(target)
  }

  // step3,
  // 核心函数，raw-reactive
  return createReactiveObject(
    target,
    rawToReactive,
    reactiveToRaw,
    mutableHandlers,
    mutableCollectionHandlers
  )
}

export function readonly<T extends object>(
  target: T
): Readonly<UnwrapNestedRefs<T>>
export function readonly(target: object) {
  // value is a mutable observable, retrieve its original and return
  // a readonly version.
  // step1,
  // 如果已经已经是reactive了，那就重置target为original 的 target
  if (reactiveToRaw.has(target)) {
    target = reactiveToRaw.get(target)
  }
  // step2,
  // 核心函数，raw - readonly
  return createReactiveObject(
    target,
    rawToReadonly,
    readonlyToRaw,
    readonlyHandlers,
    readonlyCollectionHandlers
  )
}

// 核心函数
function createReactiveObject(
  target: any,
  toProxy: WeakMap<any, any>,
  toRaw: WeakMap<any, any>,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>
) {
  // step1,
  // 如果target不是Ojbect，那就直接返回target
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  // step2,
  // target already has corresponding Proxy，
  // 在raw-proxy已经存在，且 不是undefined，那就返回observed = raw-proxy.get()
  let observed = toProxy.get(target)
  if (observed !== void 0) {
    return observed
  }
  // step3,
  // target is already a Proxy, 在proxy-raw中已经存在，那就返回target
  if (toRaw.has(target)) {
    return target
  }

  // step4,
  // 白名单的type，可以被observe，
  // 如果不是，那就直接原路返回
  // only a whitelist of value types can be observed.
  if (!canObserve(target)) {
    return target
  }

  // step5,
  // 牛逼用target.constructor
  const handlers = collectionTypes.has(target.constructor)
    ? collectionHandlers
    : baseHandlers
  observed = new Proxy(target, handlers)

  // 为什么要存2遍呢？？？？？？？？？？？？？
  // 为什么要存2遍呢？？？？？？？？？？？
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  if (!targetMap.has(target)) {
    targetMap.set(target, new Map())
  }
  return observed
}

export function isReactive(value: any): boolean {
  return reactiveToRaw.has(value) || readonlyToRaw.has(value)
}

export function isReadonly(value: any): boolean {
  return readonlyToRaw.has(value)
}

export function toRaw<T>(observed: T): T {
  return reactiveToRaw.get(observed) || readonlyToRaw.get(observed) || observed
}

export function markReadonly<T>(value: T): T {
  readonlyValues.add(value)
  return value
}

export function markNonReactive<T>(value: T): T {
  nonReactiveValues.add(value)
  return value
}
