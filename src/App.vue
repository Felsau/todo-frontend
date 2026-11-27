<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import DetailDialog from './components/DetailDialog.vue'
import Icon from './components/Icon.vue'
import ToastHost from './components/ToastHost.vue'
import { useDetail } from './composables/useDetail'
import { useTodos } from './composables/useTodos'
import { focusHome } from './utils/reveal'

const { load, refresh, status, toast } = useTodos()
const { detailId } = useDetail()
const router = useRouter()
const route = useRoute()

/* Back to the top after scrolling far down a long list (QA round 2, R2-23). */
const scrolledFar = ref(false)
let frame = 0
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    scrolledFar.value = window.scrollY > window.innerHeight * 1.5
  })
}
function toTop() {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
  focusHome()
}

/* Another tab or device may have changed the list: look again when this tab comes back (R2-08). */
function onVisible() {
  if (document.visibilityState === 'visible' && detailId.value === null) void refresh()
}
function onOnline() {
  if (status.value === 'error') void load()
  else if (detailId.value === null) void refresh()
}

onMounted(async () => {
  void load()
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  // A reload while the detail or a sheet was open leaves its key in the address: drop it.
  await router.isReady()
  if (route.query.task !== undefined || route.query.sheet !== undefined) {
    const query = { ...route.query }
    delete query.task
    delete query.sheet
    void router.replace({ query })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('online', onOnline)
})
</script>

<template>
  <div class="min-h-dvh bg-paper px-5 pt-9 pb-28 sm:px-6 sm:pt-11">
    <main class="mx-auto flex max-w-280 flex-col gap-4 sm:gap-6">
      <AppHeader />
      <RouterView />
    </main>
  </div>
  <button
    v-if="scrolledFar && detailId === null"
    type="button"
    aria-label="กลับขึ้นบนสุด"
    class="fixed right-5 z-30 flex size-12 items-center justify-center rounded-full border-2 bg-white shadow-brutal sm:right-6"
    :class="toast ? 'bottom-24 sm:bottom-28' : 'bottom-5 sm:bottom-7'"
    @click="toTop"
  >
    <Icon name="arrowUp" :size="22" :stroke="3" />
  </button>
  <DetailDialog />
  <ToastHost />
</template>
