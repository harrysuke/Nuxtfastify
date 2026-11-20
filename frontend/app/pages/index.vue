<script setup lang="ts">
import type { ListFilter, Task } from '~/types/models';

const API_URL = '/api/tasks';

const tasks = ref<Task[]>([]);
// Starts true so the server-rendered markup and the first client render match.
const loading = ref(true);
const loadError = ref('');
const adding = ref(false);
const pendingIds = ref<number[]>([]);
const newTitle = ref('');
const filter = ref<ListFilter>('all');
const liveMessage = ref('');

async function loadTasks() {
  loading.value = true;
  loadError.value = '';
  try {
    tasks.value = await $fetch<Task[]>(API_URL, { headers: authHeaders() });
  } catch (error) {
    loadError.value = getApiErrorMessage(error, 'Could not load your tasks.');
  } finally {
    loading.value = false;
  }
}

onMounted(loadTasks);

const total = computed(() => tasks.value.length);
const doneCount = computed(() => tasks.value.filter((task) => !!task.completed).length);
const activeCount = computed(() => total.value - doneCount.value);
const progress = computed(() => (total.value ? Math.round((doneCount.value / total.value) * 100) : 0));

const visibleTasks = computed(() => {
  if (filter.value === 'active') return tasks.value.filter((task) => !task.completed);
  if (filter.value === 'done') return tasks.value.filter((task) => !!task.completed);
  return tasks.value;
});

const filterOptions = computed(() => [
  { value: 'all' as const, label: 'All', count: total.value },
  { value: 'active' as const, label: 'Active', count: activeCount.value },
  { value: 'done' as const, label: 'Done', count: doneCount.value },
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

async function addTask() {
  const title = newTitle.value.trim();
  if (!title || adding.value) return;

  adding.value = true;
  const tempId = -Date.now();
  tasks.value.unshift({ id: tempId, title, completed: 0 });
  newTitle.value = '';

  try {
    const created = await $fetch<Task>(API_URL, { method: 'POST', body: { title } });
    const index = tasks.value.findIndex((task) => task.id === tempId);
    if (index >= 0) tasks.value[index] = created;
    liveMessage.value = 'Task added.';
  } catch (error) {
    tasks.value = tasks.value.filter((task) => task.id !== tempId);
    newTitle.value = title;
    liveMessage.value = getApiErrorMessage(error, 'Could not add the task.');
  } finally {
    adding.value = false;
  }
}

async function toggleTask(task: Task) {
  if (isPending(task.id)) return;
  const previous = task.completed;
  task.completed = previous ? 0 : 1;

  try {
    const updated = await withPending(task.id, () =>
      $fetch<Task>(`${API_URL}/${task.id}`, {
        method: 'PUT',
        body: { completed: !!task.completed },
      }),
    );
    task.completed = updated.completed;
    liveMessage.value = updated.completed ? 'Task completed.' : 'Task marked as active.';
  } catch (error) {
    task.completed = previous;
    liveMessage.value = getApiErrorMessage(error, 'Could not update the task.');
  }
}

async function saveTitle({ id, title }: { id: number; title: string }) {
  const task = tasks.value.find((item) => item.id === id);
  if (!task || isPending(id)) return;
  const previous = task.title;
  task.title = title;

  try {
    const updated = await withPending(id, () =>
      $fetch<Task>(`${API_URL}/${id}`, { method: 'PUT', body: { title } }),
    );
    task.title = updated.title;
    liveMessage.value = 'Task renamed.';
  } catch (error) {
    task.title = previous;
    liveMessage.value = getApiErrorMessage(error, 'Could not rename the task.');
  }
}

async function deleteTask(task: Task) {
  if (isPending(task.id)) return;
  const index = tasks.value.findIndex((item) => item.id === task.id);
  if (index < 0) return;
  tasks.value.splice(index, 1);

  try {
    await withPending(task.id, () => $fetch(`${API_URL}/${task.id}`, { method: 'DELETE' }));
    liveMessage.value = 'Task deleted.';
  } catch (error) {
    tasks.value.splice(index, 0, task);
    liveMessage.value = getApiErrorMessage(error, 'Could not delete the task.');
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Tasks</h1>
        <p class="page-subtitle">A clear view of what needs doing, and what is already done.</p>
      </div>
    </div>

    <div class="stats">
      <div class="card stat">
        <div class="stat__label">Total</div>
        <div class="stat__value">{{ total }}</div>
      </div>
      <div class="card stat stat--active">
        <div class="stat__label">Active</div>
        <div class="stat__value">{{ activeCount }}</div>
      </div>
      <div class="card stat stat--done">
        <div class="stat__label">Completed</div>
        <div class="stat__value">{{ doneCount }}</div>
      </div>
    </div>

    <section class="card panel section" aria-label="Add a task">
      <form class="composer" @submit.prevent="addTask">
        <div class="input-wrap">
          <span class="input-wrap__icon" aria-hidden="true"><AppIcon name="plus" :size="19" /></span>
          <input
            v-model="newTitle"
            class="input"
            type="text"
            maxlength="120"
            placeholder="What needs to be done?"
            aria-label="New task title"
            :disabled="adding"
          />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="adding || !newTitle.trim()">
          <AppIcon name="plus" :size="17" />
          {{ adding ? 'Adding...' : 'Add task' }}
        </button>
      </form>

      <div v-if="total" class="progress-wrap">
        <div class="progress-head">
          <span>Progress</span>
          <span>{{ progress }}%</span>
        </div>
        <div
          class="progress"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Task completion"
        >
          <div class="progress__bar" :style="{ width: `${progress}%` }" />
        </div>
      </div>
    </section>

    <section class="section" aria-label="Task list">
      <div class="section-head">
        <h2 class="section-title">Your tasks</h2>
        <div class="filters" role="group" aria-label="Filter tasks">
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
        <button type="button" class="btn btn-sm" @click="loadTasks">Retry</button>
      </div>

      <div v-else-if="loading" class="card" aria-busy="true" aria-label="Loading tasks">
        <div v-for="index in 3" :key="index" class="skeleton-row">
          <div class="skeleton skeleton-row__check" />
          <div class="skeleton skeleton-row__line" :class="{ 'skeleton-row__line--short': index === 3 }" />
        </div>
      </div>

      <div v-else-if="!visibleTasks.length" class="card">
        <EmptyState
          :icon="filter === 'all' ? 'inbox' : filter === 'done' ? 'checkCircle' : 'clock'"
          :title="filter === 'all' ? 'No tasks yet' : filter === 'done' ? 'Nothing completed yet' : 'All caught up!'"
          :description="
            filter === 'all'
              ? 'Add your first task above to get started.'
              : filter === 'done'
                ? 'Tasks you finish will show up here.'
                : 'There are no active tasks left on your list.'
          "
        />
      </div>

      <ul v-else class="card task-list">
        <TaskItem
          v-for="task in visibleTasks"
          :key="task.id"
          :task="task"
          :pending="isPending(task.id)"
          @toggle="toggleTask"
          @save="saveTitle"
          @remove="deleteTask"
        />
      </ul>
    </section>

    <p class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</p>
  </div>
</template>
