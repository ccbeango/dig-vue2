<template>
  <div class="hello">
    <h2 v-if="flag" ref="hello">{{hello}}</h2>
    <h2 v-else>{{hello1}}</h2>
    <button @click="change">change</button>
    <button @click="toggle">toggle</button>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  watch: {
    // hello () {
    //   this.hello = Math.random()
    // },
    hello () {
      console.log('hello change')
    }
  },
  data () {
    return {
      // 依赖收集 派发更新
      flag: true,
      hello: 'Hello World',
      hello1: 'Hello Vue'
    }
  },
  methods: {
    change () {
      this.$nextTick(() => {
        console.log('nextTick', this.$refs.hello.innerText)
      })
      this.hello = Math.random()
      console.log('sync ', this.$refs.hello.innerText)
      this.$nextTick().then(() => {
        console.log('nextTick with Promise', this.$refs.hello.innerText)
      })
    },
    toggle () {
      this.flag = !this.flag 
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
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
