<script setup lang="ts">
import { ref } from 'vue'
import { createQueensState } from './queens.logic'
import QueensBoard from './QueensBoard.vue'

const state = ref(createQueensState())
</script>

<template>
  <QueensBoard
    :initial-state="state"
    :daily="false"
    @win="() => {}"
    @update:state="s => state = s"
  />
</template>