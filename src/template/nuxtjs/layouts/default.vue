<template>
  <div>
    <header class="bg-white shadow">
      <nav class="container mx-auto px-4 py-4">
        <NuxtLink to="/" class="text-gray-800 hover:text-gray-600 mr-4">Home</NuxtLink>
        <NuxtLink to="/about" class="text-gray-800 hover:text-gray-600">About</NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer class="bg-gray-100 mt-8">
      <div class="container mx-auto px-4 py-4 text-center text-gray-600">
        © {{ new Date().getFullYear() }} Your Company
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Layout component
</script>

<style scoped>
</style>
