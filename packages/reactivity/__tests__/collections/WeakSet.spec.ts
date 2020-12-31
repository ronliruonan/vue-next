import { reactive, isReactive, effect, toRaw } from '../../src'

// reactivity/collections/WeakSet
describe('reactivity/collections', () => {
  describe('WeakSet', () => {
    // reactivedWeakSet instanceof WeakSet
    it('instanceof', () => {
      const original = new WeakSet()
      const observed = reactive(original)
      expect(isReactive(observed)).toBe(true)
      expect(original instanceof WeakSet).toBe(true)
      expect(observed instanceof WeakSet).toBe(true)
    })

    // 应observe 操作
    // WeakSet.add/delete()
    it('should observe mutations', () => {
      let dummy
      const value = {}
      const set = reactive(new WeakSet())
      effect(() => (dummy = set.has(value)))

      expect(dummy).toBe(false)
      set.add(value)
      expect(dummy).toBe(true)
      set.delete(value)
      expect(dummy).toBe(false)
    })

    // 不应observe 自定义属性
    it('should not observe custom property mutations', () => {
      let dummy
      const set: any = reactive(new WeakSet())
      effect(() => (dummy = set.customProp))

      expect(dummy).toBe(undefined)
      set.customProp = 'Hello World'
      expect(dummy).toBe(undefined)
    })

    // 不应observe 无效值的操作
    it('should not observe non value changing mutations', () => {
      let dummy
      const value = {}
      const set = reactive(new WeakSet())
      const setSpy = jest.fn(() => (dummy = set.has(value)))
      effect(setSpy)

      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(1)
      set.add(value)
      expect(dummy).toBe(true)
      expect(setSpy).toHaveBeenCalledTimes(2)
      set.add(value)
      expect(dummy).toBe(true)
      expect(setSpy).toHaveBeenCalledTimes(2)
      set.delete(value)
      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(3)
      set.delete(value)
      expect(dummy).toBe(false)
      expect(setSpy).toHaveBeenCalledTimes(3)
    })

    // 不应observe raw data
    it('should not observe raw data', () => {
      const value = {}
      let dummy
      const set = reactive(new WeakSet())
      effect(() => (dummy = toRaw(set).has(value)))

      expect(dummy).toBe(false)
      set.add(value)
      expect(dummy).toBe(false)
    })

    // 不应因raw 操作而触发effect
    it('should not be triggered by raw mutations', () => {
      const value = {}
      let dummy
      const set = reactive(new WeakSet())
      effect(() => (dummy = set.has(value)))

      expect(dummy).toBe(false)
      toRaw(set).add(value)
      expect(dummy).toBe(false)
    })

    // proxy不应污染original
    it('should not pollute original Set with Proxies', () => {
      const set = new WeakSet()
      const observed = reactive(set)
      const value = reactive({})
      observed.add(value)
      expect(observed.has(value)).toBe(true)
      expect(set.has(value)).toBe(false)
    })
  })
})
