import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

/**
 * 异步组件
 */

// 工厂函数 require
// Vue.component('HelloWorld', function(resolve) {
//   require(['./components/HelloWorld'], function (res) {
//     resolve(res);
//   });
// });

// 工厂函数 Promise
Vue.component('HelloWorld', () => import('./components/HelloWorld'));

new Vue({
  el: '#app',
  render: h => h(App),
}).$mount('#app')


// /**
//  * 全局注册组件
//  */
// Vue.component('app', App)

// new Vue({
//   el: '#app',
//   template: '<app><app/>'
//   // render: h => h(App),
// }).$mount('#app')

// new Vue({
//   el: '#app',
//   render (createElement) {
//     return createElement('div', {
//       attrs: {
//         id: 'app'
//       }
//     }, this.message)
//   },
//   template: '<h1>hello world</h1>',
//   data () {
//     return {
//       message: 'Hello Vue',
//     }
//   }
// });


/**
 * 生命周期
 */
// let childComp = {
//   template: '<div>{{msg}}</div>',
//   created() {
//     console.log('child created')
//   },
//   mounted() {
//     console.log('child mounted')
//   },
//   data() {
//     return {
//       msg: 'Hello Vue'
//     }
//   }
// }

// Vue.mixin({
//   created() {
//     console.log('parent created')
//   }
// })

// const app = new Vue({
//   el: '#app',
//   render: h => h(childComp)
// })
