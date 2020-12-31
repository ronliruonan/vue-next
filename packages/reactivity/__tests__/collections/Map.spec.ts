import { reactive, effect, toRaw, isReactive } from '../../src'

// reactivity/collections/map
describe('reactivity/collections', () => {
  describe('Map', () => {
    // 测试instanceof
    // reactive instanceof Map === true
    test('instanceof', () => {
      const original = new Map()
      const observed = reactive(original)
      expect(isReactive(observed)).toBe(true)
      expect(original instanceof Map).toBe(true)
      expect(observed instanceof Map).toBe(true)
    })

    // 应该observe 操作
    // Map.set Map.delete
    it('should observe mutations', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => {
        dummy = map.get('key')
      })

      expect(dummy).toBe(undefined)
      map.set('key', 'value')
      expect(dummy).toBe('value')
      map.set('key', 'value2')
      expect(dummy).toBe('value2')
      map.delete('key')
      expect(dummy).toBe(undefined)
    })

    // 应该observe size操作
    // Map.clear
    it('should observe size mutations', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => (dummy = map.size))

      expect(dummy).toBe(0)
      map.set('key1', 'value')
      map.set('key2', 'value2')
      expect(dummy).toBe(2)
      map.delete('key1')
      expect(dummy).toBe(1)
      map.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe for of的迭代
    it('should observe for of iteration', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => {
        dummy = 0
        // eslint-disable-next-line no-unused-vars
        for (let [key, num] of map) {
          key
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      map.set('key1', 3)
      expect(dummy).toBe(3)
      map.set('key2', 2)
      expect(dummy).toBe(5)
      map.delete('key1')
      expect(dummy).toBe(2)
      map.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe forEach迭代
    it('should observe forEach iteration', () => {
      let dummy: any
      const map = reactive(new Map())
      effect(() => {
        dummy = 0
        map.forEach((num: any) => (dummy += num))
      })

      expect(dummy).toBe(0)
      map.set('key1', 3)
      expect(dummy).toBe(3)
      map.set('key2', 2)
      expect(dummy).toBe(5)
      map.delete('key1')
      expect(dummy).toBe(2)
      map.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe map.keys迭代
    it('should observe keys iteration', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => {
        dummy = 0
        for (let key of map.keys()) {
          dummy += key
        }
      })

      expect(dummy).toBe(0)
      map.set(3, 3)
      expect(dummy).toBe(3)
      map.set(2, 2)
      expect(dummy).toBe(5)
      map.delete(3)
      expect(dummy).toBe(2)
      map.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe map.values迭代
    it('should observe values iteration', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => {
        dummy = 0
        for (let num of map.values()) {
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      map.set('key1', 3)
      expect(dummy).toBe(3)
      map.set('key2', 2)
      expect(dummy).toBe(5)
      map.delete('key1')
      expect(dummy).toBe(2)
      map.clear()
      expect(dummy).toBe(0)
    })

    // 应该observe map.entires迭代
    it('should observe entries iteration', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => {
        dummy = 0
        // eslint-disable-next-line no-unused-vars
        for (let [key, num] of map.entries()) {
          key
          dummy += num
        }
      })

      expect(dummy).toBe(0)
      map.set('key1', 3)
      expect(dummy).toBe(3)
      map.set('key2', 2)
      expect(dummy).toBe(5)
      map.delete('key1')
      expect(dummy).toBe(2)
      map.clear()
      expect(dummy).toBe(0)
    })

    // 应该触发在Map.clear时
    it('should be triggered by clearing', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => (dummy = map.get('key')))

      expect(dummy).toBe(undefined)
      map.set('key', 3)
      expect(dummy).toBe(3)
      map.clear()
      expect(dummy).toBe(undefined)
    })

    // 不应该observe 给Map的自定义属性操作
    it('should not observe custom property mutations', () => {
      let dummy
      const map: any = reactive(new Map())
      effect(() => (dummy = map.customProp))

      expect(dummy).toBe(undefined)
      map.customProp = 'Hello World'
      expect(dummy).toBe(undefined)
    })

    // 不应该observe 无效值的变化
    it('should not observe non value changing mutations', () => {
      let dummy
      const map = reactive(new Map())
      const mapSpy = jest.fn(() => (dummy = map.get('key')))
      effect(mapSpy)

      expect(dummy).toBe(undefined)
      expect(mapSpy).toHaveBeenCalledTimes(1)
      map.set('key', 'value')
      expect(dummy).toBe('value')
      expect(mapSpy).toHaveBeenCalledTimes(2)
      map.set('key', 'value')
      expect(dummy).toBe('value')
      expect(mapSpy).toHaveBeenCalledTimes(2)
      map.delete('key')
      expect(dummy).toBe(undefined)
      expect(mapSpy).toHaveBeenCalledTimes(3)
      map.delete('key')
      expect(dummy).toBe(undefined)
      expect(mapSpy).toHaveBeenCalledTimes(3)
      map.clear()
      expect(dummy).toBe(undefined)
      expect(mapSpy).toHaveBeenCalledTimes(3)
    })

    // 不应该observe toRaw的original
    it('should not observe raw data', () => {
      let dummy
      const map = reactive(new Map())
      effect(() => (dummy = toRaw(map).get('key')))

      expect(dummy).toBe(undefined)
      map.set('key', 'Hello')
      expect(dummy).toBe(undefined)
      map.delete('key')
      expect(dummy).toBe(undefined)
    })

    // 不应该污染 original map
    it('should not pollute original Map with Proxies', () => {
      const map = new Map()
      const observed = reactive(map)
      const value = reactive({})
      observed.set('key', value)
      expect(map.get('key')).not.toBe(value)
      expect(map.get('key')).toBe(toRaw(value))
    })

    // observed Map的item 应该也是reactived
    it('should return observable versions of contained values', () => {
      const observed = reactive(new Map())
      const value = {}
      observed.set('key', value)
      const wrapped = observed.get('key')
      expect(isReactive(wrapped)).toBe(true)
      expect(toRaw(wrapped)).toBe(value)
    })

    // 应该observe 嵌套数据
    it('should observed nested data', () => {
      const observed = reactive(new Map())
      observed.set('key', { a: 1 })
      let dummy
      effect(() => {
        dummy = observed.get('key').a
      })
      observed.get('key').a = 2
      expect(dummy).toBe(2)
    })

    // map.forEach迭代时，应该observe 嵌套值
    it('should observe nested values in iterations (forEach)', () => {
      const map = reactive(new Map([[1, { foo: 1 }]]))
      let dummy: any
      effect(() => {
        dummy = 0
        map.forEach(value => {
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        })
      })
      expect(dummy).toBe(1)
      map.get(1)!.foo++
      expect(dummy).toBe(2)
    })

    // map.values 迭代，应该observed 嵌套值
    it('should observe nested values in iterations (values)', () => {
      const map = reactive(new Map([[1, { foo: 1 }]]))
      let dummy: any
      effect(() => {
        dummy = 0
        for (const value of map.values()) {
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        }
      })
      expect(dummy).toBe(1)
      map.get(1)!.foo++
      expect(dummy).toBe(2)
    })

    // map.entries 迭代，应该observed 嵌套值
    it('should observe nested values in iterations (entries)', () => {
      const key = {}
      const map = reactive(new Map([[key, { foo: 1 }]]))
      let dummy: any
      effect(() => {
        dummy = 0
        for (const [key, value] of map.entries()) {
          key
          expect(isReactive(key)).toBe(true)
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        }
      })
      expect(dummy).toBe(1)
      map.get(key)!.foo++
      expect(dummy).toBe(2)
    })

    // for of 迭代，应该observed 嵌套值
    it('should observe nested values in iterations (for...of)', () => {
      const key = {}
      const map = reactive(new Map([[key, { foo: 1 }]]))
      let dummy: any
      effect(() => {
        dummy = 0
        for (const [key, value] of map) {
          key
          expect(isReactive(key)).toBe(true)
          expect(isReactive(value)).toBe(true)
          dummy += value.foo
        }
      })
      expect(dummy).toBe(1)
      map.get(key)!.foo++
      expect(dummy).toBe(2)
    })
  })
})
