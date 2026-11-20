<script setup lang="ts">
import type { Note, NoteFilter } from '~/types/models';

const API_URL = '/api/notes';
const MAX_LENGTH = 500;

const notes = ref<Note[]>([]);
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const pendingIds = ref<number[]>([]);
const newContent = ref('');
const filter = ref<NoteFilter>('all');
const liveMessage = ref('');

async function loadNotes() {
  loading.value = true;
  loadError.value = '';
  try {
    notes.value = await $fetch<Note[]>(API_URL, { headers: authHeaders() });
  } catch (error) {
    loadError.value = getApiErrorMessage(error, 'Could not load your notes.');
  } finally {
    loading.value = false;
  }
}

onMounted(loadNotes);

const total = computed(() => notes.value.length);
const pinnedCount = computed(() => notes.value.filter((note) => note.pinned).length);

const visibleNotes = computed(() => {
  const sorted = [...notes.value].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.id - a.id,
  );
  return filter.value === 'pinned' ? sorted.filter((note) => note.pinned) : sorted;
});

const filterOptions = computed(() => [
  { value: 'all' as const, label: 'All notes', count: total.value },
  { value: 'pinned' as const, label: 'Pinned', count: pinnedCount.value },
]);

function isPending(id: number) {
  return pendingIds.value.includes(id);
}

async function withPending<T>(id: number, action: () => Promise<T>): Promise<T> {
  pendingIds.value.push(id);
  try {
    return await action();
  } finally {
    pendingIds.value = pendingIds.value.filter((pendingId) => pendingId !== id);
  }
}

async function addNote() {
  const content = newContent.value.trim();
  if (!content || saving.value) return;

  saving.value = true;
  const tempId = -Date.now();
  notes.value.unshift({ id: tempId, content, pinned: false });
  newContent.value = '';

  try {
    const created = await $fetch<Note>(API_URL, { method: 'POST', body: { content } });
    const index = notes.value.findIndex((note) => note.id === tempId);
    if (index >= 0) notes.value[index] = created;
    liveMessage.value = 'Note saved.';
  } catch (error) {
    notes.value = notes.value.filter((note) => note.id !== tempId);
    newContent.value = content;
    liveMessage.value = getApiErrorMessage(error, 'Could not save the note.');
  } finally {
    saving.value = false;
  }
}

async function togglePin(note: Note) {
  if (isPending(note.id)) return;
  const previous = note.pinned;
  note.pinned = !previous;

  try {
    const updated = await withPending(note.id, () =>
      $fetch<Note>(`${API_URL}/${note.id}`, {
        method: 'PUT',
        body: { pinned: !previous },
      }),
    );
    note.pinned = updated.pinned;
    liveMessage.value = updated.pinned ? 'Note pinned.' : 'Note unpinned.';
  } catch (error) {
    note.pinned = previous;
    liveMessage.value = getApiErrorMessage(error, 'Could not update the note.');
  }
}

async function saveContent({ id, content }: { id: number; content: string }) {
  const note = notes.value.find((item) => item.id === id);
  if (!note || isPending(id)) return;
  const previous = note.content;
  note.content = content;

  try {
    const updated = await withPending(id, () =>
      $fetch<Note>(`${API_URL}/${id}`, { method: 'PUT', body: { content } }),
    );
    note.content = updated.content;
    liveMessage.value = 'Note updated.';
  } catch (error) {
    note.content = previous;
    liveMessage.value = getApiErrorMessage(error, 'Could not update the note.');
  }
}

async function deleteNote(note: Note) {
  if (isPending(note.id)) return;
  const index = notes.value.findIndex((item) => item.id === note.id);
  if (index < 0) return;
  notes.value.splice(index, 1);

  try {
    await withPending(note.id, () => $fetch(`${API_URL}/${note.id}`, { method: 'DELETE' }));
    liveMessage.value = 'Note deleted.';
  } catch (error) {
    notes.value.splice(index, 0, note);
    liveMessage.value = getApiErrorMessage(error, 'Could not delete the note.');
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Notes</h1>
        <p class="page-subtitle">Capture ideas and keep the important ones close at hand.</p>
      </div>
    </div>

    <div class="stats stats--notes">
      <div class="card stat">
        <div class="stat__label">Total notes</div>
        <div class="stat__value">{{ total }}</div>
      </div>
      <div class="card stat stat--done">
        <div class="stat__label">Pinned</div>
        <div class="stat__value">{{ pinnedCount }}</div>
      </div>
      <div class="card stat stat--active">
        <div class="stat__label">Others</div>
        <div class="stat__value">{{ total - pinnedCount }}</div>
      </div>
    </div>

    <section class="card panel section" aria-label="Add a note">
      <form @submit.prevent="addNote">
        <textarea
          v-model="newContent"
          class="textarea"
          :maxlength="MAX_LENGTH"
          rows="3"
          placeholder="Write a note..."
          aria-label="New note content"
          :disabled="saving"
          @keydown.ctrl.enter.prevent="addNote"
          @keydown.meta.enter.prevent="addNote"
        />
        <div class="composer composer--footer">
          <span class="note-card__counter">{{ newContent.trim().length }}/{{ MAX_LENGTH }}</span>
          <button type="submit" class="btn btn-primary" :disabled="saving || !newContent.trim()">
            <AppIcon name="plus" :size="17" />
            {{ saving ? 'Saving...' : 'Save note' }}
          </button>
        </div>
      </form>
    </section>

    <section class="section" aria-label="Saved notes">
      <div class="section-head">
        <h2 class="section-title">Your notes</h2>
        <div class="filters" role="group" aria-label="Filter notes">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="filter-btn"
            :aria-pressed="filter === option.value"
            @click="filter = option.value"
          >
            {{ option.label }}
            <span class="filter-btn__count">{{ option.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="loadError" class="alert" role="alert">
        <AppIcon name="alert" :size="19" />
        <div class="alert__body"><p>{{ loadError }}</p></div>
        <button type="button" class="btn btn-sm" @click="loadNotes">Retry</button>
      </div>

      <div v-else-if="loading" class="note-grid" aria-busy="true" aria-label="Loading notes">
        <div v-for="index in 3" :key="index" class="card note-card">
          <div class="skeleton skeleton-row__line--short" style="height: 12px; width: 30%" />
          <div class="skeleton" style="height: 14px; width: 100%" />
          <div class="skeleton" style="height: 14px; width: 80%" />
          <div class="skeleton" style="height: 14px; width: 55%" />
        </div>
      </div>

      <div v-else-if="!visibleNotes.length" class="card">
        <EmptyState
          :icon="filter === 'pinned' ? 'pin' : 'note'"
          :title="filter === 'pinned' ? 'No pinned notes' : 'No notes yet'"
          :description="
            filter === 'pinned'
              ? 'Pin a note to keep it at the top of your list.'
              : 'Write down your first idea in the box above.'
          "
        />
      </div>

      <div v-else class="note-grid">
        <NoteCard
          v-for="note in visibleNotes"
          :key="note.id"
          :note="note"
          :pending="isPending(note.id)"
          @toggle-pin="togglePin"
          @save="saveContent"
          @remove="deleteNote"
        />
      </div>
    </section>

    <p class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</p>
  </div>
</template>
