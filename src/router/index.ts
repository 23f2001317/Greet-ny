import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { writeDraft } from '../utils/session'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../pages/LandingPage.vue'),
  },
  {
    path: '/question',
    name: 'question',
    component: () => import('../pages/QuestionPage.vue'),
    beforeEnter() {
      // Default question flow uses the romantic theme.
      writeDraft({ selectedPath: 'love', name: '', loveAnswer: 'unset', relationship: 'friend', wish: 'unset' })
      return true
    },
  },
  {
    path: '/input',
    redirect: { name: 'question' },
  },
  {
    path: '/generate',
    name: 'generate',
    component: () => import('../pages/EssayGenerationPage.vue'),
  },
  {
    path: '/greeting',
    name: 'greeting',
    component: () => import('../pages/GreetingPage.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
