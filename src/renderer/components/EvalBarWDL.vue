<template>
  <div
    class="progress"
    :class="{ flip : orientation === 'black' }"
  >
    <div
      class="blackbar"
      :style="{ height: `${(100 - cpForWhitePerc * 100)/3}%` }"
    />
    <div
      class="graybar"
      :style="{ height: `${(100 - cpForWhitePerc * 100)/2}%` }"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'EvalBarWDL',
  computed: {
    ...mapGetters(['orientation', 'cpForWhitePerc'])
  }
}
</script>

<style scoped>
.progress {
  position: relative;
  width: 17px;
  height: 600px;
  background: var(--light-text-color);
  border: 1px solid #888;
  border-radius: 5px;
  overflow: hidden;
  grid-template-areas: 
    "blackbar"
    "graybar";
  }
.flip {
  transform: scaleY(-1);
}
.blackbar {
  width: 100%;
  height: 33.3%;
  background: #111;
  transition: height .25s ease;
  grid-area: "blackbar";
}
.graybar {
  width: 100%;
  height: 33.3%;
  background: #999;
  transition: height .25s ease;
  grid-area: "graybar";
}
</style>
