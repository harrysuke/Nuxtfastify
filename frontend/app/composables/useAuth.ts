import type { AuthUser } from '~/types/models';

export type { AuthUser };

interface AuthResponse {
  user: AuthUser;
}

// Reuse the browser's cookie header when $fetch runs during server-side rendering.
export function authHeaders(): HeadersInit | undefined {
  if (!import.meta.server) return undefined;
  return useRequestHeaders(['cookie']);
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null);
  const ready = useState<boolean>('auth-ready', () => false);

  async function fetchUser() {
    try {
      const result = await $fetch<AuthResponse>('/api/auth/me', {headers: authHeaders()});
      user.value = result.user;
    } catch {
      user.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function login(email: string, password: string) {
    const result = await $fetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: {email, password},
      headers: authHeaders(),
    });
    user.value = result.user;
    ready.value = true;
  }

  async function register(email: string, password: string) {
    const result = await $fetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: {email, password},
      headers: authHeaders(),
    });
    user.value = result.user;
    ready.value = true;
  }

  async function logout() {
    await $fetch('/api/auth/logout', {method: 'POST', headers: authHeaders()});
    user.value = null;
    ready.value = true;
  }

  return {user, ready, fetchUser, login, register, logout};
}
