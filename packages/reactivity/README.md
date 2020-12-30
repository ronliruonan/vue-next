# @vue/reactivity

## Usage Note

> This package is inlined into Global & Browser ESM builds of user-facing renderers (e.g. `@vue/runtime-dom`),    
>> 这个包内联到面向用户的渲染器 (譬如 `@vue/runtime-dom`)的Global & Browser ESM构建中，    

> but also published as a package that can be used standalone.    
>> 但也会发布为一个可以单独使用的包。    

> The standalone build should not be used alongside a pre-bundled build of a user-facing renderer,    
>> 这个独立版本不应该用于面向用户渲染器的预捆绑版本，    

> as they will have different internal storage for reactivity connections.    
>> 因为they用于reactivity连接的不同内部存储。    

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
内置对象中，对`Map`, `WeakMap`, `Set` and `WeakSet`不生效
