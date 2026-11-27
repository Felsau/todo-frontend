<script setup lang="ts">
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

const { load } = useTodos()
</script>

<template>
  <section
    role="alert"
    class="box-border flex flex-col items-start gap-2.5 rounded-2xl border-2 bg-white px-4 py-4.5 shadow-brutal-danger sm:max-w-xl"
  >
    <div class="flex size-11 items-center justify-center rounded-xl border-2 bg-high">
      <Icon name="wifiOff" :size="22" />
    </div>
    <h2 class="m-0 text-[18px] leading-normal font-bold">โหลดรายการไม่สำเร็จ</h2>
    <p class="m-0 text-[13px] leading-normal font-medium text-[#333]">
      อาจเป็นเพราะอินเทอร์เน็ตหลุด หรือระบบขัดข้องชั่วคราว รายการของคุณไม่ได้หายไปไหน ลองใหม่อีกครั้งได้เลย
    </p>
    <button type="button" class="btn-primary" @click="load()">ลองใหม่</button>
  </section>
</template>
