<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
  </div>
</template>

<style>
.app {
  min-height: 100dvh;
  width: 100%;
  padding: 0;
  display: grid;
  place-items: stretch;
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
  will-change: transform, opacity;
  transform-origin: 50% 30%;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
