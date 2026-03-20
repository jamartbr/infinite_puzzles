<script setup lang="ts">
import { ref } from 'vue'
import { createLoopyState } from './loopy.logic'
import LoopyBoard from './LoopyBoard.vue'

const state = ref(createLoopyState())

function handleNewGame() {
  state.value = createLoopyState()
}
</script>

<template>
  <LoopyBoard
    :initial-state="state"
    :daily="false"
    @win="() => {}"
    @update:state="s => state = s"
  />
</template>