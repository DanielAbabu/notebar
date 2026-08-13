import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, CheckSquare, Paintbrush, Plus, Moon, Sun, X } from 'lucide-react';
import { Note, Task, Drawing, Theme } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  tasks: Task[];
  drawings: Drawing[];
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onNewTask: () => void;
  onNewDrawing: () => void;
  onToggleTheme: () => void;
  currentTheme: Theme;
}

export function CommandPalette({
  isOpen,
  onClose,
  notes,
  tasks,
  drawings,
  onSelectNote,
  onNewNote,
  onNewTask,
  onNewDrawing,
  onToggleTheme,
  currentTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredNotes = notes.filter(
    (n) =>
      !n.isArchived &&
      (n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredTasks = tasks.filter((t) =>
    t.text.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDrawings = drawings.filter(
    (d) => !d.isArchived && d.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg theme-card border theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Search Header */}
          <div className="px-4 py-3 border-b theme-border flex items-center gap-3">
            <Search className="w-4 h-4 theme-text-muted flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search notes, tasks, or commands... (Cmd + K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none theme-text placeholder:opacity-40"
            />
            <button onClick={onClose} className="p-1 hover:theme-card rounded-lg theme-text-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results & Actions List */}
          <div className="overflow-y-auto p-2 space-y-4">
            {/* Quick Actions */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider theme-text-muted">Quick Actions</div>
              <button
                onClick={() => { onNewNote(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-theme-text/10 theme-text transition-colors text-left"
              >
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Create New Note</span>
                <span className="ml-auto text-[10px] theme-text-muted font-mono">⌘N</span>
              </button>
              <button
                onClick={() => { onNewTask(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-theme-text/10 theme-text transition-colors text-left"
              >
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <span>Create New Task</span>
                <span className="ml-auto text-[10px] theme-text-muted font-mono">⌘⇧T</span>
              </button>
              <button
                onClick={() => { onNewDrawing(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-theme-text/10 theme-text transition-colors text-left"
              >
                <Paintbrush className="w-4 h-4 text-purple-500" />
                <span>Create New Drawing</span>
              </button>
              <button
                onClick={() => { onToggleTheme(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-theme-text/10 theme-text transition-colors text-left"
              >
                {currentTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                <span>Toggle {currentTheme === 'dark' ? 'Light' : 'Dark'} Theme</span>
              </button>
            </div>

            {/* Notes Results */}
            {filteredNotes.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider theme-text-muted">Notes</div>
                {filteredNotes.slice(0, 5).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { onSelectNote(n.id); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl hover:bg-theme-text/10 theme-text transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 theme-text-muted flex-shrink-0" />
                    <span className="truncate font-medium">{n.title || 'Untitled Note'}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Tasks Results */}
            {filteredTasks.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider theme-text-muted">Tasks</div>
                {filteredTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 text-xs theme-text opacity-90">
                    <CheckSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className={`truncate ${t.completed ? 'line-through opacity-50' : ''}`}>{t.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Drawings Results */}
            {filteredDrawings.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider theme-text-muted">Drawings</div>
                {filteredDrawings.slice(0, 3).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2 text-xs theme-text opacity-90">
                    <Paintbrush className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="truncate font-medium">{d.title || 'Untitled Drawing'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
