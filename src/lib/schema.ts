import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  lastEdited: z.number(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  priority: z.enum(['HIGH', 'MED', 'LOW']),
  dueDate: z.string().optional(),
  createdAt: z.number(),
  noteId: z.string().optional(),
  noteTitle: z.string().optional(),
});

export const DrawPathSchema = z.object({
  points: z.array(z.array(z.number())),
  color: z.string(),
  size: z.number(),
  eraser: z.boolean().optional(),
});

export const DrawingSchema = z.object({
  id: z.string(),
  title: z.string(),
  paths: z.array(DrawPathSchema),
  background: z.string(),
  lastEdited: z.number(),
  isArchived: z.boolean().optional(),
});

export const StorageExportSchema = z.object({
  qn_notes: z.array(NoteSchema).optional().nullable(),
  qn_tasks: z.array(TaskSchema).optional().nullable(),
  qn_drawings: z.array(DrawingSchema).optional().nullable(),
  qn_theme: z.string().optional().nullable(),
  qn_font: z.string().optional().nullable(),
});
