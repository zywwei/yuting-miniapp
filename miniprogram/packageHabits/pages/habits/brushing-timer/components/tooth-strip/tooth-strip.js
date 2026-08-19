Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    zones: { type: Array, value: [] },
    currentIndex: { type: Number, value: 0 },
    isRunning: { type: Boolean, value: false },
    areaRemaining: { type: Number, value: 20 }
  }
})
