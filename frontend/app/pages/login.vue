<script setup lang="ts">
const { user, ready, fetchUser, login, register } = useAuth();

type Mode = 'login' | 'register';

const mode = ref<Mode>('login');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const busy = ref(false);

const canSubmit = computed(() => {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  return validEmail && (mode.value === 'register' ? password.value.length >= 8 : password.value.length > 0);
});

onMounted(async () => {
  if (user.value) {
    await navigateTo('/');
    return;
  }
  if (!ready.value) await fetchUser();
  if (user.value) await navigateTo('/');
});

function switchMode(next: Mode) {
  mode.value = next;
  error.value = '';
  showPassword.value = false;
}

async function submit() {
  if (busy.value || !canSubmit.value) return;
  busy.value = true;
  error.value = '';
  try {
    if (mode.value === 'login') await login(email.value.trim(), password.value);
    else await register(email.value.trim(), password.value);
    await navigateTo('/');
  } catch (err: unknown) {
    error.value = getApiErrorMessage(err, 'Could not sign you in. Please try again.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-page container">
    <div class="auth-layout">
      <aside class="auth-aside" aria-hidden="true">
        <div class="auth-aside__mark"><AppIcon name="check" :size="28" /></div>
        <h2 class="auth-aside__title">Everything in one place.</h2>
        <p class="auth-aside__text">
          Keep your day organised with a simple task list and a home for your ideas.
        </p>
        <ul class="auth-aside__list">
          <li><AppIcon name="checkCircle" :size="19" /> Plan and track your tasks</li>
          <li><AppIcon name="pin" :size="19" /> Pin the notes that matter</li>
          <li><AppIcon name="sparkles" :size="19" /> Works beautifully on any screen</li>
        </ul>
      </aside>

      <section class="card auth-card">
        <div class="auth-card__head">
          <div class="auth-card__mark" aria-hidden="true"><AppIcon name="check" :size="24" /></div>
          <h1 class="page-title">{{ mode === 'login' ? 'Welcome back' : 'Create your account' }}</h1>
          <p class="page-subtitle">
            {{ mode === 'login' ? 'Sign in to pick up where you left off.' : 'Start organising your day in seconds.' }}
          </p>
        </div>

        <div class="segmented" role="group" aria-label="Authentication mode">
          <button
            type="button"
            class="segmented__btn"
            :aria-pressed="mode === 'login'"
            @click="switchMode('login')"
          >
            Log in
          </button>
          <button
            type="button"
            class="segmented__btn"
            :aria-pressed="mode === 'register'"
            @click="switchMode('register')"
          >
            Register
          </button>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <div class="field">
            <label class="field__label" for="email">Email</label>
            <input
              id="email"
              v-model="email"
              class="input"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              :aria-invalid="!!error"
              @input="error = ''"
            />
          </div>

          <div class="field">
            <label class="field__label" for="password">Password</label>
            <div class="password-wrap">
              <input
                id="password"
                v-model="password"
                class="input"
                :type="showPassword ? 'text' : 'password'"
                required
                :minlength="mode === 'register' ? 8 : undefined"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                :placeholder="mode === 'register' ? 'At least 8 characters' : 'Your password'"
                :aria-invalid="!!error"
                @input="error = ''"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <AppIcon :name="showPassword ? 'eyeOff' : 'eye'" :size="18" />
              </button>
            </div>
          </div>

          <div v-if="error" class="alert" role="alert">
            <AppIcon name="alert" :size="18" />
            <div class="alert__body"><p>{{ error }}</p></div>
          </div>

          <button type="submit" class="btn btn-primary auth-submit" :disabled="busy || !canSubmit">
            {{ busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account' }}
          </button>
        </form>

        <p class="auth-switch">
          {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
          <button type="button" class="link-btn" @click="switchMode(mode === 'login' ? 'register' : 'login')">
            {{ mode === 'login' ? 'Register' : 'Log in' }}
          </button>
        </p>
      </section>
    </div>
  </div>
</template>
