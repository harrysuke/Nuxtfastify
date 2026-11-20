export interface Task {
  id: number;
  title: string;
  /** The API stores completion as 0 / 1. */
  completed: number;
}

export interface Note {
  id: number;
  content: string;
  pinned: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
}

export type ListFilter = 'all' | 'active' | 'done';
export type NoteFilter = 'all' | 'pinned';
