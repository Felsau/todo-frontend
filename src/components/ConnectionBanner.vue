<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { unreachable } from '../api/todos'
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

/*
 * The internet dropped, or the server stopped answering, while the list was open: say so once,
 * above the list, until it works again (QA round 4, U13). Every action then explains itself in
 * one toast instead of each card flipping and flipping back.
 */
const { status, refresh } = useTodos()
const online = ref(navigator.onLine)
const update = () => {
  online.value = navigator.onLine
}
onMounted(() => {
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})

const show = computed(() => status.value === 'ready' && (!online.value || unreachable.value))
const checking = ref(false)
async function retry() {
  checking.value = true
  try {
    await refresh(true)
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div
    v-if="show"
    role="status"
    data-connection-banner
    class="box-border flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-2 border-danger bg-[#ffe3e3] px-3.5 py-2.5 text-[#8f1d1d]"
  >
    <Icon :name="online ? 'serverOff' : 'wifiOff'" :size="20" />
    <p class="m-0 min-w-0 flex-[1_1_14rem] text-[0.8125rem] leading-normal font-semibold">
      <template v-if="!online">ไม่ได้ต่ออินเทอร์เน็ตอยู่ ดูรายการได้ แต่ยังเพิ่มหรือแก้งานไม่ได้ ต่อเมื่อไรก็ใช้ได้ตามปกติ</template>
      <template v-else>ติดต่อระบบไม่ได้ชั่วคราว สิ่งที่เพิ่งแก้อาจยังไม่ถูกบันทึก ลองอีกครั้งในอีกสักครู่</template>
    </p>
    <button v-if="online" type="button" class="btn-pill ml-auto border-danger bg-white text-danger" :disabled="checking" @click="retry">
      {{ checking ? 'กำลังลอง...' : 'ลองใหม่' }}
    </button>
  </div>
</template>
