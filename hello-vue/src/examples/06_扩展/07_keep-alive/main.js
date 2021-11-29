import Vue from 'vue'

const A = {
  template: '<div>' +
  '<p>A Comp</p>' + 
  '</div>',
  name: 'A',
  mounted () {
    console.log('Comp A mounted')
  },
  activated () {
    console.log('Comp A activated')
  },
  deactivated () {
    console.log('Comp A deactivated')
  }
}

const B = {
  template: '<div>' +
  '<p>B Comp</p>' + 
  '</div>',
  name: 'B',
  mounted () {
    console.log('Comp B mounted')
  },
  activated () {
    console.log('Comp B activated')
  },
  deactivated () {
    console.log('Comp B deactivated')
  }
}

new Vue({
  el: '#app',
  template: '<div>' +
  '<keep-alive>' +
  '<component :is="currentComp"></component>' +
  '</keep-alive>' +
  '<button @click="change">change</button>' +
  '</div>',
  data() {
    return {
      currentComp: 'A'
    }
  },
  methods: {
    change () {
      this.currentComp = this.currentComp === 'A' ? 'B' : 'A'
    }
  },
  components: {
    A,
    B
  }
})
