<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: 'inbox' | 'checkCircle' | 'note' | 'pin';
    title: string;
    description: string;
  }>(),
  { icon: 'inbox' },
);
</script>

<template>
  <div class="empty">
    <div class="empty__icon" aria-hidden="true">
      <AppIcon :name="icon" :size="28" />
    </div>
    <p class="empty__title">{{ title }}</p>
    <p class="empty__text">{{ description }}</p>
    <div v-if="$slots.action" class="empty__action">
      <slot name="action" />
    </div>
  </div>
</template>
