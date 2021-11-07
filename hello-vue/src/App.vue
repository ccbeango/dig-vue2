<template>
  <div id="app">
    <!-- <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/> -->

    <!-- 组件更新 不同节点 -->
    <!-- <HelloWorld :flag="flag"/>
    <button @click="toggle">toggle</button> -->

    <!-- 组件更新 相同节点 -->
    <HelloWorld/>
  </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld-检测变化注意事项.vue'
// import HelloWorld from './components/HelloWorld-依赖收集_派发更新_nextTick.vue'
// import HelloWorld from './components/HelloWorld-检测变化注意事项.vue'
// import HelloWorld from './components/HelloWorld-计算属性_侦听属性.vue'
// import HelloWorld from './components/HelloWorld-组件更新_不同节点.vue'
import HelloWorld from './components/HelloWorld-组件更新_相同节点.vue'

export default {
  name: 'App',
  components: {
    HelloWorld
  },
  data () {
    return {
      flag: true
    }
  },
  methods: {
    toggle () {
      this.flag = !this.flag
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
