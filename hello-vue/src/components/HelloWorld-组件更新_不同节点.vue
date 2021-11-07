<template>
  <div v-if="flag" class="hello">
    <h2>{{nested.msg}}</h2>
    <h2>Essential Links</h2>
    <ul>
      <li>
        <a href="http://localhost:8080/" target="_blank">Vue Router</a>
      </li>
      <li>
        <a href="http://localhost:8080/" target="_blank">Vuex</a>
      </li>
      <li>
        <a href="http://localhost:8080/" target="_blank">Vue Loader</a>
      </li>
    </ul>
  </div>
  <ul v-else>
    <li>
      <a href="http://localhost:8080/" target="_blank">Core Docs</a>
    </li>
    <li>
      <a href="http://localhost:8080/" target="_blank">Forum</a>
    </li>
    <li>
      <a href="http://localhost:8080/" target="_blank">Twitter</a>
    </li>
    <li>
      <a href="http://localhost:8080/" target="_blank">Docs for This Template</a>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: [ 'flag' ],
  data () {
    return {
      nested: {
        msg: 'Welcome to Your Vue.js App'
      }
    }
  },
  methods: {
    change () {
      this.useless++
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
