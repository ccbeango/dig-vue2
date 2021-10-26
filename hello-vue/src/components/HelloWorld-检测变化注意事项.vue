<template>
  <div class="hello">
    <h1>{{ message }}</h1>
    <ul>
      <li v-for="item in items" :key="item">{{item}}</li>
    </ul>
    <button @click="ok">OK</button>
    <button @click="add">add</button>
    <button @click="change">change</button>
  </div>
</template>

<script>
// 使用set方法或增强的数组方法，修改对象或数组
export default {
  name: 'HelloWorld',
  data () {
    return {
      message: {
        a: 'Hello'
      },
      items: [ 1, 2 ]
    }
  },
  methods: {
    ok () {
      // 正确 该属性已经是响应式的
      this.message.a = 'Hi'
    },
    add () {
      // 错误：未触发渲染 该属性是新添加的，不是响应式的
      // this.items[1] = 3
      // 正确：触发渲染 将该属性设置成响应式的，并触发渲染
      this.$set(this.items, 1, 3)
    },
    change () {
      // 错误：未触发渲染
      // this.message.b = 'Vue'
      // this.items[2] = 4

      // 正确：触发渲染 将属性b设置成响应式的，并触发渲染
      this.$set(this.message, 'b', 'Vue')
      // 正确：触发渲染 将新增元素设置成响应式的，并触发渲染
      this.items.splice(2, 1, 4)

      // 这种可以直接触发setter
      this.items = [1,2,3,4]
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
