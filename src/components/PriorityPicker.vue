<script setup lang="ts">
import { PRIORITIES, PRIORITY_BG, PRIORITY_LABEL, type Priority } from '../types'
import Icon from './Icon.vue'

/* Three priority chips. The selected one takes the colour of its level plus a check. */
const props = withDefaults(
  defineProps<{
    modelValue: Priority
    /** row: wrapping chips. grid: three equal columns (mobile detail sheet). */
    layout?: 'row' | 'grid'
  }>(),
  { layout: 'row' },
)
const emit = defineEmits<{ 'update:modelValue': [value: Priority]; pick: [value: Priority] }>()

function choose(p: Priority) {
  emit('update:modelValue', p)
  emit('pick', p)
}
</script>

<template>
  <div class="gap-2" :class="props.layout === 'grid' ? 'grid grid-cols-3 gap-1.5' : 'flex flex-wrap'">
    <button
      v-for="p in PRIORITIES"
      :key="p"
      type="button"
      class="opt"
      :class="[
        props.modelValue === p && PRIORITY_BG[p],
        props.layout === 'grid' ? 'rounded-xl px-1' : 'px-4',
      ]"
      :style="props.modelValue === p ? { background: `var(--color-${p})` } : undefined"
      :aria-pressed="props.modelValue === p"
      @click="choose(p)"
    >
      <Icon v-if="props.modelValue === p" name="check" :size="14" :stroke="3.5" />
      {{ PRIORITY_LABEL[p] }}
    </button>
  </div>
</template>
