<template>
  <div>
    <div
      :class="(QuickTourIndex == 10) ? 'containerEvalBar-qt' : 'containerEvalBar'"
    >
      <div
        class="eval"
        :class="{ smaller: cpForWhiteStr.includes('/') }"
      >
        {{ cpForWhiteStr }}
      </div>
      <EngineSelect
        ref="engineselect"
        class="select"
        :engineID="this.engineID"
      />
      <div>
        <RoundedSwitch
          ref="roundedswitch"
          class="switch"
          :engineID="this.engineID"
        />
      </div>
    </div>
    <div class="analysis">
      <EngineStats
        :class="(QuickTourIndex == 11) ? 'EngineStats-qt' : ''"
        ref="enginestats"
        :engineID="this.engineID"
      />
      <div
        class="processing-bar"
        :class="{ animate: isEngineActive }"
      />
      <PVLines
        ref="pvlines"
        :class="(QuickTourIndex == 12) ? 'panel-qt' : 'panel'"
        :engineID="this.engineID"
      />
      <div
        :class="(QuickTourIndex == 13) ? 'game-window-qt' : 'game-window panel noselect'"
      >
        <div id="move-history">
          <MoveHistoryNode
            v-if="movesExist"
            :move="mainFirstMove"
            :engineID="this.engineID"
          />
        </div>
      </div>
      <JumpButtons
        :class="(QuickTourIndex == 14) ? 'JumpButtons-qt' : ''"
        :engineID="this.engineID"
        @flip-board="$emit('flip-board', 0)"
        @move-to-start="$emit('move-to-start', 0)"
        @move-back-one="$emit('move-back-one', 0)"
        @move-forward-one="$emit('move-forward-one', 0)"
        @move-to-end="$emit('move-to-end', 0)"
      />
      <EngineConsole
        ref="console"
        :class="(QuickTourIndex == 16) ? 'EngineConsole-qt' : ''"
        :engineID="this.engineID"
      />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import JumpButtons from './JumpButtons'
import EngineStats from './EngineStats'
import PVLines from './PVLines'
import EngineConsole from './EngineConsole'
import MoveHistoryNode from './MoveHistoryNode'
import RoundedSwitch from './RoundedSwitch'
import EngineSelect from './EngineSelect'

export default {
  name: 'AnalysisContainer',
  props: {
    engineID: Number
  },
  components: {
    JumpButtons,
    EngineStats,
    PVLines,
    EngineConsole,
    MoveHistoryNode,
    RoundedSwitch,
    EngineSelect
  },
  computed: {
    ...mapGetters(['active_new', 'mainFirstMove', 'QuickTourIndex']),
    isEngineActive () {
      return this.active_new(this.engineID)
    },
    movesExist () {
      const moves = this.$store.getters.moves
      return moves.length !== 0
    },
    fullHeight () {
      return this.io.length
    },
    cpForWhiteStr () {
      return this.$store.getters.cpForWhiteStr(this.engineID)
    }
  }
}
</script>

<style scoped>
input {
  font-size: 11pt;
}
.EngineStats-qt{
  border: 5px solid var(--quicktour-highlight);
}
.game-window {
  height: 20%;
  overflow-y: scroll;
  background-color: var(--second-bg-color);
}
.game-window-qt {
  height: 20%;
  overflow-y: scroll;
  background-color: var(--second-bg-color);
  border: 5px solid var(--quicktour-highlight);
}
.JumpButtons-qt {
  border: 5px solid var(--quicktour-highlight);
}
.panel {
  border-radius: 3px 3px 3px 3px;
  border: 1px solid var(--main-border-color);
  font-family: sans-serif;
  font-weight: 200;
}
.panel-qt {
  border-radius: 3px 3px 3px 3px;
  border: 5px solid var(--quicktour-highlight);
  font-family: sans-serif;
  font-weight: 200;
}
.panel + .panel {
  margin-top: 7px;
}
.multipv-line:hover {
  background-color: #d3e1eb;
  cursor: pointer;
}
.multipv-line {
  border-width: 1px;
  border-color: #333;
  border-top: 0;
  border-right: 0;
  border-left: 0;
  border-style: solid;
  text-align: left;
}
.multipv-eval {
  padding: 5px;
  font-weight: 1000;
  font-family: sans-serif;
  width: 70px;
  text-align: center;
}
.grid-parent {
  align-items: center;
}

.processing-bar {
  height: 5px;
  margin-bottom: 5px;
  border-radius: 3px;
  background-color: #888;
  background-image: url('../assets/images/analysis/bar-highlight.png');
  transition: background-color 0.4s; /* same as engine start/stop button */
  animation: bar-anim 1000s linear infinite;
  animation-play-state: paused;
}
.processing-bar.animate {
  background-color: var(--highlight-color);
  animation-play-state: running;
}
@keyframes bar-anim {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 100000px 0;
  }
}
.EngineConsole-qt {
  border: 5px solid var(--quicktour-highlight);
}
#move-history {
  text-align: left;
}
.containerEvalBar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: stretch;
  margin: 10px 0;
  border-radius: 3px;
  text-align: center;
}.containerEvalBar-qt {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: stretch;
  margin: 10px 0;
  border-radius: 3px;
  text-align: center;
  border: 5px solid var(--quicktour-highlight);
}
.containerEvalBar > * {
  margin: 0 5px;
}

.eval {
  font-size: 2em;
}
.smaller {
  font-size: 1.5em !important;
}
.select {
  flex-basis: auto;
  flex-shrink: 1;
  flex-grow: 1;
}

.switch {
  flex-basis: 60px;
  flex-shrink: 0;
  flex-grow: 0;
}
</style>
