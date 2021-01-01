import { track, trigger } from './effect'
import { OperationTypes } from './operations'
import { isObject } from '@vue/shared'
import { reactive } from './reactive'

export const refSymbol = Symbol(__DEV__ ? 'refSymbol' : undefined)

/**
 * ref 是一个对象。
 * 就像ref.value这种用法，
 * value是一个为包裹的嵌套Ref
 */
export interface Ref<T> {
  [refSymbol]: true
  value: UnwrapNestedRefs<T>
}

export type UnwrapNestedRefs<T> = T extends Ref<any> ? T : UnwrapRef<T>

/** 转换：是obj就返回reactive，如果不是，就返回val */
const convert = (val: any): any => (isObject(val) ? reactive(val) : val)

/**
 * ref(original)
 * 内部处理的getter setter track了一下
 */
// to do
// effect.track()
export function ref<T>(raw: T): Ref<T> {
  raw = convert(raw)
  const v = {
    [refSymbol]: true,
    get value() {
      track(v, OperationTypes.GET, '')
      return raw
    },
    set value(newVal) {
      raw = convert(newVal)
      trigger(v, OperationTypes.SET, '')
    }
  }
  return v as Ref<T>
}

/** 通过refSymbol来存储boolean */
export function isRef(v: any): v is Ref<any> {
  return v ? v[refSymbol] === true : false
}

/** 转换为refs 也就是搞定get set 和 refSymbol */
export function toRefs<T extends object>(
  object: T
): { [K in keyof T]: Ref<T[K]> } {
  const ret: any = {}
  for (const key in object) {
    ret[key] = toProxyRef(object, key)
  }
  return ret
}

/** to proxy ref */
function toProxyRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]> {
  const v = {
    [refSymbol]: true,
    get value() {
      return object[key]
    },
    set value(newVal) {
      object[key] = newVal
    }
  }
  return v as Ref<T[K]>
}

/** 保证的类型 */
type BailTypes =
  | Function
  | Map<any, any>
  | Set<any>
  | WeakMap<any, any>
  | WeakSet<any>

// Recursively unwraps nested value bindings.
export type UnwrapRef<T> = {
  ref: T extends Ref<infer V> ? UnwrapRef<V> : T
  array: T extends Array<infer V> ? Array<UnwrapRef<V>> : T
  object: { [K in keyof T]: UnwrapRef<T[K]> }
  stop: T
}[T extends Ref<any>
  ? 'ref'
  : T extends Array<any>
    ? 'array'
    : T extends BailTypes
      ? 'stop' // bail out on types that shouldn't be unwrapped
      : T extends object ? 'object' : 'stop']
