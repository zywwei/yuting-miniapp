Component({
  properties: {
    data: {
      type: Object,
      value: {},
      observer: 'drawHeatmap'
    },
    month: {
      type: String,
      value: '',
      observer: 'drawHeatmap'
    },
    typeFilter: {
      type: String,
      value: 'expense',
      observer: 'drawHeatmap'
    }
  },

  data: {
    days: [],
    maxAmount: 0
  },

  lifetimes: {
    attached: function() {
      this.drawHeatmap()
    }
  },

  methods: {
    drawHeatmap: function() {
      if (!this.data.month) return
      var data = this.data.data || {}
      var typeFilter = this.data.typeFilter || 'expense'
      var year = parseInt(this.data.month.substring(0, 4))
      var month = parseInt(this.data.month.substring(5, 7))
      var daysInMonth = new Date(year, month, 0).getDate()
      var firstDay = new Date(year, month - 1, 1).getDay()
      var days = []
      var maxAmount = 0
      for (var i = 0; i < firstDay; i++) {
        days.push({ day: '', amount: 0, level: 0 })
      }
      for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = this.data.month + '-' + String(d).padStart(2, '0')
        var amount = 0
        if (data[dateStr]) {
          if (typeFilter === 'all') {
            amount = (data[dateStr].expense || 0) + (data[dateStr].income || 0)
          } else if (typeFilter === 'income') {
            amount = data[dateStr].income || 0
          } else {
            amount = data[dateStr].expense || 0
          }
        }
        if (amount > maxAmount) maxAmount = amount
        days.push({ day: d, amount: amount, level: 0 })
      }
      for (var i = 0; i < days.length; i++) {
        if (days[i].amount > 0 && maxAmount > 0) {
          var ratio = days[i].amount / maxAmount
          if (ratio <= 0.25) days[i].level = 1
          else if (ratio <= 0.5) days[i].level = 2
          else if (ratio <= 0.75) days[i].level = 3
          else days[i].level = 4
        }
      }
      this.setData({ days: days, maxAmount: maxAmount })
    },

    onDayTap: function(e) {
      var day = e.currentTarget.dataset.day
      if (day) {
        this.triggerEvent('daytap', { day: day })
      }
    }
  }
})
