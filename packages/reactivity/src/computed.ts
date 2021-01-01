import { effect, ReactiveEffect, activeReactiveEffectStack } from './effect'
import { Ref, refSymbol, UnwrapNestedRefs } from './ref'
import { isFunction } from '@vue/shared'

/**
 * ComputedRef 是readonly特性
 * @value UnwrapNestedRefs：未包裹的嵌套Ref
 * @effect ReactiveEffect
 */
export interface ComputedRef<T> extends Ref<T> {
  readonly value: UnwrapNestedRefs<T>
  readonly effect: ReactiveEffect
}

/**
 * WritableComputedRef,
 * 这就是啥意思？？？？
 * readonly effect
 */
export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect
}

export interface WritableComputedOptions<T> {
  get: () => T
  set: (v: T) => void
}

// 函数多态
/**
 * @usage computed(() => value.foo)
 */
export function computed<T>(getter: () => T): ComputedRef<T>
/**
 * @usage computed({ get, set })
 */
export function computed<T>(
  options: WritableComputedOptions<T>
): WritableComputedRef<T>
/**
 * 上面2种的最终实现
 */
export function computed<T>(
  getterOrOptions: (() => T) | WritableComputedOptions<T>
): any {
  // 如果是个function，那就只有getter() =>
  // 如果不是，那就是{ getter, setter }
  const isReadonly = isFunction(getterOrOptions)
  const getter = isReadonly
    ? (getterOrOptions as (() => T))
    : (getterOrOptions as WritableComputedOptions<T>).get
  const setter = isReadonly
    ? () => {
        // TODO warn attempting to mutate readonly computed value
      }
    : (getterOrOptions as WritableComputedOptions<T>).set

  // 以上getter setter已经备好了

  // 默认是脏的，已被污染
  let dirty = true
  let value: T

  // computed 会触发effect的，这里就是精髓了
  // @usage: effect(() => dumy = cm.value [, options])
  // option.lazy 设置为true， computed设置为true
  const runner = effect(getter, {
    lazy: true,
    // mark effect as computed so that it gets priority during trigger
    computed: true,
    scheduler: () => {
      dirty = true
    }
  })

  // 返回值
  // 1. 使用了ref中的refSymbol作为唯一key
  // 2. 可以使用.语法了：computed.value, computed.value = 250
  // 3. .effect 可对应stop函数
  return {
    [refSymbol]: true,
    // expose effect so computed can be stopped
    effect: runner,
    get value() {
      // 如果已经被react了，就调用runner
      if (dirty) {
        value = runner()
        dirty = false
      }
      // When computed effects are accessed in a parent effect, the parent
      // should track all the dependencies the computed property has tracked.
      // This should also apply for chained computed properties.
      trackChildRun(runner)
      return value
    },
    set value(newValue: T) {
      setter(newValue)
    }
  }
}

function trackChildRun(childRunner: ReactiveEffect) {
  // activeReactiveEffectStack 应该在effect.ts中有解读
  const parentRunner =
    activeReactiveEffectStack[activeReactiveEffectStack.length - 1]
  if (parentRunner) {
    for (let i = 0; i < childRunner.deps.length; i++) {
      const dep = childRunner.deps[i]
      if (!dep.has(parentRunner)) {
        dep.add(parentRunner)
        parentRunner.deps.push(dep)
      }
    }
  }
}
