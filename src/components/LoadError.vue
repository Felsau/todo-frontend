<script setup lang="ts">
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

/* Shown when the list could not be loaded. No internet on this device gets its own words (R2-21). */
const { load, loadError } = useTodos()
</script>

<template>
  <section
    role="alert"
    class="box-border flex flex-col items-start gap-2.5 rounded-2xl border-2 bg-white px-4 py-4.5 shadow-brutal-danger sm:max-w-xl"
  >
    <div class="flex size-11 items-center justify-center rounded-xl border-2 bg-high">
      <Icon name="wifiOff" :size="22" />
    </div>
    <template v-if="loadError === 'offline'">
      <h2 class="m-0 text-[18px] leading-normal font-bold">ยังไม่ได้ต่ออินเทอร์เน็ต</h2>
      <p class="m-0 text-[13px] leading-normal font-medium text-[#333]">
        ต่ออินเทอร์เน็ตแล้วรายการจะโหลดขึ้นมาเอง หรือกดลองใหม่ก็ได้ รายการของคุณไม่ได้หายไปไหน
      </p>
    </template>
    <template v-else>
      <h2 class="m-0 text-[18px] leading-normal font-bold">โหลดรายการไม่สำเร็จ</h2>
      <p class="m-0 text-[13px] leading-normal font-medium text-[#333]">
        อาจเป็นเพราะอินเทอร์เน็ตหลุด หรือระบบขัดข้องชั่วคราว รายการของคุณไม่ได้หายไปไหน ลองใหม่อีกครั้งได้เลย
      </p>
    </template>
    <button type="button" class="btn-primary" @click="load()">ลองใหม่</button>
  </section>
</template>
