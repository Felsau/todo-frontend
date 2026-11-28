<script setup lang="ts">
import { nextTick, useId } from 'vue'
import { useListUi } from '../composables/useListUi'
import Icon from './Icon.vue'
import SortMenu from './SortMenu.vue'

/*
 * Sort menu and search. From 640px both sit at the right of the filter row.
 * On phones the sort menu is always on screen, so the chosen order can be seen, and the
 * search button next to it opens only the search box (QA round 4, P12, U5).
 */
defineProps<{ phone?: boolean }>()
const { query, sort, searchOpen, toggleSearch } = useListUi()
const searchId = useId()

/** Opening search on a phone puts the cursor straight in the box (R2-16). */
async function onSearchToggle() {
  toggleSearch()
  if (!searchOpen.value) return
  await nextTick()
  document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
}

/** The app's own clear button: empties the box and keeps the cursor in it. */
function clearSearch() {
  query.value = ''
  document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
}

const field = 'box-border h-11 w-full rounded-full border-2 bg-white text-[1rem] font-semibold sm:text-[0.875rem]'
</script>

<template>
  <div v-if="phone" class="flex flex-col gap-2" data-list-tools>
    <div class="flex items-center gap-2">
      <span class="label" aria-hidden="true">เรียง</span>
      <SortMenu v-model="sort" :field-class="field" />
      <button
        type="button"
        class="btn-pill flex-none gap-1.5 pl-3 max-[22.5rem]:w-11 max-[22.5rem]:px-0"
        :class="searchOpen && 'bg-accent'"
        :aria-pressed="searchOpen"
        aria-label="ค้นหา"
        @click="onSearchToggle"
      >
        <Icon name="search" :size="18" />
        <span class="max-[22.5rem]:sr-only">ค้นหา</span>
      </button>
    </div>
    <div v-if="searchOpen" class="relative">
      <label :for="searchId" class="sr-only">ค้นหาชื่องานหรือโน้ต</label>
      <Icon name="search" :size="18" class="pointer-events-none absolute top-3 left-3.25" />
      <input
        :id="searchId"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="ค้นหาชื่องานหรือโน้ต"
        data-search-input
        :class="[field, 'pr-11 pl-10 sm:pr-9']"
      />
      <button
        v-if="query"
        type="button"
        aria-label="ล้างคำค้น"
        class="absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink sm:right-0.5 sm:size-10"
        @click="clearSearch"
      >
        <Icon name="close" :size="16" :stroke="3" />
      </button>
    </div>
  </div>

  <div v-else class="flex flex-wrap items-center gap-2.5">
    <div class="relative w-56">
      <label :for="searchId" class="sr-only">ค้นหาชื่องานหรือโน้ต</label>
      <Icon name="search" :size="18" class="pointer-events-none absolute top-3 left-3.25" />
      <input
        :id="searchId"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="ค้นหาชื่องานหรือโน้ต"
        data-search-input
        :class="[field, 'pr-11 pl-10 sm:pr-9']"
      />
      <button
        v-if="query"
        type="button"
        aria-label="ล้างคำค้น"
        class="absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink sm:right-0.5 sm:size-10"
        @click="clearSearch"
      >
        <Icon name="close" :size="16" :stroke="3" />
      </button>
    </div>
    <div class="flex items-center gap-2">
      <span class="label" aria-hidden="true">เรียง</span>
      <SortMenu v-model="sort" :field-class="field" />
    </div>
  </div>
</template>
