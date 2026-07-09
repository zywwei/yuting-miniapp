Component({
  properties: {
    formula: {
      type: Object,
      value: {}
    }
  },

  data: {
    showDetail: false
  },

  methods: {
    toggleDetail: function() {
      this.setData({ showDetail: !this.data.showDetail })
    },

    markAsLearned: function() {
      this.triggerEvent('learned', { id: this.data.formula.id })
    }
  }
})
