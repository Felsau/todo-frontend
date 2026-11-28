<script setup lang="ts">
const PATHS = {
  calendar: 'M4 7h16v13H4zM8 3v4M16 3v4M4 11h16',
  calendarGrid: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 5l-7 7l7 7',
  chevronRight: 'M9 5l7 7-7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  wifiOff: 'M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18',
  spinner: 'M12 3a9 9 0 1 0 9 9',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  users: 'M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  serverOff: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01M12 11v2',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
} as const

export type IconName = keyof typeof PATHS

withDefaults(defineProps<{ name: IconName; size?: number; stroke?: number }>(), {
  size: 18,
  stroke: 2.6,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :style="{ width: `${size / 16}rem`, height: `${size / 16}rem` }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    :class="name === 'spinner' ? 'motion-safe:animate-spin' : undefined"
    class="shrink-0"
  >
    <path :d="PATHS[name]" />
  </svg>
</template>
