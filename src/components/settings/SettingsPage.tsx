import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Palette, Download, Plus, ChevronRight, ChevronLeft, CheckCircle2, Archive, Type, Heart } from 'lucide-react';
import { Note, Task, Theme, FontChoice } from '../../types';
import { StorageExportSchema } from '../../lib/schema';
import { noteToMarkdown } from '../../lib/markdown';

interface SettingsPageProps {
    notes: Note[];
    tasks: Task[];
    currentTheme: Theme;
    setTheme: (t: Theme) => void;
    setNotes: (notes: Note[]) => void;
    setTasks: (tasks: Task[]) => void;
    font: FontChoice;
    setFont: (f: FontChoice) => void;
    archivedCount: number;
    onViewArchive: () => void;
}

const FONT_OPTIONS: { id: FontChoice; label: string; sample: string; stack: string }[] = [
    { id: 'outfit', label: 'Outfit', sample: 'Aa', stack: '"Outfit", ui-sans-serif, system-ui, sans-serif' },
    { id: 'system', label: 'System', sample: 'Aa', stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { id: 'serif', label: 'Serif', sample: 'Aa', stack: 'Georgia, "Iowan Old Style", serif' },
    { id: 'mono', label: 'Mono', sample: 'Aa', stack: 'ui-monospace, "SFMono-Regular", Menlo, monospace' },
];

/**
 * Settings page for app configuration, theme selection, and data management.
 */
export function SettingsPage({ notes, tasks, currentTheme, setTheme, setNotes, setTasks, font, setFont, archivedCount, onViewArchive }: SettingsPageProps) {
    const [activeSubView, setActiveSubView] = useState<'main' | 'themes'>('main');

    const categories = [
        {
            name: 'Essentials',
            themes: [
                { id: 'light', name: 'Alabaster', desc: 'Warm & refined', color: '#FAFAF9', text: '#1C1917' },
                { id: 'dark', name: 'Obsidian', desc: 'Deep & balanced', color: '#121212', text: '#E5E5E5' },
            ]
        },
        {
            name: 'Vibrant',
            themes: [
                { id: 'pink', name: 'Rosé', desc: 'Soft & elegant', color: '#FFF1F2', text: '#881337' },
                { id: 'blue', name: 'Nord', desc: 'Calm & balanced', color: '#ECEFF4', text: '#2E3440' },
                { id: 'green', name: 'Evergreen', desc: 'Fresh & natural', color: '#ECFDF5', text: '#064E3B' },
            ]
        }
    ];

    const handleExportData = () => {
        const data = {
            app: 'NoteBar',
            signature: 'NB_SIG_8291',
            version: '2.1.0',
            exportDate: new Date().toISOString(),
            payload: { notes, tasks }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notebar-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Backup exported');
    };

    const handleExportAllMarkdown = () => {
        if (!notes.length) {
            toast.error('No notes available to export.');
            return;
        }
        const fullContent = notes.map((n) => noteToMarkdown(n)).join('\n\n---\n\n');
        const blob = new Blob([fullContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notebar-all-notes-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Exported all notes as Markdown');
    };

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const rawJson = JSON.parse(content);

                let importedNotes: Note[] = [];
                let importedTasks: Task[] = [];

                if (rawJson.payload) {
                    importedNotes = rawJson.payload.notes || [];
                    importedTasks = rawJson.payload.tasks || [];
                } else {
                    const validationResult = StorageExportSchema.safeParse(rawJson);
                    if (!validationResult.success) {
                        toast.error('Invalid backup format schema.');
                        return;
                    }
                    importedNotes = (validationResult.data.qn_notes || []) as Note[];
                    importedTasks = (validationResult.data.qn_tasks || []) as Task[];
                }

                if (confirm(`Import ${importedNotes.length} notes and ${importedTasks.length} tasks? Existing data will be preserved.`)) {
                    const existingNoteIds = new Set(notes.map(n => n.id));
                    const existingTaskIds = new Set(tasks.map(t => t.id));

                    const newNotes = [...notes, ...importedNotes.filter((n: any) => !existingNoteIds.has(n.id))];
                    const newTasks = [...tasks, ...importedTasks.filter((t: any) => !existingTaskIds.has(t.id))];

                    setNotes(newNotes);
                    setTasks(newTasks);
                    toast.success('Data imported successfully');
                }
            } catch (err) {
                toast.error('Error parsing JSON — please ensure the file is valid.');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="px-6 py-8 pb-32 space-y-10">
            <AnimatePresence mode="wait">
                {activeSubView === 'main' ? (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-10"
                    >
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black theme-text tracking-tight">Settings</h2>
                            <p className="text-xs theme-text-muted font-medium">Manage your data and appearance.</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setActiveSubView('themes')}
                                className="w-full flex items-center justify-between p-5 theme-card rounded-2xl border theme-border hover:border-theme-text/30 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-theme-text/5 flex items-center justify-center">
                                        <Palette className="w-5 h-5 theme-text" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-sm font-bold theme-text">Appearance</h4>
                                        <p className="text-[11px] theme-text-muted">Theme & typography</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 theme-text-muted group-hover:theme-text transition-colors" />
                            </button>

                            <button
                                onClick={onViewArchive}
                                className="w-full flex items-center justify-between p-5 theme-card rounded-2xl border theme-border hover:border-theme-text/30 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-theme-text/5 flex items-center justify-center">
                                        <Archive className="w-5 h-5 theme-text" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-sm font-bold theme-text">Archive</h4>
                                        <p className="text-[11px] theme-text-muted">Archived notes and sketches</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {archivedCount > 0 && (
                                        <span className="text-[11px] font-bold theme-accent px-2 py-0.5 rounded-md theme-text">{archivedCount}</span>
                                    )}
                                    <ChevronRight className="w-4 h-4 theme-text-muted group-hover:theme-text transition-colors" />
                                </div>
                            </button>

                            <a
                                href="https://chromewebstore.google.com/detail/NoteBar/cilnoeoidokldchckigcohjgdfhmmehp/reviews"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between p-5 theme-card rounded-2xl border theme-border hover:border-theme-text/30 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-theme-text/5 flex items-center justify-center">
                                        <Heart className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-sm font-bold theme-text">Rate NoteBar</h4>
                                        <p className="text-[11px] theme-text-muted">Rate it if u love it!</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 theme-text-muted group-hover:theme-text transition-colors" />
                            </a>

                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleExportData}
                                    className="flex flex-col items-center justify-center p-3 theme-card rounded-2xl border theme-border hover:border-theme-text/30 transition-all group gap-1.5"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-theme-text/5 flex items-center justify-center">
                                        <Download className="w-3.5 h-3.5 theme-text" />
                                    </div>
                                    <span className="text-[9px] font-bold theme-text uppercase tracking-wider">Export JSON</span>
                                </button>

                                <button
                                    onClick={handleExportAllMarkdown}
                                    className="flex flex-col items-center justify-center p-3 theme-card rounded-2xl border theme-border hover:border-theme-text/30 transition-all group gap-1.5"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-theme-text/5 flex items-center justify-center">
                                        <Download className="w-3.5 h-3.5 theme-text" />
                                    </div>
                                    <span className="text-[9px] font-bold theme-text uppercase tracking-wider">Export .MD</span>
                                </button>

                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportData}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center justify-center p-3 theme-card rounded-2xl border theme-border hover:border-theme-text/30 transition-all group gap-1.5 h-full">
                                        <div className="w-7 h-7 rounded-lg bg-theme-text/5 flex items-center justify-center">
                                            <Plus className="w-3.5 h-3.5 theme-text" />
                                        </div>
                                        <span className="text-[9px] font-bold theme-text uppercase tracking-wider">Import JSON</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <p className="text-[14px] theme-text-muted italic px-2 mt-4 text-center">
                            Version 2.1.0 • Made with love by <a href="https://www.linkedin.com/in/danielababu/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors font-semibold">Daniel Ababu</a>.
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="themes"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setActiveSubView('main')}
                                className="p-2 hover:theme-card rounded-full transition-colors theme-text-muted hover:theme-text"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-black theme-text tracking-tight">Appearance</h2>
                        </div>

                        <div className="space-y-8">
                            {categories.map((cat) => (
                                <div key={cat.name} className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] theme-text-muted px-1">{cat.name}</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {cat.themes.map((t) => (
                                            <motion.button
                                                key={t.id}
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setTheme(t.id as Theme)}
                                                className={`relative group flex flex-col items-stretch text-left rounded-2xl border transition-all duration-300 overflow-hidden ${currentTheme === t.id
                                                    ? 'border-theme-text shadow-[0_12px_30px_-10px_rgba(0,0,0,0.2)]'
                                                    : 'border-theme-border hover:border-theme-text/30 bg-theme-card/50'
                                                    }`}
                                            >
                                                <div
                                                    className="h-16 flex items-end px-4 pb-3"
                                                    style={{ backgroundColor: t.color }}
                                                >
                                                    <div className="flex gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.text, opacity: 0.2 }} />
                                                        <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: t.text, opacity: 0.2 }} />
                                                    </div>
                                                </div>

                                                <div className="p-4 flex items-center justify-between bg-theme-card">
                                                    <div className="space-y-0.5">
                                                        <span className="text-[14px] font-bold theme-text">
                                                            {t.name}
                                                        </span>
                                                        <p className="text-[11px] theme-text-muted font-medium italic">{t.desc}</p>
                                                    </div>
                                                    {currentTheme === t.id ? (
                                                        <div className="w-6 h-6 bg-theme-text rounded-full flex items-center justify-center">
                                                            <CheckCircle2 className="w-4 h-4 text-theme-bg" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 border theme-border rounded-full group-hover:border-theme-text/30 transition-colors" />
                                                    )}
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Typography */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] theme-text-muted px-1">Typography</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {FONT_OPTIONS.map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => setFont(f.id)}
                                            className={`flex items-center gap-3 p-4 theme-card rounded-2xl border transition-all ${font === f.id ? 'border-theme-text' : 'theme-border hover:border-theme-text/30'}`}
                                        >
                                            <span className="text-xl theme-text" style={{ fontFamily: f.stack }}>{f.sample}</span>
                                            <span className="text-[12px] font-bold theme-text">{f.label}</span>
                                            {font === f.id && <Type className="w-3.5 h-3.5 theme-text-muted ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
