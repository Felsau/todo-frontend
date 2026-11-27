<script setup lang="ts"></script>

<template>
  <main class="mx-auto flex max-w-280 flex-col gap-6 px-6 py-11">
    <p class="text-[13px] font-semibold text-muted">โครงเริ่มต้น Vite + Vue 3 + Tailwind</p>
    <h1 class="text-[56px] leading-[1.2] font-bold">ลุยงาน!</h1>
    <div class="flex flex-wrap gap-4">
      <div class="rounded-2xl border-2 bg-high px-6 py-4 shadow-brutal">high #FFC9D9</div>
      <div class="rounded-2xl border-2 bg-normal px-6 py-4 shadow-brutal">normal #FFE066</div>
      <div class="rounded-2xl border-2 bg-low px-6 py-4 shadow-brutal">low #BDE0FE</div>
      <div class="rounded-2xl border-2 bg-surface px-6 py-4">done #FFFFFF</div>
      <div class="rounded-2xl border-2 bg-danger px-6 py-4 text-white shadow-brutal-sm">danger #C92A2A</div>
      <div class="rounded-2xl border-2 bg-accent px-6 py-4 shadow-brutal-accent">accent #FFD43B</div>
    </div>
    <button class="h-12 w-fit rounded-xl border-2 bg-ink px-5 font-bold text-white shadow-brutal-accent">เพิ่ม +</button>
    <router-view />
  </main>
</template>
