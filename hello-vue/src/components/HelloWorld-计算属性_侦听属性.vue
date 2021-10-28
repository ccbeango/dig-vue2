<template>
  <div class="hello">
    <h2>{{fullName}}</h2>
    <h2>{{fullName}}</h2>
    <button @click="change">change</button>
    <button @click="changeLast">change last name</button>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  computed: {
    fullName () {
      if (this.useless > 0) {
        return this.firstName + ' ' + this.lastName
      }
      return 'please click change'
    }
  },
  watch: {
    /* eslint-disable */
    useless: [
      function (newVal, oldVal) { console.log('useless: ', newVal, oldVal) },
      'uselessWatch'
    ],
    lastName (newVal, oldVal) {
      console.log('watch lastName change', newVal, oldVal)
    },
    fullName: {
      immediate: true,
      handler(newVal, oldVal) {
        console.log('fullName', newVal, oldVal)
      }
    },
    nested: {
      deep: true,
      // sync: true,
      handler(newVal, oldVal) {
        console.log('nested', newVal, oldVal)
      }
    }
  },
  data () {
    return {
      useless: 0,
      firstName: 'Hello',
      lastName: 'World',
      nested: {
        a: {
          b: 1
        }
      }
    }
  },
  methods: {
    change () {
      this.useless++
      this.nested.a.b = 2
    },
    changeLast () {
      this.lastName = 'Vue'
    },
    uselessWatch () {
      console.log('333')
      return this.firstName + this.lastName
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
