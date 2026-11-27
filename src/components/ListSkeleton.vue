<template>
  <div class="flex flex-col gap-3.5" aria-busy="true" role="status" aria-live="polite">
    <div class="box-border h-13 rounded-xl border-2 bg-white shadow-brutal-sm"></div>
    <div class="flex gap-1.5">
      <div class="h-8 w-18 rounded-full bg-line"></div>
      <div class="h-8 w-14 rounded-full bg-line"></div>
      <div class="h-8 w-17 rounded-full bg-line"></div>
    </div>
    <div class="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:gap-4.5 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
      <div
        v-for="w in [['80%', '40%'], ['65%', '30%'], ['72%', '35%']]"
        :key="w[0]"
        class="flex min-h-15.5 items-center gap-2.5 rounded-[14px] bg-line px-2.5 sm:min-h-34"
      >
        <div class="size-9 shrink-0 rounded-[9px] bg-[#c9c5bc]"></div>
        <div class="flex flex-1 flex-col gap-1.5">
          <div class="h-2.5 rounded-[5px] bg-[#c9c5bc]" :style="{ width: w[0] }"></div>
          <div class="h-2 rounded bg-[#c9c5bc]" :style="{ width: w[1] }"></div>
        </div>
      </div>
    </div>
    <p class="m-0 mt-1 text-center text-[12px] font-semibold text-muted">กำลังดึงรายการ...</p>
  </div>
</template>
