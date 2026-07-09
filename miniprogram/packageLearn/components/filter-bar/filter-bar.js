Component({
  properties: {
    filters: {
      type: Array,
      value: []
    },
    activeFilter: {
      type: String,
      value: 'all'
    }
  },

  data: {
    showDropdown: false,
    activeFilterIndex: -1
  },

  methods: {
    toggleFilter: function(e) {
      var filter = e.currentTarget.dataset.filter
      this.setData({ activeFilter: filter })
      this.triggerEvent('change', { filter: filter })
    },

    toggleDropdown: function() {
      this.setData({ showDropdown: !this.data.showDropdown })
    },

    selectFilter: function(e) {
      var filter = e.currentTarget.dataset.filter
      this.setData({
        activeFilter: filter,
        showDropdown: false
      })
      this.triggerEvent('change', { filter: filter })
    }
  }
})
