export interface Task {
  id: number
  title: string
  completed: number
}

export interface Note {
  id: number
  content: string
  pinned: boolean
}

export interface User {
  id: number
  email: string
}

const BASE = '/api'

function errorMessage(data: unknown, status: number): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const value = (data as { error: unknown }).error
    if (typeof value === 'string' && value) return value
  }
  return `Request failed (${status})`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: init.body
        ? { 'Content-Type': 'application/json', ...(init.headers ?? {}) }
        : init.headers,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }

  // Never let a non-JSON or error response reach component state as "data".
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(errorMessage(data, response.status))
  return data as T
}

export const api = {
  me: () => request<{ user: User }>('/auth/me'),
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),

  listTasks: () => request<Task[]>('/tasks'),
  createTask: (title: string) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
  updateTask: (id: number, patch: { title?: string; completed?: boolean }) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteTask: (id: number) =>
    request<{ deleted: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),

  listNotes: () => request<Note[]>('/notes'),
  createNote: (content: string) =>
    request<Note>('/notes', { method: 'POST', body: JSON.stringify({ content }) }),
  updateNote: (id: number, patch: { content?: string; pinned?: boolean }) =>
    request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteNote: (id: number) =>
    request<{ deleted: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
}

export function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}
