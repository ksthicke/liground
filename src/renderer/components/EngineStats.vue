<template>
  <div class="base-demo">
    <VueTableDynamic :params="params" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import VueTableDynamic from 'vue-table-dynamic'

export default {
  name: 'EngineStats',
  props: {
    engineID: Number
  },
  components: {
    VueTableDynamic
  },
  data () {
    return {
      parentEngineStats: {
        depth: 0,
        seldepth: 0,
        nodes: 0,
        nps: 0,
        hashfull: 0,
        tbhits: 0,
        enginetime: 0
      }
    }
  },

  computed: {
    ...mapGetters(['seldepth', 'nps', 'nodes', 'enginetime', 'hashfull', 'tbhits']),
    depth () {
      return this.$store.getters.depth
    },
    seldepth () {
      return this.$store.getters.seldepth
    },
    nps () {
      return this.$store.getters.nps
    },
    nodes () {
      return this.$store.getters.nodes
    },
    enginetime () {
      return this.$store.getters.enginetime
    },
    hashfull () {
      return this.$store.getters.hashfull
    },
    tbhits () {
      return this.$store.getters.tbhits
    },

    params () {
      if (this.engineID === 1) {
        return {
          data: [
            ['Depth / Sel. Depth', 'Nodes/s', 'Nodes', 'Time', 'Hash', 'TB Hits'],
            [this.depth + ' / ' + this.seldepth, this.parse(this.nps) + 'nps', this.parse(this.nodes), this.parseTime(this.enginetime), this.hashfull, this.parse(this.tbhits)]
          ],
          columnWidth: [{ column: 0, width: 150 }],
          header: 'row',
          border: true,
          stripe: true
        }
      } else {
        const { depth, seldepth, nps, nodes, enginetime, hashfull, tbhits } = this.parentEngineStats
        return {
          data: [
            ['Depth / Sel. Depth', 'Nodes/s', 'Nodes', 'Time', 'Hash', 'TB Hits'],
            [depth + ' / ' + seldepth, this.parse(nps) + 'nps', this.parse(nodes), this.parseTime(enginetime), hashfull, this.parse(tbhits)]
          ],
          columnWidth: [{ column: 0, width: 150 }],
          header: 'row',
          border: true,
          stripe: true
        }
      }
    }
  },
  methods: {
    fillStats (payload) {
      console.warn('fillStats', payload)
      this.parentEngineStats = payload
    },
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
