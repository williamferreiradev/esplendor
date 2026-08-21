<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
  </div>
</template>

<script setup lang="ts">
import { useSupabaseUser, useSupabaseCookieRedirect } from '#imports'
import { watch } from 'vue'

definePageMeta({
  layout: false
})

const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

watch(user, () => {
  if (user.value) {
    let path = redirectInfo.pluck()
    if (!path || path === '/' || path.startsWith('/_nuxt') || path.includes('.') || path.startsWith('/api') || path === '/login') {
      path = '/dashboard'
    }
    navigateTo(path, { replace: true })
  }
}, { immediate: true })
</script>
