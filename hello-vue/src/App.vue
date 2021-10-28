<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/>
  </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld-检测变化注意事项.vue'
// import HelloWorld from './components/HelloWorld-依赖收集_派发更新_nextTick.vue'
// import HelloWorld from './components/HelloWorld-检测变化注意事项.vue'
import HelloWorld from './components/HelloWorld-计算属性_侦听属性.vue'

export default {
  name: 'App',
  components: {
    HelloWorld
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
