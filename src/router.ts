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
