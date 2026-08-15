import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
  Plus,
  Search,
  FileText,
  CheckSquare,
  AlertCircle,
  Settings as SettingsIcon,
  PenLine,
  Archive as ArchiveIcon,
  ArchiveRestore,
  Trash2,
  ChevronLeft as ChevronLeftIcon,
  FilePlus,
  ListPlus,
  PenTool,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { Note, Task, View, Drawing } from './types';
import { useStorage } from './hooks/useStorage';

// Extracted Components
import { Modal } from './components/common/Modal';
import { NavButton } from './components/common/NavButton';
import { TaskModal } from './components/todo/TaskModal';
import { TaskManager } from './components/todo/TaskManager';
import { SettingsPage } from './components/settings/SettingsPage';
import { EmptyState } from './components/common/EmptyState';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DrawingGallery } from './components/draw/DrawingGallery';
import { DrawingThumbnail } from './components/draw/DrawingThumbnail';
import { CommandPalette } from './components/common/CommandPalette';
import { Pin, StickyNote, Tag } from 'lucide-react';
import { NoteEditor } from './components/editor/NoteEditor';
import { DrawingCanvas } from './components/draw/DrawingCanvas';

/**
 * Lightweight fallback shown while the editor or drawing canvas is transitioning.
 */
function EditorLoading() {
  return (
    <div className="flex-1 flex items-center justify-center theme-bg">
      <div className="w-6 h-6 border-2 border-theme-text/20 border-t-theme-text rounded-full animate-spin" />
    </div>
  );
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getNotePlainText(html: string): string {
  if (!html) return 'No content yet...';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const text = doc.body.textContent || doc.body.innerText || '';
  return text.trim() || 'No content yet...';
}

/**
 * Main Application Component
 * Handles global state, routing (views), and orchestration of main features.
 */
export default function App() {
  const {
    notes,
    setNotes,
    tasks,
    setTasks,
    theme,
    setTheme,
    drawings,
    setDrawings,
    font,
    setFont,
    isLoaded
  } = useStorage();

  // Navigation and UI State
  const [view, setView] = useState<View>('notes');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  /** Extract all hashtags (#tag) from notes */
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      if (n.isArchived) return;
      const combined = `${n.title} ${getNotePlainText(n.content)}`;
      const matches = combined.match(/#[a-zA-Z0-9_]+/g);
      if (matches) {
        matches.forEach((t) => tagSet.add(t.toLowerCase()));
      }
    });
    return Array.from(tagSet);
  }, [notes]);

  /**
   * Auto-delete completed tasks after 24 hours to keep the list clean.
   */
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      setTasks(prev => prev.filter(t => {
        if (t.completed && t.completedAt) {
          return now - t.completedAt < oneDay;
        }
        return true;
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoaded, setTasks]);

  const activeNote = useMemo(() => notes.find(n => String(n.id) === String(activeNoteId)) || null, [notes, activeNoteId]);

  const visibleNotes = useMemo(() => notes.filter(n => !n.isArchived), [notes]);
  const archivedNotes = useMemo(() => notes.filter(n => n.isArchived).sort((a, b) => b.lastEdited - a.lastEdited), [notes]);
  const archivedDrawings = useMemo(() => drawings.filter(d => d.isArchived).sort((a, b) => b.lastEdited - a.lastEdited), [drawings]);

  const filteredNotes = useMemo(() => {
    let list = visibleNotes;
    if (selectedTag) {
      list = list.filter(n => {
        const combined = `${n.title || ''} ${getNotePlainText(n.content)}`.toLowerCase();
        return combined.includes(selectedTag.toLowerCase());
      });
    }
    if (!searchQuery.trim()) return list.sort((a, b) => b.lastEdited - a.lastEdited);
    const q = searchQuery.toLowerCase();
    return list.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      getNotePlainText(n.content).toLowerCase().includes(q)
    ).sort((a, b) => b.lastEdited - a.lastEdited);
  }, [visibleNotes, searchQuery, selectedTag]);

  /**
   * Creates a new blank note and moves to the editor view.
   */
  const handleCreateNote = useCallback(() => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '<p></p>',
      lastEdited: Date.now(),
      isPinned: false,
    };
    setNotes(prev => [newNote, ...(prev || [])]);
    setActiveNoteId(newNote.id);
    setView('editor');
  }, [setNotes]);

  const handleBackFromEditor = useCallback(() => {
    setActiveNoteId(null);
    setView('notes');
  }, []);

  /**
   * Updates an existing note in the global state.
   */
  const handleUpdateNote = useCallback((updatedNote: Note) => {
    setNotes(prev => {
      const exists = prev.find(n => n.id === updatedNote.id);
      if (!exists) return [updatedNote, ...prev];
      return prev.map(n => n.id === updatedNote.id ? { ...updatedNote, lastEdited: Date.now() } : n);
    });
  }, [setNotes]);

  /**
   * Toggles the pinned status of a note.
   */
  const handleTogglePin = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned, lastEdited: Date.now() } : n));
  }, [setNotes]);

  const confirmDeleteNote = (id: string) => {
    setNoteToDelete(id);
    setIsDeleteModalOpen(true);
  };

  /**
   * Archives a note instead of deleting it outright — reversible, with an
   * undo action on the toast for the common case of a misclick.
   */
  const handleArchiveNote = useCallback((id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isArchived: true, lastEdited: Date.now() } : n));
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setView('notes');
    }
    toast('Note archived', {
      action: {
        label: 'Undo',
        onClick: () => setNotes(prev => prev.map(n => n.id === id ? { ...n, isArchived: false } : n)),
      },
    });
  }, [setNotes, activeNoteId]);

  const handleRestoreNote = useCallback((id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isArchived: false, lastEdited: Date.now() } : n));
    toast('Note restored');
  }, [setNotes]);

  /**
   * Permanently deletes a note. Only reachable from the Archive view, since
   * everyday deletion now goes through archive (reversible) instead.
   */
  const handleDeleteNote = useCallback(() => {
    if (noteToDelete) {
      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      if (activeNoteId === noteToDelete) {
        setActiveNoteId(null);
        setView('notes');
      }
      setIsDeleteModalOpen(false);
      setNoteToDelete(null);
      toast('Note permanently deleted');
    }
  }, [noteToDelete, activeNoteId, setNotes]);

  /**
   * Exports a single note as a self-contained HTML file (preserves rich
   * formatting exactly, opens in any browser — no extra conversion step).
   */
  const handleExportNote = useCallback((note: Note) => {
    const safeTitle = (note.title || 'Untitled Note').replace(/[^\w\s-]/g, '').trim() || 'note';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title || 'Untitled Note')}</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;line-height:1.6;color:#1C1917;} h1{font-size:1.5rem;} ul[data-type="taskList"]{list-style:none;padding-left:0;} ul[data-type="taskList"] li{display:flex;gap:.5rem;align-items:flex-start;}</style>
</head><body><h1>${escapeHtml(note.title || 'Untitled Note')}</h1>${note.content}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Note exported');
  }, []);

  /**
   * Helper to sync Chrome Alarms based on task state
   */
  const updateAlarm = (task: Task) => {
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      if (task.hasReminder && !task.completed && task.dueDate) {
        const time = new Date(task.dueDate).getTime();
        chrome.alarms.create(task.id, { when: time });
      } else {
        chrome.alarms.clear(task.id);
      }
    }
  };

  /**
   * Toggles task completion status and syncs with note checkboxes if applicable.
   */
  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.noteId) {
      setNotes(prevNotes => prevNotes.map(note => {
        if (note.id === task.noteId) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(note.content, 'text/html');
          const items = doc.querySelectorAll('li[data-type="taskItem"]');

          const indexStr = id.split('-').pop();
          if (indexStr !== undefined) {
            const index = parseInt(indexStr);
            const item = items[index];
            const checkbox = item?.querySelector('input[type="checkbox"]');
            const nowChecked = !task.completed;
            if (item) {
              item.setAttribute('data-checked', String(nowChecked));
              if (checkbox) {
                if (nowChecked) checkbox.setAttribute('checked', 'checked');
                else checkbox.removeAttribute('checked');
              }
            }
          }
          return { ...note, content: doc.body.innerHTML, lastEdited: Date.now() };
        }
        return note;
      }));
      toast.success(task.completed ? 'Task unchecked' : 'Task completed');
    } else {
      setTasks(tasks.map(t => {
        if (t.id === id) {
          const completed = !t.completed;
          return {
            ...t,
            completed,
            completedAt: completed ? Date.now() : undefined
          };
        }
        return t;
      }));
      
      const updatedTask = tasks.find(t => t.id === id);
      if (updatedTask) {
          updateAlarm({ ...updatedTask, completed: !updatedTask.completed });
      }
      
      const isNowCompleted = !task?.completed;
    }
  };

  const addTask = (taskData: { text: string, priority: 'HIGH' | 'MED' | 'LOW', dueDate: string, hasReminder: boolean }) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      ...taskData,
      completed: false,
      createdAt: Date.now(),
    };
    setTasks([newTask, ...tasks]);
    updateAlarm(newTask);
  };

  const updateTask = (id: string, taskData: Partial<Task>) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...taskData };
        updateAlarm(updated);
        return updated;
      }
      return t;
    }));
  };

  const deleteTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.noteId) {
      setNotes(prevNotes => prevNotes.map(note => {
        if (note.id === task.noteId) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(note.content, 'text/html');
          const items = doc.querySelectorAll('li[data-type="taskItem"]');

          const indexStr = id.split('-').pop();
          if (indexStr !== undefined) {
            const index = parseInt(indexStr, 10);
            if (!isNaN(index) && items[index]) {
              items[index].remove();
            }
          }
          return { ...note, content: doc.body.innerHTML, lastEdited: Date.now() };
        }
        return note;
      }));
    }
    setTasks(prev => prev.filter(t => t.id !== id));
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      chrome.alarms.clear(id);
    }
  }, [tasks, setTasks, setNotes]);

  /**
   * Global Keyboard Shortcuts:
   * - Cmd/Ctrl + N: Create Note
   * - Cmd/Ctrl + Shift + T: Add Task
   * - Esc: Close editor / modals
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (isInput && e.key !== 'Escape') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleCreateNote();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTaskToEdit(null);
        setIsAddTaskModalOpen(true);
      }
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (isDeleteModalOpen) {
          setIsDeleteModalOpen(false);
        } else if (isAddTaskModalOpen) {
          setIsAddTaskModalOpen(false);
        } else if (view === 'editor') {
          handleBackFromEditor();
        } else if (view === 'drawEditor') {
          setActiveDrawingId(null);
          setView('draw');
        } else if (view === 'archive') {
          setView('notes');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateNote, handleBackFromEditor, isDeleteModalOpen, isAddTaskModalOpen, view]);

  /**
   * Creates a blank sketch and opens the drawing editor.
   */
  const handleCreateDrawing = useCallback(() => {
    const newDrawing: Drawing = {
      id: crypto.randomUUID(),
      title: '',
      paths: [],
      background: '#FFFFFF',
      lastEdited: Date.now(),
    };
    setDrawings(prev => [newDrawing, ...prev]);
    setActiveDrawingId(newDrawing.id);
    setView('drawEditor');
  }, [setDrawings]);

  const handleOpenDrawing = useCallback((id: string) => {
    setActiveDrawingId(id);
    setView('drawEditor');
  }, []);

  const handleUpdateDrawing = useCallback((updated: Drawing) => {
    setDrawings(prev => prev.map(d => d.id === updated.id ? updated : d));
  }, [setDrawings]);

  const handleArchiveDrawing = useCallback((id: string) => {
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, isArchived: true, lastEdited: Date.now() } : d));
    if (activeDrawingId === id) {
      setActiveDrawingId(null);
      setView('draw');
    }
    toast('Sketch archived', {
      action: {
        label: 'Undo',
        onClick: () => setDrawings(prev => prev.map(d => d.id === id ? { ...d, isArchived: false } : d)),
      },
    });
  }, [setDrawings, activeDrawingId]);

  const handleRestoreDrawing = useCallback((id: string) => {
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, isArchived: false, lastEdited: Date.now() } : d));
    toast('Sketch restored');
  }, [setDrawings]);

  const handlePermanentDeleteDrawing = useCallback((id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
    toast('Sketch permanently deleted');
  }, [setDrawings]);

  const visibleDrawings = useMemo(() => drawings.filter(d => !d.isArchived), [drawings]);

  const activeDrawing = useMemo(() => drawings.find(d => d.id === activeDrawingId) || null, [drawings, activeDrawingId]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'JUST NOW';
    if (diff < 86400000) return formatDistanceToNowStrict(timestamp, { addSuffix: true }).toUpperCase();
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full theme-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-theme-text/20 border-t-theme-text rounded-full animate-spin" />
          <span className="text-sm theme-text-muted animate-pulse uppercase tracking-widest">Loading Notes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full theme-bg overflow-y-auto relative transition-colors duration-300">
      <main className="flex-1 min-h-0 overflow-y-auto pb-24 pt-8">
        <AnimatePresence mode="wait">
          {view === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pb-32 space-y-6"
            >
              {/* Sticky Glassmorphic Header */}
              <div className="sticky top-0 z-40 backdrop-blur-md bg-theme-bg/85 border-b theme-border px-6 pt-4 pb-3 space-y-3 shadow-xs">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted group-focus-within:theme-text transition-colors" />
                  <input
                    type="text"
                    placeholder="Search notes... (⌘K for command palette)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full theme-card border theme-border rounded-xl py-3 pl-11 pr-11 text-sm focus:outline-none focus:border-theme-text/30 transition-all theme-text shadow-xs"
                  />
                  {(archivedNotes.length + archivedDrawings.length) > 0 && (
                    <button
                      onClick={() => setView('archive')}
                      title="View archive"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg theme-text-muted hover:theme-text hover:theme-card transition-colors"
                    >
                      <ArchiveIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Tag Filtering Bar */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold theme-text-muted mr-1 flex-shrink-0">
                      <Tag className="w-3 h-3" />
                      <span>Tags:</span>
                    </div>
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${!selectedTag ? 'bg-theme-text text-theme-bg' : 'theme-card border theme-border theme-text-muted hover:theme-text'}`}
                    >
                      All
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${selectedTag === tag ? 'bg-theme-text text-theme-bg' : 'theme-card border theme-border theme-text-muted hover:theme-text'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 px-6">
                {searchQuery && filteredNotes.length === 0 ? (
                  <EmptyState
                    icon={<Search />}
                    title="No matches found"
                    description={`We couldn't find any notes matching "${searchQuery}". Try a different term.`}
                  />
                ) : visibleNotes.length === 0 ? (
                  <EmptyState
                    icon={<StickyNote />}
                    title="No notes yet"
                    description="Capture your first brilliant idea, meeting minute, or quick thought right here."
                    actionLabel="Create Note"
                    onAction={handleCreateNote}
                  />
                ) : (
                  <>
                    {/* Pinned Notes Section */}
                    {filteredNotes.some(n => n.isPinned) && (
                      <div className="space-y-1 mb-8">
                        <div className="flex items-center gap-2 px-1 mb-3">
                          <Pin className="w-3 h-3 theme-text-muted rotate-45" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted">Pinned</span>
                        </div>
                        {filteredNotes.filter(n => n.isPinned).map(note => (
                          <div
                            key={note.id}
                            onClick={() => { setActiveNoteId(note.id); setView('editor'); }}
                            className="py-4 border theme-border rounded-2xl cursor-pointer group bg-theme-text/[0.02] hover:bg-theme-text/[0.04] px-6 transition-all mb-2 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-theme-text opacity-20" />
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <h3 className="text-base font-bold theme-text truncate">
                                  {note.title || 'Untitled Note'}
                                </h3>
                                <button
                                  onClick={(e) => handleTogglePin(note.id, e)}
                                  className="p-1 px-2 rounded-lg bg-theme-text text-theme-bg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Pin className="w-3 h-3 fill-current rotate-45" />
                                </button>
                              </div>
                              <span className="text-[10px] theme-text-muted uppercase tracking-wider flex-shrink-0">
                                {formatTime(note.lastEdited)}
                              </span>
                            </div>
                            <p className="text-[12px] theme-text-muted line-clamp-2 leading-relaxed">
                              {getNotePlainText(note.content)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* All Other Notes */}
                    <div className="space-y-1">
                      {filteredNotes.filter(n => !n.isPinned).length > 0 && filteredNotes.some(n => n.isPinned) && (
                        <div className="px-1 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted">Others</span>
                        </div>
                      )}
                      {filteredNotes.filter(n => !n.isPinned).map(note => (
                        <div
                          key={note.id}
                          onClick={() => { setActiveNoteId(note.id); setView('editor'); }}
                          className="py-4 border-b theme-border cursor-pointer group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-6 px-6 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h3 className="text-base font-bold theme-text truncate">
                                {note.title || 'Untitled Note'}
                              </h3>
                              <button
                                onClick={(e) => handleTogglePin(note.id, e)}
                                className="p-1 px-2 rounded-lg hover:bg-theme-text/10 theme-text opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Pin className="w-3 h-3 rotate-45" />
                              </button>
                            </div>
                            <span className="text-[10px] theme-text-muted uppercase tracking-wider flex-shrink-0">
                              {formatTime(note.lastEdited)}
                            </span>
                          </div>
                          <p className="text-[12px] theme-text-muted line-clamp-2 leading-relaxed">
                            {getNotePlainText(note.content)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {view === 'todo' && (
            <motion.div
              key="todo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-4 pb-32"
            >
              <TaskManager
                tasks={tasks}
                toggleTask={toggleTask}
                onOpenAddModal={() => {
                  setTaskToEdit(null);
                  setIsAddTaskModalOpen(true);
                }}
                onEditTask={(task) => {
                  setTaskToEdit(task);
                  setIsAddTaskModalOpen(true);
                }}
                onDeleteTask={deleteTask}
              />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <SettingsPage
                notes={notes}
                tasks={tasks}
                currentTheme={theme}
                setTheme={setTheme}
                setNotes={setNotes}
                setTasks={setTasks}
                font={font}
                setFont={setFont}
                archivedCount={archivedNotes.length + archivedDrawings.length}
                onViewArchive={() => setView('archive')}
              />
            </motion.div>
          )}

          {view === 'draw' && (
            <motion.div
              key="draw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-4 pb-32 space-y-4"
            >
              {archivedDrawings.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setView('archive')}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest theme-text-muted hover:theme-text transition-colors"
                  >
                    <ArchiveIcon className="w-3.5 h-3.5" />
                    Archive ({archivedDrawings.length})
                  </button>
                </div>
              )}
              <DrawingGallery
                drawings={visibleDrawings}
                onOpen={handleOpenDrawing}
                onCreate={handleCreateDrawing}
                onArchive={handleArchiveDrawing}
              />
            </motion.div>
          )}

          {view === 'archive' && (
            <motion.div
              key="archive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-4 pb-32 space-y-8"
            >
              <div className="flex items-center gap-2">
                <button onClick={() => setView('notes')} className="p-1 -ml-1 theme-text-muted hover:theme-text transition-colors">
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold theme-text">Archive</h1>
              </div>

              {archivedNotes.length === 0 && archivedDrawings.length === 0 ? (
                <EmptyState
                  icon={<ArchiveIcon />}
                  title="Nothing archived"
                  description="Notes and sketches you archive will show up here. You can restore them anytime."
                />
              ) : (
                <>
                  {archivedNotes.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted px-1">Notes</span>
                      {archivedNotes.map(note => (
                        <div key={note.id} className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl border theme-border">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold theme-text truncate">{note.title || 'Untitled Note'}</h3>
                            <span className="text-[10px] theme-text-muted uppercase tracking-wider">{formatTime(note.lastEdited)}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => handleRestoreNote(note.id)} title="Restore" className="p-2 rounded-lg hover:theme-card theme-text-muted hover:theme-text transition-colors">
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                            <button onClick={() => confirmDeleteNote(note.id)} title="Delete forever" className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {archivedDrawings.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted px-1">Sketches</span>
                      <div className="grid grid-cols-2 gap-3">
                        {archivedDrawings.map(d => (
                          <div key={d.id} className="relative aspect-[4/3] rounded-2xl overflow-hidden border theme-border">
                            <DrawingThumbnail drawing={d} />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                              <button onClick={() => handleRestoreDrawing(d.id)} title="Restore" className="p-2 rounded-lg bg-white/90 text-black hover:bg-white transition-colors">
                                <ArchiveRestore className="w-4 h-4" />
                              </button>
                              <button onClick={() => { if (confirm('Delete this sketch forever?')) handlePermanentDeleteDrawing(d.id); }} title="Delete forever" className="p-2 rounded-lg bg-white/90 text-red-600 hover:bg-white transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {view === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed inset-0 z-[70] theme-bg flex flex-col"
            >
              {activeNote ? (
                <ErrorBoundary key={activeNote.id} onReset={handleBackFromEditor} resetLabel="Back to notes" message="This note couldn't be opened — it may have some unusual formatting. Your other notes are unaffected.">
                  <Suspense fallback={<EditorLoading />}>
                    <NoteEditor
                      note={activeNote}
                      onUpdate={handleUpdateNote}
                      onBack={handleBackFromEditor}
                      onArchive={handleArchiveNote}
                      onExport={handleExportNote}
                      onTogglePin={handleTogglePin}
                    />
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <EditorLoading />
              )}
            </motion.div>
          )}

          {view === 'drawEditor' && activeDrawing && (
            <motion.div
              key="drawEditor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed inset-0 z-[70] theme-bg flex flex-col"
            >
              <ErrorBoundary key={activeDrawing.id} onReset={() => { setActiveDrawingId(null); setView('draw'); }} resetLabel="Back to sketches" message="This sketch couldn't be opened. Your other sketches are unaffected.">
                <Suspense fallback={<EditorLoading />}>
                  <DrawingCanvas
                    drawing={activeDrawing}
                    onUpdate={handleUpdateDrawing}
                    onBack={() => { setActiveDrawingId(null); setView('draw'); }}
                    onArchive={handleArchiveDrawing}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <Modal onClose={() => setIsDeleteModalOpen(false)}>
            <div className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold theme-text">Delete Forever?</h3>
                <p className="text-sm theme-text-muted">This permanently removes the note — it can't be restored after this.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border theme-border theme-text font-medium hover:theme-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteNote}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}

        {isAddTaskModalOpen && (
          <TaskModal
            onClose={() => {
              setIsAddTaskModalOpen(false);
              setTaskToEdit(null);
            }}
            onSave={(data) => {
              if (taskToEdit) {
                updateTask(taskToEdit.id, data);
              } else {
                addTask(data);
              }
            }}
            initialData={taskToEdit || undefined}
          />
        )}

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          notes={notes}
          tasks={tasks}
          drawings={drawings}
          onSelectNote={(id) => {
            setActiveNoteId(id);
            setView('editor');
          }}
          onNewNote={handleCreateNote}
          onNewTask={() => {
            setTaskToEdit(null);
            setIsAddTaskModalOpen(true);
          }}
          onNewDrawing={handleCreateDrawing}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          currentTheme={theme}
        />
      </AnimatePresence>

      <AnimatePresence>
        {(view === 'notes' || view === 'todo' || view === 'draw') && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="fixed bottom-24 right-5 z-[60]"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={view === 'notes' ? handleCreateNote : view === 'draw' ? handleCreateDrawing : () => {
                setTaskToEdit(null);
                setIsAddTaskModalOpen(true);
              }}
              className="group relative flex items-center gap-2.5 h-13 px-4.5 bg-theme-text text-theme-bg rounded-full shadow-[0_12px_30px_-6px_rgba(0,0,0,0.35)] border border-white/20 backdrop-blur-md overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex items-center justify-center">
                {view === 'notes' ? (
                  <FilePlus className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                ) : view === 'draw' ? (
                  <PenTool className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
                ) : (
                  <ListPlus className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                )}
              </div>

              <span className="relative z-10 text-xs font-bold tracking-wide transition-all">
                {view === 'notes' ? 'New Note' : view === 'draw' ? 'New Canvas' : 'New Task'}
              </span>

              <Sparkles className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity relative z-10" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 h-20 theme-bg border-t theme-border flex items-center justify-around px-4 z-50">
        <NavButton icon={<FileText />} label="Notes" active={view === 'notes' || view === 'editor'} onClick={() => setView('notes')} />
        <NavButton icon={<CheckSquare />} label="To-Do" active={view === 'todo'} onClick={() => setView('todo')} />
        <NavButton icon={<PenLine />} label="Draw" active={view === 'draw' || view === 'drawEditor'} onClick={() => setView('draw')} />
        <NavButton icon={<SettingsIcon />} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
      </nav>
    </div>
  );
}
