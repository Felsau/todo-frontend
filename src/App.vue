<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import ConnectionBanner from './components/ConnectionBanner.vue'
import DetailDialog from './components/DetailDialog.vue'
import Icon from './components/Icon.vue'
import SharedNotice from './components/SharedNotice.vue'
import ToastHost from './components/ToastHost.vue'
import { useAddForm } from './composables/useAddForm'
import { useDetail } from './composables/useDetail'
import { useSharedNotice } from './composables/useSharedNotice'
import { useTodos } from './composables/useTodos'
import { focusHome } from './utils/reveal'

const { load, refresh, status } = useTodos()
const { detailId } = useDetail()
const { fabShown } = useAddForm()
const notice = useSharedNotice()
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

/* The shared notice can be read again from the foot of the page (QA round 4, P22). */
async function reopenNotice() {
  notice.reopen()
  await nextTick()
  const el = document.querySelector<HTMLElement>('[data-shared-notice]')
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  el.focus({ preventScroll: true })
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
  if (route.query.task !== undefined || route.query.sheet !== undefined || route.query.add !== undefined) {
    const query = { ...route.query }
    delete query.task
    delete query.sheet
    delete query.add
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
  <!-- The bottom room grows with the toast, so the + button never covers the last card (QA round 4, P14). -->
  <div class="min-h-dvh bg-paper px-5 pt-9 pb-[calc(7rem+env(safe-area-inset-bottom)+var(--toast-lift,0px))] sm:px-6 sm:pt-11">
    <main class="mx-auto flex max-w-280 flex-col gap-4 sm:gap-6">
      <AppHeader />
      <ConnectionBanner />
      <SharedNotice />
      <RouterView />
    </main>
    <footer v-if="status === 'ready' && !notice.open.value" class="mx-auto mt-8 flex max-w-280 justify-center">
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-full border-0 bg-transparent px-3 text-[0.8125rem] font-semibold text-muted underline decoration-1 underline-offset-4"
        data-reopen-notice
        @click="reopenNotice"
      >
        <Icon name="users" :size="16" />
        รายการนี้ใช้ร่วมกัน ดูรายละเอียดและลิงก์
      </button>
    </footer>
  </div>
  <!--
    Above the toast (its height is --toast-lift). On a phone list it sits left of the round +
    button, on the same line, so neither covers the other or the last card.
  -->
  <button
    v-if="scrolledFar && detailId === null"
    type="button"
    aria-label="กลับขึ้นบนสุด"
    class="fixed z-30 flex size-12 items-center justify-center rounded-full border-2 bg-white shadow-brutal motion-safe:transition-[bottom] motion-safe:duration-150"
    :class="
      fabShown
        ? 'right-23 bottom-[calc(1.625rem+env(safe-area-inset-bottom)+var(--toast-lift,0px))]'
        : 'right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom)+var(--toast-lift,0px))] sm:right-6 sm:bottom-[calc(1.75rem+var(--toast-lift,0px))]'
    "
    @click="toTop"
  >
    <Icon name="arrowUp" :size="22" :stroke="3" />
  </button>
  <DetailDialog />
  <ToastHost />
</template>
