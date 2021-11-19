<template>
  <div id="app">
    <div class="hello">
      <ul>
        <li v-for="item in items" :key="item.id">
          {{item.val}}
        </li>
      </ul>
      <button @click="change">change</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data () {
    return {
      items: [
        {id: 0, val: 'A'},
        {id: 1, val: 'B'},
        {id: 2, val: 'C'},
        {id: 3, val: 'D'}
      ]
    }
  },
  methods: {
    change () {
      this.items.reverse().push({id: 4, val: 'E'})
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
