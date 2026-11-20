<script setup lang="ts">
const { user, logout } = useAuth();

const avatarLetter = computed(() => user.value?.email?.charAt(0) ?? '?');

async function signOut() {
  await logout();
  await navigateTo('/login');
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="container app-header__inner">
        <NuxtLink to="/" class="brand" aria-label="Taskflow home">
          <span class="brand__mark" aria-hidden="true">
            <AppIcon name="check" :size="21" />
          </span>
          <span class="brand__name">Taskflow</span>
        </NuxtLink>

        <nav class="main-nav" aria-label="Main navigation">
          <NuxtLink to="/" class="nav-link">
            <AppIcon name="list" :size="18" />
            <span>Tasks</span>
          </NuxtLink>
          <NuxtLink to="/notes" class="nav-link">
            <AppIcon name="note" :size="18" />
            <span>Notes</span>
          </NuxtLink>
        </nav>

        <div v-if="user" class="header-account">
          <span class="avatar" aria-hidden="true">{{ avatarLetter }}</span>
          <span class="header-account__email" :title="user.email">{{ user.email }}</span>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="Log out"
            title="Log out"
            @click="signOut"
          >
            <AppIcon name="logout" :size="19" />
          </button>
        </div>
      </div>
    </header>

    <main class="container app-main">
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </main>
  </div>
</template>
