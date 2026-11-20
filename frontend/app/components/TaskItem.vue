<script setup lang="ts">
import type { Task } from '~/types/models';

const props = defineProps<{ task: Task; pending?: boolean }>();
const emit = defineEmits<{
  toggle: [task: Task];
  save: [payload: { id: number; title: string }];
  remove: [task: Task];
}>();

const editing = ref(false);
const confirming = ref(false);
const draft = ref(props.task.title);
const editInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.task.title,
  (title) => {
    if (!editing.value) draft.value = title;
  },
);

function startEdit() {
  draft.value = props.task.title;
  editing.value = true;
  confirming.value = false;
  nextTick(() => editInput.value?.focus());
}

function commitEdit() {
  const title = draft.value.trim();
  editing.value = false;
  if (!title || title === props.task.title) return;
  emit('save', { id: props.task.id, title });
}

function cancelEdit() {
  editing.value = false;
  draft.value = props.task.title;
}
</script>

<template>
  <li class="task-item" :class="{ 'task-item--done': task.completed }" :aria-busy="pending">
    <button
      type="button"
      class="task-check"
      :aria-pressed="!!task.completed"
      :aria-label="task.completed ? `Mark ${task.title} as active` : `Mark ${task.title} as done`"
      :disabled="pending"
      @click="emit('toggle', task)"
    >
      <AppIcon v-if="task.completed" name="check" :size="14" />
    </button>

    <div class="task-item__body">
      <form v-if="editing" class="inline-edit" @submit.prevent="commitEdit">
        <input
          ref="editInput"
          v-model="draft"
          class="input"
          type="text"
          maxlength="120"
          aria-label="Task title"
          @keydown.esc="cancelEdit"
        />
        <button type="submit" class="btn btn-primary btn-sm" :disabled="pending || !draft.trim()">
          Save
        </button>
        <button type="button" class="btn btn-ghost btn-sm" @click="cancelEdit">Cancel</button>
      </form>

      <template v-else>
        <button
          type="button"
          class="task-item__title"
          :disabled="pending"
          :title="`Edit ${task.title}`"
          @click="startEdit"
        >
          {{ task.title }}
        </button>

        <div v-if="confirming" class="confirm-bar">
          <span>Delete this task?</span>
          <div class="confirm-bar__actions">
            <button type="button" class="btn btn-secondary btn-sm" @click="confirming = false">
              Cancel
            </button>
            <button type="button" class="btn btn-danger btn-sm" :disabled="pending" @click="emit('remove', task); confirming = false">
              Delete
            </button>
          </div>
        </div>
      </template>
    </div>

    <div v-if="!editing && !confirming" class="task-item__actions">
      <button type="button" class="btn btn-ghost btn-icon" :aria-label="`Edit ${task.title}`" :disabled="pending" @click="startEdit">
        <AppIcon name="pencil" :size="17" />
      </button>
      <button type="button" class="btn btn-ghost btn-icon" :aria-label="`Delete ${task.title}`" :disabled="pending" @click="confirming = true">
        <AppIcon name="trash" :size="17" />
      </button>
    </div>
  </li>
</template>
