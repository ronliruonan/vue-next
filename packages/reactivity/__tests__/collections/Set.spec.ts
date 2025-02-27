import { reactive, effect, isReactive, toRaw } from '../../src'

// reactivity/collections/Set
describe('reactivity/collections', () => {
  describe('Set', () => {
    // 测试instanceof
    // reactive instanceof Set === true
    it('instanceof', () => {
      const original = new Set()
      const observed = reactive(original)
      expect(isReactive(observed)).toBe(true)
      expect(original instanceof Set).toBe(true)
      expect(observed instanceof Set).toBe(true)
    })

    // 应该observe 操作
    // Set.add Set.delete
    it('should observe mutations', () => {
      let dummy
      const set = reactive(new Set())
      effect(() => (dummy = set.has('value')))

      expect(dummy).toBe(false)
      set.add('value')
      expect(dummy).toBe(true)
      set.delete('value')
      expect(dummy).toBe(false)
    })

    // 应该observe for of 迭代
    it('should observe for of iteration', () => {
      let dummy
      const set = reactive(new Set() as Set<number>)
      effect(() => {
        dummy = 0
        for (let num of set) {
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      set.add(2)
      set.add(1)
      expect(dummy).toBe(3)
      set.delete(2)
      expect(dummy).toBe(1)
      set.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe forEach迭代
    it('should observe forEach iteration', () => {
      let dummy: any
      const set = reactive(new Set())
      effect(() => {
        dummy = 0
        set.forEach(num => (dummy += num))
      })

      expect(dummy).toBe(0)
      set.add(2)
      set.add(1)
      expect(dummy).toBe(3)
      set.delete(2)
      expect(dummy).toBe(1)
      set.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe Set.values()迭代
    it('should observe values iteration', () => {
      let dummy
      const set = reactive(new Set() as Set<number>)
      effect(() => {
        dummy = 0
        for (let num of set.values()) {
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      set.add(2)
      set.add(1)
      expect(dummy).toBe(3)
      set.delete(2)
      expect(dummy).toBe(1)
      set.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe Set.keys() 迭代
    it('should observe keys iteration', () => {
      let dummy
      const set = reactive(new Set() as Set<number>)
      effect(() => {
        dummy = 0
        for (let num of set.keys()) {
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      set.add(2)
      set.add(1)
      expect(dummy).toBe(3)
      set.delete(2)
      expect(dummy).toBe(1)
      set.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe Set.entries 迭代
    it('should observe entries iteration', () => {
      let dummy
      const set = reactive(new Set<number>())
      effect(() => {
        dummy = 0
        // eslint-disable-next-line no-unused-vars
        for (let [key, num] of set.entries()) {
          key
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      set.add(2)
      set.add(1)
      expect(dummy).toBe(3)
      set.delete(2)
      expect(dummy).toBe(1)
      set.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe Set.clear()触发
    it('should be triggered by clearing', () => {
      let dummy
      const set = reactive(new Set())
      effect(() => (dummy = set.has('key')))

      expect(dummy).toBe(false)
      set.add('key')
      expect(dummy).toBe(true)
      set.clear()
      expect(dummy).toBe(false)
    })

    // 不应observe Set对象自定义的属性
    it('should not observe custom property mutations', () => {
      let dummy
      const set: any = reactive(new Set())
      effect(() => (dummy = set.customProp))

      expect(dummy).toBe(undefined)
      set.customProp = 'Hello World'
      expect(dummy).toBe(undefined)
    })

    // 应该observe Set.clear()
    it('should observe size mutations', () => {
      let dummy
      const set = reactive(new Set())
      effect(() => (dummy = set.size))

      expect(dummy).toBe(0)
      set.add('value')
      set.add('value2')
      expect(dummy).toBe(2)
      set.delete('value')
      expect(dummy).toBe(1)
      set.clear()
      expect(dummy).toBe(0)
    })

    // 不应observe 无效值的操作
    it('should not observe non value changing mutations', () => {
      let dummy
      const set = reactive(new Set())
      const setSpy = jest.fn(() => (dummy = set.has('value')))
      effect(setSpy)

      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(1)
      set.add('value')
      expect(dummy).toBe(true)
      expect(setSpy).toHaveBeenCalledTimes(2)
      set.add('value')
      expect(dummy).toBe(true)
      expect(setSpy).toHaveBeenCalledTimes(2)
      set.delete('value')
      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(3)
      set.delete('value')
      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(3)
      set.clear()
      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(3)
    })

    // 不应observe original data
    it('should not observe raw data', () => {
      let dummy
      const set = reactive(new Set())
      effect(() => (dummy = toRaw(set).has('value')))

      expect(dummy).toBe(false)
      set.add('value')
      expect(dummy).toBe(false)
    })

    // 不应observe original 迭代
    it('should not observe raw iterations', () => {
      let dummy = 0
      const set = reactive(new Set<number>())
      effect(() => {
        dummy = 0
        for (let [num] of toRaw(set).entries()) {
          dummy += num
        }
        for (let num of toRaw(set).keys()) {
          dummy += num
        }
        for (let num of toRaw(set).values()) {
          dummy += num
        }
        toRaw(set).forEach(num => {
          dummy += num
        })
        for (let num of toRaw(set)) {
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      set.add(2)
      set.add(3)
      expect(dummy).toBe(0)
      set.delete(2)
      expect(dummy).toBe(0)
    })

    // 不应observe original的操作
    it('should not be triggered by raw mutations', () => {
      let dummy
      const set = reactive(new Set())
      effect(() => (dummy = set.has('value')))

      expect(dummy).toBe(false)
      toRaw(set).add('value')
      expect(dummy).toBe(false)
      dummy = true
      toRaw(set).delete('value')
      expect(dummy).toBe(true)
      toRaw(set).clear()
      expect(dummy).toBe(true)
    })

    // 不应observe original的size操作
    // originalSet.size 不应该effect
    it('should not observe raw size mutations', () => {
      let dummy
      const set = reactive(new Set())
      effect(() => (dummy = toRaw(set).size))

      expect(dummy).toBe(0)
      set.add('value')
      expect(dummy).toBe(0)
    })

    // 不应effect originalSet.size 操作
    it('should not be triggered by raw size mutations', () => {
      let dummy
      const set = reactive(new Set())
      effect(() => (dummy = set.size))

      expect(dummy).toBe(0)
      toRaw(set).add('value')
      expect(dummy).toBe(0)
    })

    // 应支持？？？？？？
    it('should support objects as key', () => {
      let dummy
      const key = {}
      const set = reactive(new Set())
      const setSpy = jest.fn(() => (dummy = set.has(key)))
      effect(setSpy)

      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(1)

      set.add({})
      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(1)

      set.add(key)
      expect(dummy).toBe(true)
      expect(setSpy).toHaveBeenCalledTimes(2)
    })

    // 代理 不应污染 original Set
    it('should not pollute original Set with Proxies', () => {
      const set = new Set()
      const observed = reactive(set)
      const value = reactive({})
      observed.add(value)
      expect(observed.has(value)).toBe(true)
      expect(set.has(value)).toBe(false)
    })

    /// 应observe forEach的嵌套值
    it('should observe nested values in iterations (forEach)', () => {
      const set = reactive(new Set([{ foo: 1 }]))
      let dummy: any
      effect(() => {
        dummy = 0
        set.forEach(value => {
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        })
      })
      expect(dummy).toBe(1)
      set.forEach(value => {
        value.foo++
      })
      expect(dummy).toBe(2)
    })

    // 应observe 嵌套值 在Set.values()迭代
    it('should observe nested values in iterations (values)', () => {
      const set = reactive(new Set([{ foo: 1 }]))
      let dummy: any
      effect(() => {
        dummy = 0
        for (const value of set.values()) {
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        }
      })
      expect(dummy).toBe(1)
      set.forEach(value => {
        value.foo++
      })
      expect(dummy).toBe(2)
    })

    // 应observe nested values 在Set.entries()的iteration中
    it('should observe nested values in iterations (entries)', () => {
      const set = reactive(new Set([{ foo: 1 }]))
      let dummy: any
      effect(() => {
        dummy = 0
        for (const [key, value] of set.entries()) {
          expect(isReactive(key)).toBe(true)
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        }
      })
      expect(dummy).toBe(1)
      set.forEach(value => {
        value.foo++
      })
      expect(dummy).toBe(2)
    })

    // 应observe nested值 在for of的iteration中
    it('should observe nested values in iterations (for...of)', () => {
      const set = reactive(new Set([{ foo: 1 }]))
      let dummy: any
      effect(() => {
        dummy = 0
        for (const value of set) {
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        }
      })
      expect(dummy).toBe(1)
      set.forEach(value => {
        value.foo++
      })
      expect(dummy).toBe(2)
    })
  })
})
