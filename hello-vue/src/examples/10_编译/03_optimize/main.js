import Vue from 'vue'

Vue.config.productionTip = false

new Vue({
  el: '#app',
  template: `<div>
    <ul :class="bindCls" class="list" v-if="isShow" hello="world" :hi.trim="greet">
      <li v-for="(item, index) of items" :key="item.id" @click.prevent="clickItem(index)">
        {{item}}:{{index}}
      </li>
    </ul>
    <div><p>111</p></div>
    <p>222</p>
  </div>`,
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
