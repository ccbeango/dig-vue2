import Vue from 'vue'

Vue.config.productionTip = false

let childComp = {
  template: '<div>{{msg}}</div>',
  created() {
    console.log('child created')
  },
  mounted() {
    console.log('child mounted')
  },
  data() {
    return {
      msg: 'Hello Vue'
    }
  }
}

Vue.mixin({
  created() {
    console.log('parent created')
  }
})

const app = new Vue({
  el: '#app',
  render: h => h(childComp)
})