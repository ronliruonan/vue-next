import { OperationTypes } from './operations'
import { Dep, targetMap } from './reactive'
import { EMPTY_OBJ, extend } from '@vue/shared'

export interface ReactiveEffect {
  (): any
  isEffect: true
  active: boolean
  raw: Function
  deps: Array<Dep>
  computed?: boolean
  scheduler?: (run: Function) => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  onStop?: () => void
}

export interface ReactiveEffectOptions {
  lazy?: boolean
  computed?: boolean
  scheduler?: (run: Function) => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  onStop?: () => void
}

export interface DebuggerEvent {
  effect: ReactiveEffect
  target: any
  type: OperationTypes
  key: string | symbol | undefined
}

/** 活跃的ReactiveEffect堆栈 */
export const activeReactiveEffectStack: ReactiveEffect[] = []

export const ITERATE_KEY = Symbol('iterate')

/**
 * 精髓的effect函数
 * @param fn ()=>{}
 * @param options {lazy, computed, scheduler, onTrack, onTrigger, onStop}
 */
export function effect(
  fn: Function,
  options: ReactiveEffectOptions = EMPTY_OBJ
): ReactiveEffect {
  // step1,
  // 如果fn 已经是一个effect，那么fn重新复制为original值
  // 注意ReactiveEffect给的默认就是isEffect = true
  if ((fn as ReactiveEffect).isEffect) {
    fn = (fn as ReactiveEffect).raw
  }
  // 返回一个函数
  const effect = createReactiveEffect(fn, options)

  // 如果不lazy，那就先run一下
  if (!options.lazy) {
    effect()
  }
  return effect
}

/** 停止effect */
export function stop(effect: ReactiveEffect) {
  // 如果还是active状态，那就进入正题
  if (effect.active) {
    // 清除操作
    cleanup(effect)
    // 如果effect有onstop的handler那就run一下
    if (effect.onStop) {
      effect.onStop()
    }
    // 最终置为false
    effect.active = false
  }
}

// 核心中的核心配置
function createReactiveEffect(
  fn: Function,
  options: ReactiveEffectOptions
): ReactiveEffect {
  const effect = function effect(...args): any {
    return run(effect as ReactiveEffect, fn, args)
  } as ReactiveEffect

  effect.isEffect = true
  effect.active = true
  effect.raw = fn
  effect.scheduler = options.scheduler
  effect.onTrack = options.onTrack
  effect.onTrigger = options.onTrigger
  effect.onStop = options.onStop
  effect.computed = options.computed
  effect.deps = []
  return effect
}

// 核心中的核心
// @usage effect(() => (dumy = obj.foo))
function run(effect: ReactiveEffect, fn: Function, args: any[]): any {
  // step1,
  // 如果不活跃了，那就执行单纯的fn，并直接return
  if (!effect.active) {
    return fn(...args)
  }

  // step2,
  // rg堆栈中没有当前effect，那就clean一下，push进堆栈，然后在执行
  // 最终pop出来
  if (activeReactiveEffectStack.indexOf(effect) === -1) {
    cleanup(effect)
    try {
      activeReactiveEffectStack.push(effect)
      return fn(...args)
    } finally {
      activeReactiveEffectStack.pop()
    }
  }
}

/** clean dep中的effect */
// @point 通过array.length = 0 来置空deps
function cleanup(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

let shouldTrack = true

export function pauseTracking() {
  shouldTrack = false
}

export function resumeTracking() {
  shouldTrack = true
}

/** 顾名思义的追踪 */
export function track(
  target: any,
  type: OperationTypes,
  key?: string | symbol
) {
  if (!shouldTrack) {
    return
  }

  // 后进先出
  const effect = activeReactiveEffectStack[activeReactiveEffectStack.length - 1]
  if (effect) {
    // 如果是迭代
    if (type === OperationTypes.ITERATE) {
      key = ITERATE_KEY
    }

    // deps
    let depsMap = targetMap.get(target) // ??? WeakMap 在没有时候，会返回void 0？？？
    // 如果没有，那就记录
    if (depsMap === void 0) {
      targetMap.set(target, (depsMap = new Map()))
    }

    // 根据key获取dep？
    let dep = depsMap.get(key!)
    // 如果dep 没有，那就记录
    if (dep === void 0) {
      depsMap.set(key!, (dep = new Set()))
    }

    // 如果dep没有effect，那就添加dep，且effect.deps就push一下
    if (!dep.has(effect)) {
      dep.add(effect)
      effect.deps.push(dep)
      if (__DEV__ && effect.onTrack) {
        effect.onTrack({
          effect,
          target,
          type,
          key
        })
      }
    }
  }
}

/** 顾名思义的触发 */
export function trigger(
  target: any,
  type: OperationTypes,
  key?: string | symbol,
  extraInfo?: any
) {
  // 如果dep没有，就拉倒了
  const depsMap = targetMap.get(target)
  if (depsMap === void 0) {
    // never been tracked
    return
  }
  // step2,
  const effects = new Set<ReactiveEffect>()
  const computedRunners = new Set<ReactiveEffect>()

  // 如果是clear操作，就触发所有的effect
  if (type === OperationTypes.CLEAR) {
    // collection being cleared, trigger all effects for target
    depsMap.forEach(dep => {
      addRunners(effects, computedRunners, dep)
    })
  }
  // 不然，就就是set add  delete程序
  else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      addRunners(effects, computedRunners, depsMap.get(key))
    }
    // also run for iteration key on ADD | DELETE
    // 同时，add delete操作，得运行迭代的key操作
    if (type === OperationTypes.ADD || type === OperationTypes.DELETE) {
      const iterationKey = Array.isArray(target) ? 'length' : ITERATE_KEY
      addRunners(effects, computedRunners, depsMap.get(iterationKey))
    }
  }
  const run = (effect: ReactiveEffect) => {
    scheduleRun(effect, target, type, key, extraInfo)
  }
  // Important: computed effects must be run first so that computed getters
  // can be invalidated before any normal effects that depend on them are run.
  computedRunners.forEach(run)
  effects.forEach(run)
}

function addRunners(
  effects: Set<ReactiveEffect>,
  computedRunners: Set<ReactiveEffect>,
  effectsToAdd: Set<ReactiveEffect> | undefined
) {
  // 如果computed ，那就运行computedRunner
  // 不然就effects.add
  if (effectsToAdd !== void 0) {
    effectsToAdd.forEach(effect => {
      if (effect.computed) {
        computedRunners.add(effect)
      } else {
        effects.add(effect)
      }
    })
  }
}

function scheduleRun(
  effect: ReactiveEffect,
  target: any,
  type: OperationTypes,
  key: string | symbol | undefined,
  extraInfo: any
) {
  if (__DEV__ && effect.onTrigger) {
    effect.onTrigger(
      extend(
        {
          effect,
          target,
          key,
          type
        },
        extraInfo
      )
    )
  }
  if (effect.scheduler !== void 0) {
    effect.scheduler(effect)
  } else {
    effect()
  }
}
