<script setup lang="ts">
import { ref } from 'vue'
import { createToggleState } from './toggle.logic'
import ToggleBoard from './ToggleBoard.vue'

const state = ref(createToggleState())
</script>

<template>
  <ToggleBoard
    :initial-state="state"
    :daily="false"
    @win="() => {}"
    @update:state="s => state = s"
  />
</template>