import Vue from 'vue'


new Vue({
  el: '#app',
  template: '<div>'
  + '<input v-model="message" placeholder="edit me">' +
  '<p>Message is: {{ message }}</p>' +
  '</div>',
  data() {
    return {
      message: ''
    }
  }
})

// v-model和下面写法还有一点区别 v-model支持了compositionstart/end 事件
// new Vue({
//   el: '#app',
//   template: '<div>'
//   + '<input :value="message" @input="($event) => message = $event.target.value" placeholder="edit me">' +
//   '<p>Message is: {{ message }}</p>' +
//   '</div>',
//   data() {
//     return {
//       message: ''
//     }
//   }
// })