<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import DetailDialog from './components/DetailDialog.vue'
import ToastHost from './components/ToastHost.vue'
import { useTodos } from './composables/useTodos'

const { load } = useTodos()
onMounted(() => {
  void load()
})
</script>

<template>
  <div class="min-h-dvh bg-paper px-5 pt-9 pb-28 sm:px-6 sm:pt-11">
    <main class="mx-auto flex max-w-280 flex-col gap-4 sm:gap-6">
      <AppHeader />
      <RouterView />
    </main>
  </div>
  <DetailDialog />
  <ToastHost />
</template>
