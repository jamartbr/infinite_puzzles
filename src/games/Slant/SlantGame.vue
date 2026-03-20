<script setup lang="ts">
import { ref } from 'vue'
import { createSlantState } from './slant.logic'
import SlantBoard from './SlantBoard.vue'

const state = ref(createSlantState())

function handleNewGame() {
  state.value = createSlantState()
}
</script>

<template>
  <SlantBoard
    :initial-state="state"
    :daily="false"
    @win="() => {}"
    @update:state="s => state = s"
  />
</template>