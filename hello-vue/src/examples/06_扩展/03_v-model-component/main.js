import Vue from 'vue'


const Child = {
  template: '<div>'
  + '<input :value="value" @input="updateValue" placeholder="edit me">'
  + '</div>',
  props: ['value'],
  methods: {
    updateValue (e) {
      this.$emit('input', e.target.value)
    }
  }
}

new Vue({
  el: '#app',
  template: '<div>'
  + '<child v-model="message"></child>'
  + '<p>Message is: {{ message }}</p>' +
  '</div>',
  data() {
    return {
      message: ''
    }
  },
  components: {
    Child
  }
})
