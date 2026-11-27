import { createRouter, createWebHistory } from 'vue-router'
import CalendarView from './views/CalendarView.vue'
import ListView from './views/ListView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'list', component: ListView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// Each view has its own tab title (QA round 2, R2-22).
router.afterEach((to) => {
  document.title = to.name === 'calendar' ? 'ปฏิทิน · ลุยงาน!' : 'ลุยงาน!'
})
