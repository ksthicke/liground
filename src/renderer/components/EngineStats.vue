<template>
  <div class="base-demo">
    <VueTableDynamic :params="params" />
  </div>
</template>

<script>
import VueTableDynamic from 'vue-table-dynamic'

export default {
  name: 'EngineStats',
  props: {
    engineID: Number
  },
  components: {
    VueTableDynamic
  },
  computed: {
    depth () {
      return this.$store.getters.depth(this.engineID)
    },
    seldepth () {
      return this.$store.getters.seldepth(this.engineID)
    },
    nps () {
      return this.$store.getters.nps(this.engineID)
    },
    nodes () {
      return this.$store.getters.nodes(this.engineID)
    },
    enginetime () {
      return this.$store.getters.enginetime(this.engineID)
    },
    hashfull () {
      return this.$store.getters.hashfull(this.engineID)
    },
    tbhits () {
      return this.$store.getters.tbhits(this.engineID)
    },
    params () {
      return {
        data: [
          ['Depth / Sel. Depth', 'Nodes/s', 'Nodes', 'Time', 'Hash', 'TB Hits'],
          [this.depth + ' / ' + this.seldepth, this.parse(this.nps) + 'nps', this.parse(this.nodes), this.parseTime(this.enginetime), this.parseHash(this.hashfull), this.parse(this.tbhits)]
        ],
        columnWidth: [{ column: 0, width: 150 }],
        header: 'row',
        border: true,
        stripe: true
      }
    }
  },
  methods: {
    parse (value) {
      if (value > 1000000) {
        value /= 1000000
        return String(value.toFixed(1)) + ' M'
      }

      if (value > 1000) {
        value /= 1000
        return String(value.toFixed(1)) + ' k'
      }
      return String(value)
    },
    parseTime (value) {
      const date = new Date(Number(value))
      return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
    },
    parseHash (value) {
      return `${value/10}%`
    }
  }
}
</script>

<style>
thead {
  font-style: normal;
  font-weight: bold;
  background-color: #ddd;
}

tbody {
  font-style: normal;
  font-weight: bold;
  font-weight: normal
}
</style>
