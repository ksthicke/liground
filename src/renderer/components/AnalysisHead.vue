<template>
  <div class="ceval grid-parent">
    LiGround
    <Multiselect
      :class="(QuickTourIndex == 7) ? 'multiselect-qt' : 'multiselect'"
      :value="displayVariant"
      :options="options"
      :allow-empty="false"
      :show-labels="false"
      @input="updateVariant"
    />
    <div class="resetButton">
      <input
        type="button"
        value="Reset"
        class="reset"
        @click="resetBoard"
      >
    </div>
    <Mode960
      :class="(QuickTourIndex == 8) ? 'Mode960-qt' : ''"
    />
    <div
      :class="(QuickTourIndex == 9) ? 'PvESwitch-qt' : 'PvESwitch'"
    >
      PvE
      <PvESwitch />
    </div>
  </div>
</template>

<script>
import Multiselect from 'vue-multiselect'
import Mode960 from './Mode960'
import PvESwitch from './PvESwitch.vue'
import { mapGetters, mapState } from 'vuex'

export default {
  name: 'AnalysisHead',
  components: {
    Multiselect, Mode960, PvESwitch
  },
  data () {
    return {
      selected: '♟️ Standard'
    }
  },
  computed: {
    options () { // returns all keys in variantOptions, those are then listed in the dropdown menu
      const varop = Object.keys(this.$store.getters.variantOptions.getAll())
      return varop
    },
    ...mapState(['variant']),
    ...mapGetters(['QuickTourIndex', 'variantOptions']),
    displayVariant () { // retuns the "nice" name of the current variant
      return this.variantOptions.revGet(this.variant)
    }
  },
  methods: {
    updateVariant (payload) {
      this.$emit('updateVariant')
      this.$store.dispatch('variant', this.variantOptions.get(payload))
    },
    resetBoard () {
      if (confirm('Do you really want to reset the board?')) {
        document.dispatchEvent(new Event('resetPlot'))
        this.$store.dispatch('resetBoard', { is960: false }) // used to exit 960 Mode
        this.$emit('resetMultiEngine')
      }
    }
  }
}
</script>

<style scoped>
.reset {
  background-color:var(--button-color);
  color: white;
  outline: none;
  border-radius: 5px;
  box-shadow: 1px 1px 1px 1px black;
  padding-bottom: 5px;
  padding-top: 5px;
}
.resetButton {
  display: grid;
  padding-left: 4px;
}
.reset:hover {
  background-color: var(--hover-color);
  cursor:pointer;
}
.ceval {
  /* display: table */
  font-size: 15pt;
  height: 40px;
}
.Mode960-qt{
  border: 5px solid var(--quicktour-highlight);
}
.multiselect-qt{
  border: 5px solid var(--quicktour-highlight);
}
.PvESwitch-qt{
  margin-left: 8px;
  display: flex;
  border: 5px solid var(--quicktour-highlight);
}
.PvESwitch{
  margin-top: 8px;
  display: flex;
}
.grid-parent {
  display: grid;
  grid-template-columns: auto auto auto auto auto auto;
  align: center;
  text-align: bottom;
  align-items: center;
  /* vertical-align: middle; */
}
.logo {
  font-size: 15pt;
  font-family: sans-serif;
}

</style>
