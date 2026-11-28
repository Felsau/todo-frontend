<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'
import { focusHome } from '../utils/reveal'
import Icon from './Icon.vue'

/*
 * There is no sign in: everyone with the link uses the same list. Say so once, plainly,
 * and remember when the person has read it (QA round 3, SEO 1). Storage can be blocked
 * (private mode, strict settings), so every access is guarded and the note simply shows again.
 */
const KEY = 'luiyngan.sharedNotice.dismissed'

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const open = ref(!readDismissed())
const headingId = useId()

async function dismiss() {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    /* not remembered this time; the note is still closed for this visit */
  }
  open.value = false
  await nextTick()
  focusHome()
}
</script>

<template>
  <aside
    v-if="open"
    :aria-labelledby="headingId"
    data-shared-notice
    class="box-border flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-2xl border-2 bg-white px-3.5 py-3 shadow-brutal-sm sm:px-4.5"
  >
    <div aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 bg-low">
      <Icon name="users" :size="20" :stroke="2.4" />
    </div>
    <div class="flex min-w-0 flex-[1_1_15rem] flex-col">
      <h2 :id="headingId" class="m-0 text-[0.9375rem] leading-normal font-bold">รายการนี้ใช้ร่วมกันนะ</h2>
      <p class="m-0 text-[0.8125rem] leading-normal font-medium text-[#333]">
        ทุกคนที่มีลิงก์จะเห็น แก้ และลบงานชุดเดียวกันได้ จึงอย่าพิมพ์ข้อมูลส่วนตัวลงไป
      </p>
    </div>
    <button type="button" class="btn-pill ml-auto" @click="dismiss">เข้าใจแล้ว</button>
  </aside>
</template>
