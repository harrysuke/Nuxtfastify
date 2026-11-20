<script setup lang="ts">
import type { Note } from '~/types/models';

const props = defineProps<{ note: Note; pending?: boolean }>();
const emit = defineEmits<{
  togglePin: [note: Note];
  save: [payload: { id: number; content: string }];
  remove: [note: Note];
}>();

const editing = ref(false);
const confirming = ref(false);
const draft = ref(props.note.content);
const editInput = ref<HTMLTextAreaElement | null>(null);
const MAX_LENGTH = 500;

watch(
  () => props.note.content,
  (content) => {
    if (!editing.value) draft.value = content;
  },
);

function startEdit() {
  draft.value = props.note.content;
  editing.value = true;
  confirming.value = false;
  nextTick(() => editInput.value?.focus());
}

function commitEdit() {
  const content = draft.value.trim();
  editing.value = false;
  if (!content || content === props.note.content) return;
  emit('save', { id: props.note.id, content });
}

function cancelEdit() {
  editing.value = false;
  draft.value = props.note.content;
}
</script>

<template>
  <article
    class="card note-card"
    :class="{ 'note-card--pinned': note.pinned }"
    :aria-busy="pending"
  >
    <div class="note-card__top">
      <span class="note-card__id">#{{ note.id }}</span>
      <span v-if="note.pinned" class="badge badge--warning">
        <AppIcon name="pin" :size="12" />
        Pinned
      </span>
    </div>

    <form v-if="editing" class="note-card__edit" @submit.prevent="commitEdit">
      <textarea
        ref="editInput"
        v-model="draft"
        class="textarea"
        :maxlength="MAX_LENGTH"
        rows="4"
        aria-label="Note content"
        @keydown.ctrl.enter.prevent="commitEdit"
        @keydown.meta.enter.prevent="commitEdit"
        @keydown.esc="cancelEdit"
      />
      <div class="note-card__edit-actions">
        <span class="note-card__counter">{{ draft.length }}/{{ MAX_LENGTH }}</span>
        <button type="button" class="btn btn-ghost btn-sm" @click="cancelEdit">Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm" :disabled="pending || !draft.trim()">
          Save
        </button>
      </div>
    </form>

    <template v-else>
      <p class="note-card__content">{{ note.content }}</p>

      <div v-if="confirming" class="confirm-bar">
        <span>Delete this note?</span>
        <div class="confirm-bar__actions">
          <button type="button" class="btn btn-secondary btn-sm" @click="confirming = false">
            Cancel
          </button>
          <button type="button" class="btn btn-danger btn-sm" :disabled="pending" @click="emit('remove', note); confirming = false">
            Delete
          </button>
        </div>
      </div>

      <div v-else class="note-card__footer">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :aria-pressed="note.pinned"
          :disabled="pending"
          @click="emit('togglePin', note)"
        >
          <AppIcon name="pin" :size="16" />
          {{ note.pinned ? 'Unpin' : 'Pin' }}
        </button>
        <div class="note-card__actions">
          <button type="button" class="btn btn-ghost btn-icon" :aria-label="`Edit note ${note.id}`" :disabled="pending" @click="startEdit">
            <AppIcon name="pencil" :size="16" />
          </button>
          <button type="button" class="btn btn-ghost btn-icon" :aria-label="`Delete note ${note.id}`" :disabled="pending" @click="confirming = true">
            <AppIcon name="trash" :size="16" />
          </button>
        </div>
      </div>
    </template>
  </article>
</template>
