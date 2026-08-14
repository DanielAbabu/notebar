export interface Note {
  id: string;
  title: string;
  content: string;
  lastEdited: number;
  isPinned: boolean;
  isArchived?: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'HIGH' | 'MED' | 'LOW';
  createdAt: number;
  completedAt?: number;
  dueDate?: string;
  noteId?: string;
  noteTitle?: string;
}

export interface Drawing {
  id: string;
  title: string;
  paths: DrawPath[];
  background: string;
  lastEdited: number;
  isArchived?: boolean;
}

export interface DrawPath {
  points: number[][];
  color: string;
  size: number;
  eraser?: boolean;
}

export type View = 'notes' | 'todo' | 'editor' | 'settings' | 'draw' | 'drawEditor' | 'archive';
export type Theme = 'dark' | 'light' | 'pink' | 'blue' | 'green';
export type FontChoice = 'outfit' | 'system' | 'serif' | 'mono';
