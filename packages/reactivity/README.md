# @vue/reactivity

## Usage Note

> This package is inlined into Global & Browser ESM builds of user-facing renderers (e.g. `@vue/runtime-dom`),but also published as a package that can be used standalone.    
>> 这个包内联到面向用户的渲染器 (譬如 `@vue/runtime-dom`)的Global & Browser ESM构建中，但也会发布为一个可以单独使用的包。


> The standalone build should not be used alongside a pre-bundled build of a user-facing renderer, as they will have different internal storage for reactivity connections.    
>> 这个独立版本不应该用于面向用户渲染器的预捆绑版本，因为they用于reactivity连接的不同内部存储。    


> A user-facing renderer should re-export all APIs from this package.      
>> 面向用户渲染器的话，应该重新导出这个包的所有api。

> For full exposed APIs, see `src/index.ts`. You can also run `yarn build reactivity --types` from repo root, which will generate an API report at `temp/reactivity.api.md`.
>> 导出所有的api，可以看这里`src/index.ts`。或者运行`yarn build reactivity --types`在根目录，可以生成api报表，在这个路径下`temp/reactivity.api.md`

## Credits / 信用，学分，鸣谢

> The implementation of this module is inspired by the following prior art in the JavaScript ecosystem:    
>> 这个模块的实现 受到js生态下的一下现有技术启发:    

- [Meteor Tracker](https://docs.meteor.com/api/tracker.html)
- [nx-js/reactivity-util](https://github.com/nx-js/reactivity-util)
- [salesforce/observable-membrane](https://github.com/salesforce/observable-membrane)

## Caveats / 注意事项

- Built-in objects are not observed except for `Map`, `WeakMap`, `Set` and `WeakSet`.   
内置对象不能observe，除了`Map`, `WeakMap`, `Set` and `WeakSet`。

- *与最新版比较：最新版支持了`Array`*


> *MDN中标准* 的内置对象分类
>> 值属性：    
 `Inifinity`, `NaN`, `undefined`, `globalThis`       
 : 返回一个简单值，没有自己的属性、方法         

>> 函数属性:      
 `eval()`, `uneval()`, `isFinite()`, `isNaN()`, `parseFloat()`, `parseInt()`, `decodeURI()`, `decodeURIComponent()`, `encodeURI()`, `encodeURIComponent()`      
 : 全局函数，可直接调用，不用指定所属对象      

>> 基本对象：     
 `Object`, `Function`, `Boolean`, `Symbol`        
 : 顾名思义，基本对象是定义或者用其他对象的基础）     

>> 错误对象：    
 `Error`, `AggregateError`, `EvalError`, `InternalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, `URIError`    
 ：一种特殊的基本对象

>> 数字和日期对象    
 `Number`, `BigInt`, `Math`, `Date`    
 ：用来表示数字、日期和执行数学计算的对象。    

>> 字符串        
 `String`, `RegExp`    
 : 用来表示和操作字符串的对象    

>> 可索引的集合对象
 `Array`, `Int8Array`, `Uint8Array`, `Uint8ClampedArray`, `Int16Array`, `Uint16Array`, `Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array`, `BigInt64Array`, `BigUint64Array`    
 : 这些对象表示按照索引值来排序的数据集合，包括数组和类型数组，以及类数组结构的对象     

>> 使用键的集合对象    
 `Map`, `Set`, `WeakMap`, `WeakSet`     
 : 这些集合对象在存储数据时会使用到键，包括可迭代的Map 和 Set，支持按照插入顺序来迭代元素。    

>> 结构化数据    
 `ArrayBuffer`, `SharedArrayBuffer`, `Atomics`, `DataView`, `JSON`    
 : 这些对象用来表示和操作结构化的缓冲区数据，或使用 JSON （JavaScript Object Notation）编码的数据。    

>> 控制抽象对象    
 `Promise`, `Generator`, `GeneratorFunction`, `AsyncFunction`    
 : 控件抽象可以帮助构造代码，尤其是异步代码（例如，不使用深度嵌套的回调）。    

 >> 反射    
 `Reflect`, `Proxy`    

>> 国际化    
 `Intl`, `Intl.Collator`, `Intl.DateTimeFormat`, `Intl.ListFormat`, `Intl.NumberFormat`, `Intl.PluralRules`, `Intl.RelativeTimeFormat`, `Intl.Locale`    
 : ECMAScript核心的附加功能，用于支持多语言处理。    

>> WebAssembly
 `WebAssembly`, `WebAssembly.Module`, `WebAssembly.Instance`, `WebAssembly.Memory`, `WebAssembly.Table`, `WebAssembly.CompileError`, `WebAssembly.LinkError`, `WebAssembly.RuntimeError`    
 