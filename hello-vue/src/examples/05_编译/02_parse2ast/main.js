import Vue from 'vue'

Vue.config.productionTip = false

new Vue({
  el: '#app',
  template: `<ul :class="bindCls" class="list" v-if="isShow" hello="world" :hi.trim="greet">
  <li v-for="(item, index) of items" :key="item.id" @click.prevent="clickItem(index)">
  {{item}}:{{index}}
  </li><p>111<div>222</div>333</p><br><p>444<p>555</p>666</p><script>alert(1)</script></ul>`,
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
