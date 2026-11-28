<script setup lang="ts">
import { FILTERS, useListUi } from '../composables/useListUi'
import Icon from './Icon.vue'

/*
 * ทั้งหมด, ยังไม่เสร็จ and เสร็จแล้ว split the list and add up. เลยกำหนด is a warning picked out
 * of ยังไม่เสร็จ, so it stands apart: a rule before it on wide screens, a red outline and a
 * warning sign everywhere, so nobody expects the four numbers to add up (QA round 4, P5).
 */
const { filter, counts } = useListUi()
const MAIN = FILTERS.filter((f) => f.key !== 'overdue')
const OVERDUE = FILTERS.find((f) => f.key === 'overdue')!
const chip =
  'flex h-11 shrink-0 items-center justify-between gap-1.5 rounded-full border-2 py-0 pr-2 pl-3.5 text-[0.875rem] font-semibold whitespace-nowrap sm:justify-start sm:gap-2 sm:pl-4'
const count = 'box-border flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.75rem] font-semibold sm:px-1.75'
</script>

<template>
  <div>
    <div
      role="group"
      aria-label="ตัวกรอง"
      class="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2 sm:flex sm:flex-wrap sm:items-center"
    >
      <button
        v-for="f in MAIN"
        :key="f.key"
        type="button"
        :class="[chip, filter === f.key ? 'bg-ink text-white' : 'bg-white text-ink']"
        :aria-pressed="filter === f.key"
        @click="filter = f.key"
      >
        {{ f.label }}
        <span :class="[count, filter === f.key ? 'bg-accent text-ink' : 'bg-paper text-ink']">{{ counts[f.key] }}</span>
      </button>
      <span aria-hidden="true" class="mx-1 hidden h-7 w-0.5 rounded-full bg-[#8a8780] sm:block"></span>
      <button
        type="button"
        data-filter-overdue
        :class="[
          chip,
          'pl-3 sm:pl-3.5',
          filter === 'overdue'
            ? 'border-danger bg-danger text-white'
            : counts.overdue > 0
              ? 'border-danger bg-white text-danger'
              : 'bg-white text-ink',
        ]"
        :aria-pressed="filter === 'overdue'"
        @click="filter = 'overdue'"
      >
        <span class="flex items-center gap-1.5">
          <Icon name="alert" :size="16" :stroke="2.6" />
          {{ OVERDUE.label }}
        </span>
        <span
          :class="[
            count,
            filter === 'overdue' ? 'bg-white text-danger' : counts.overdue > 0 ? 'bg-danger text-white' : 'bg-paper text-ink',
          ]"
        >
          {{ counts.overdue }}
        </span>
      </button>
    </div>
  </div>
</template>
