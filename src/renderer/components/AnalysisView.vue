<template>
  <div class="analysis">
    <AnalysisHead/>
    <AnalysisContainer
      v-for="(engine, index) in this.analysisEngines"
      ref="analysiscontainer"
      :key="index+1"
      :engineID="index+1"
      @flip-board="$emit('flip-board', 0)"
      @move-to-start="$emit('move-to-start', 0)"
      @move-back-one="$emit('move-back-one', 0)"
      @move-forward-one="$emit('move-forward-one', 0)"
      @move-to-end="$emit('move-to-end', 0)"
    />
    <div class="b">
      <button
        :class="(this.numberOfAnalysisEngines > 1) ? 'buttonRed' : 'buttonRedDisabled'"
        @click="removeEngine"
      >
        <b>Remove Engine</b>
      </button>
      <button
        class="buttonBlue"
        @click="addEngine"
      >
        <b>Add Engine</b>
      </button>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import AnalysisHead from './AnalysisHead'
import AnalysisContainer from './AnalysisContainer.vue'

export default {
  name: 'AnalysisView',
  components: {
    AnalysisHead,
    AnalysisContainer
  },
  computed: {
    ...mapState(['analysisEngines']),
    ...mapGetters(['numberOfAnalysisEngines'])
  },
  methods: {
    removeEngine () {
      if (this.numberOfAnalysisEngines > 1) {
        this.$store.dispatch('removeAnalysisEngine')
      }
    },
    addEngine () {
      this.$store.dispatch('addAnalysisEngine')
    }
  }
}
</script>

<style scoped>
.analysis-container {
  margin-top: 30px;
  margin-bottom: 30px;
}
.buttonBlue {
  background-color: #7289da; /* Green */
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px Avenir;
  border-radius: 7px;
}
.buttonBlue:hover {
  background-color: #8ea0e9;
  cursor: pointer;
}
.buttonRed {
  background-color: #c72634; /* Red */
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px Avenir;
  border-radius: 7px;
}
.buttonRed:hover {
  background-color: #8b1919;
  cursor: pointer;
}
.buttonRedDisabled {
  background-color: #c9888e; /* Grayed-out red */
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px Avenir;
  border-radius: 7px;
}
.buttonRedDisabled:hover {
  cursor: not-allowed;
}
.b {
  margin-top: 40px;
}
@keyframes bar-anim {
  0% {
      background-position: 0 0;
  }
  100% {
      background-position: 100000px 0;
  }
}

#move-history {
  text-align: left;
}

</style>
