
import Vue from 'vue'
import App from './App.vue'

/**
 * 全局注册组件
 */
Vue.component('app', App)

new Vue({
  el: '#app',
  template: '<app><app/>'
  // render: h => h(App),
}).$mount('#app')

