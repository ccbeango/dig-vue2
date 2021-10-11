import Vue from 'vue'
// import App from './App.vue'

Vue.config.productionTip = false

// new Vue({
//   render: h => h(App),
// }).$mount('#app')

new Vue({
  el: '#app',
  // render (createElement) {
  //   return createElement('div', {
  //     attrs: {
  //       id: 'app'
  //     }
  //   }, this.message)
  // },
  template: '<h1>hello world</h1>',
  data () {
    return {
      message: 'Hello Vue',
      // message: { hello: 'world' }
    }
  }
});
