<script setup lang="ts">
import Icon from './Icon.vue'

/* Three stacked cards with a plus: the "no todos yet" picture. */
defineProps<{ scale?: number }>()
</script>

<template>
  <div
    aria-hidden="true"
    class="relative h-30 w-37.5 origin-center"
    :style="scale ? { transform: `scale(${scale})`, marginBlock: `${(120 * (scale - 1)) / 2}px` } : undefined"
  >
    <div class="absolute top-4.5 left-1.5 h-19 w-30 -rotate-8 rounded-xl border-2 bg-low"></div>
    <div class="absolute top-2.5 left-5.5 h-19 w-30 rotate-5 rounded-xl border-2 bg-high"></div>
    <div
      class="absolute top-7.5 left-3.5 box-border flex h-19 w-30 items-center justify-center rounded-xl border-2 bg-normal shadow-brutal"
    >
      <Icon name="plus" :size="34" :stroke="3" />
    </div>
  </div>
</template>
