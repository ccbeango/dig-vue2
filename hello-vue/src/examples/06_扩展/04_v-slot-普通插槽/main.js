import Vue from 'vue'


const AppLayout = {
  template: '<div class="container">' +
  '<header><slot name="header" hello="world" :title="title" v-bind="bindObj"></slot></header>' +
  '<main><slot>默认内容</slot></main>' +
  '<footer><slot name="footer"></slot></footer>' +
  '</div>',
  data() {
    return {
      title: 'AppLayout组件',
      bindObj: { name: 'tom' }
    }
  }
}

// 插槽新语法
new Vue({
  el: '#app',
  template: '<div>' +
  '<app-layout>' +
  '<template v-slot:header><h1>{{title}}</h1></template>' +
  '<p>{{msg}}</p>' +
  '<template v-slot:footer><p>{{desc}}</p></template>' +
  '</app-layout>' +
  '</div>',
  data() {
    return {
      title: '我是标题',
      msg: '我是内容',
      desc: '其它信息'
    }
  },
  components: {
    AppLayout
  }
})


// 插槽旧语法
// new Vue({
//   el: '#app',
//   template: '<div>' +
//   '<app-layout>' +
//   '<h1 slot="header">{{title}}</h1>' +
//   '<p>{{msg}}</p>' +
//   '<p slot="footer">{{desc}}</p>' +
//   '</app-layout>' +
//   '</div>',
//   data() {
//     return {
//       title: '我是标题',
//       msg: '我是内容',
//       desc: '其它信息'
//     }
//   },
//   components: {
//     AppLayout
//   }
// })
