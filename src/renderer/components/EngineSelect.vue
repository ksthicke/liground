<template>
  <div class="container">
    <div
      class="logo"
    >
      <div
        class="image"
        :style="{ backgroundImage: engineLogo }"
      />
    </div>
    <Multiselect
      v-model="selected"
      class="multiselect"
      label="name"
      track-by="name"
      :options="availableEngines"
      :allow-empty="false"
      :show-labels="false"
      :placeholder="selected.name"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Multiselect from 'vue-multiselect'
import defaultLogo from '../assets/images/engines/chess_engine.svg'

export default {
  name: 'EngineSelect',
  props: {
    engineID: Number
  },
  components: { Multiselect },
  computed: {
    selected: {
      get () {
        return this.$store.getters.selectedEngine(this.engineID)
      },
      set (value) {
        this.$store.dispatch('changeEngine', { engineName: value.name, engineID: this.engineID })
        this.sendSelected()
      }
    },
    engineLogo () {
      return `url(${this.selectedEngine.logo || defaultLogo})`
    },
    ...mapGetters(['availableEngines']),
    selectedEngine () {
      console.log('computed updated')
      return this.$store.getters.selectedEngine(this.engineID)
    }
  },
  watch: {
    /*selected () {
      console.log('EngineSelect', this.engineID, JSON.stringify(this.selected,null,4))//, JSON.stringify(this.$store.state.analysisEngines, null, 4))
      if (this.engineID < 2) {
        this.$store.dispatch('changeEngine', { engineName: this.selected.name, engineID: this.engineID })
      }
      this.sendSelected()
    },
    selectedEngine () {
      console.log('selectedEngine changed', JSON.stringify(this.selected,null,4), JSON.stringify(this.selectedEngine,null,4))
      this.selected = this.selectedEngine
    }*/
  },
  created () {
    console.log('created', this.engineID, this.selectedEngine)
    this.selected = this.selectedEngine
  },
  methods: {
    sendSelected () {
      //this.$emit('sendSelected', this.selected.name)
      // new
      if (this.selected.name !== null) {
        this.$store.dispatch('changeAnalysisEngine', { name: this.selected.name, engineID: this.engineID })
      }
    }
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.logo {
  flex-basis: 120px;
  flex-shrink: 0;
  flex-grow: 0;
  margin-right: 5px;
}
.logo .image {
  box-sizing: content-box;
  width: 120px;
  height: 60px;
  background-color: var(--light-text-color);;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 5px;
}

.multiselect {
  flex-basis: auto;
  flex-shrink: 1;
  flex-grow: 1;
}
</style>
