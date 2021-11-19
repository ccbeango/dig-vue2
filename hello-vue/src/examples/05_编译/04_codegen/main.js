import Vue from 'vue'

Vue.config.productionTip = false

new Vue({
  el: '#app',
  template: `<ul :class="bindCls" class="list" v-if="isShow" hello="world" :hi="greet"><li v-for="(item, index) of items" :key="item.id" @click.prevent="clickItem(index)">{{item}}:{{index}}</li></ul>`,
  data () {
    return {
      bindCls: 'a',
      isShow: true,
      items: [ 'A', 'B', 'C', 'D' ],
      greet: '你好'
    }
  },
  methods: {
    clickItem (index) {
      console.log(index)
    }
  }
})
