<template>
  <div class="min-h-screen bg-[#F8FAFC] text-gray-900 dark:bg-dark-bg dark:text-dark-text font-sans transition-colors duration-300 selection:bg-primary-500 selection:text-white">
    <div class="fixed inset-0 pointer-events-none z-0 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-primary-700/15 dark:via-dark-bg dark:to-dark-bg opacity-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-[#F8FAFC] to-[#EFF4FA]"></div>
    <div class="relative z-10 h-full">
      <NuxtPage />
    </div>
  </div>
</template>

<style>
:root {
  --app-bg: #f8fafc;
  --app-surface: #ffffff;
  --app-border: #e2e8f0;
}

html {
  background: var(--app-bg);
}

body {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(10, 61, 143, 0.04), transparent 26%),
    linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
}

.dark body {
  background:
    radial-gradient(circle at top left, rgba(10, 61, 143, 0.12), transparent 24%),
    linear-gradient(180deg, #0b132b 0%, #080e21 100%);
}
</style>
