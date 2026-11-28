<script setup lang="ts">
import { nextTick, useId } from 'vue'
import { shareLink, useSharedNotice } from '../composables/useSharedNotice'
import { useTodos } from '../composables/useTodos'
import { focusHome } from '../utils/reveal'
import Icon from './Icon.vue'

/*
 * There is no sign in: everyone with the link uses the same list. Say so once, plainly, with the
 * link to copy, and let the footer open it again (QA round 4, P22). Short enough to leave most
 * of a phone screen to the tasks.
 */
const { open, dismiss: close } = useSharedNotice()
const { showToast } = useTodos()
const headingId = useId()

async function dismiss() {
  close()
  await nextTick()
  focusHome()
}

async function copyLink() {
  const link = shareLink()
  try {
    await navigator.clipboard.writeText(link)
    showToast('saved', 'คัดลอกลิงก์แล้ว ส่งให้คนที่จะใช้รายการนี้ด้วยกันได้เลย')
  } catch {
    showToast('error', `คัดลอกไม่ได้ ลิงก์ของรายการนี้คือ ${link}`)
  }
}
</script>

<template>
  <aside
    v-if="open"
    :aria-labelledby="headingId"
    data-shared-notice
    tabindex="-1"
    class="box-border flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-2xl border-2 bg-white px-3.5 py-2.5 shadow-brutal-sm focus:outline-none sm:px-4.5 sm:py-3"
  >
    <div aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 bg-low max-sm:hidden">
      <Icon name="users" :size="20" :stroke="2.4" />
    </div>
    <div class="flex min-w-0 flex-[1_1_18rem] flex-col">
      <h2 :id="headingId" class="m-0 text-[0.9375rem] leading-normal font-bold">รายการนี้ใช้ร่วมกัน</h2>
      <p class="m-0 text-[0.8125rem] leading-normal font-medium text-[#333]">
        ใครมีลิงก์นี้ก็ดู แก้ไข และลบงานในรายการนี้ได้ อย่าใส่ข้อมูลส่วนตัวนะ
      </p>
    </div>
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <button type="button" class="btn-pill gap-1.5 pl-3" data-copy-link @click="copyLink">
        <Icon name="link" :size="16" :stroke="2.5" />
        คัดลอกลิงก์
      </button>
      <button type="button" class="btn-pill" @click="dismiss">เข้าใจแล้ว</button>
    </div>
  </aside>
</template>
