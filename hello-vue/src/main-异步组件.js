import Vue from 'vue'

/**
 * 异步组件
 */

// 普通函数异步组件 require
Vue.component('HelloWorld', function(resolve) {
  require(['./components/HelloWorld'], function (res) {
    resolve(res);
  });
});

// Promise异步组件
Vue.component('HelloWorld', () => import('./components/HelloWorld'));

// 高级异步组件
const LoadingComponent = {
  tempalte: '<div>Loading</div>'
}

const ErrorComponent = {
  tempalte: '<div>Error</div>'
}

const AsyncComponent = () => ({
  // 需要加载的组件 应该是一个 Promise
  component: import('./components/HelloWorld'),
  // 异步组件加载时使用的组件
  loading: LoadingComponent,
  // 加载失败时使用的组件
  error: ErrorComponent,
  // 展示加载时组件的延时时间。默认值是 200 (毫秒)
  delay: 200,
  // 如果提供了超时时间且组件加载也超时了，
  // 则使用加载失败时使用的组件。默认值是：`Infinity`
  timeout: 10
})
Vue.component('HelloWorld', AsyncComponent);


new Vue({
  el: '#app',
  render: h => h(App),
}).$mount('#app')
