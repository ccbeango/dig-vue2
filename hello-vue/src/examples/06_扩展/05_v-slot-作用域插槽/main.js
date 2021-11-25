import Vue from 'vue'


const Child = {
  template: '<div class="child">' +
  '<slot text="Hello " :msg="msg"></slot>' +
  '</div>',
  data() {
    return {
      msg: 'Vue'
    }
  }
}

const CurrentUser = {
  template: '<span>' +
  '<slot v-bind:user="user">{{ user.lastName }}</slot>' +
  '</span>',
  data () {
    return {
      user: {
        firstName: 'Tom',
        lastName: 'Lee'
      }
    }
  }
}

// 新语法
new Vue({
  el: '#app',
  template: '<div>' +
  '<child>' +
  '<template v-slot:default="props">' +
    '<p>Hello from parent</p>' +
    '<p>{{ props.text + props.msg}}</p>' +
  '</template>' +
  '</child>' +
  '<CurrentUser v-slot:default="slotProps">{{ slotProps.user.firstName }}</CurrentUser>' +
  '</div>',
  components: {
    Child,
    CurrentUser
  }
})


// // 旧语法
// new Vue({
//   el: '#app',
//   template: '<div>' +
//   '<child>' +
//   '<template slot-scope="props">' +
//     '<p>Hello from parent</p>' +
//     '<p>{{ props.text + props.msg}}</p>' +
//   '</template>' +
//   '</child>' +
//   '</div>',
//   components: {
//     Child
//   }
// })
