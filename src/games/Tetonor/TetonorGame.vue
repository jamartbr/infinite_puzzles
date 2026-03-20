<script setup lang="ts">
import { ref } from 'vue'
import { createTetonorState } from './tetonor.logic'
import TetonorBoard from './TetonorBoard.vue'

const state = ref(createTetonorState())

function handleNewGame() {
  state.value = createTetonorState()
}
</script>

<template>
  <TetonorBoard
    :initial-state="state"
    @win="() => {}"
    @update:state="s => state = s"
  />
</template>