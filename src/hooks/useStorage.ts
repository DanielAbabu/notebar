import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Task, Theme, Drawing, FontChoice } from '../types';
import { storage } from '../lib/storage';

export const INITIAL_NOTES: Note[] = [
    {
        id: 'welcome',
        title: 'Welcome to NoteBar 📝',
        content: `<p>Welcome! NoteBar is designed for fast, beautiful note-taking directly in your side panel.</p>
        <p><strong>Getting started:</strong></p>
        <ul>
          <li><p><strong>Rich text:</strong> use the toolbar to add headings, bold, italics, and lists.</p></li>
          <li><p><strong>Interactive tasks:</strong> add checkboxes in your notes and they automatically appear in your To-Do list.</p></li>
          <li><p><strong>Pinning:</strong> click the pin icon to keep important notes at the top.</p></li>
          <li><p><strong>Drawing:</strong> sketch quick diagrams or doodles in the new Draw tab.</p></li>
          <li><p><strong>Customization:</strong> change themes in the Settings tab to match your aesthetic.</p></li>
        </ul>
        <p><strong>Try it out:</strong></p>
        <ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Check this task to see it sync with your To-Do list!</p></div></li></ul>
        <p>⚠️ <strong>Pro tip:</strong> export your data from Settings before removing the extension, so you never lose your notes.</p>
        <p><em>Everything is stored locally in your browser. Have fun taking notes!</em></p>`,
        lastEdited: Date.now(),
        isPinned: true,
    }
];

export const INITIAL_TASKS: Task[] = [
    { id: 't-initial', text: 'Explore the extension', completed: false, priority: 'MED', createdAt: Date.now() }
];

export function useStorage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [theme, setTheme] = useState<Theme>('light');
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [font, setFont] = useState<FontChoice>('outfit');
    const [isLoaded, setIsLoaded] = useState(false);
    const isInitialLoad = useRef(true);

    // Load initial data
    useEffect(() => {
        const init = async () => {
            const data = await storage.getAll();

            // Only use INITIAL_DATA if the key was completely missing (null)
            // If it's an empty array, it means the user deleted all items and we should respect that
            if (data.qn_notes !== null) setNotes(data.qn_notes);
            else setNotes(INITIAL_NOTES);

            if (data.qn_tasks !== null) setTasks(data.qn_tasks);
            else setTasks(INITIAL_TASKS);

            if (data.qn_theme !== null) setTheme(data.qn_theme);
            else setTheme('light');

            if (data.qn_drawings !== null) setDrawings(data.qn_drawings);
            else setDrawings([]);

            if (data.qn_font !== null) setFont(data.qn_font);
            else setFont('outfit');

            setIsLoaded(true);
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 0);
        };
        init();
    }, []);

    // Sync Note Checkboxes to Tasks
    useEffect(() => {
        if (!isLoaded) return;

        const noteTasks: Task[] = [];
        const parser = new DOMParser();
        notes.forEach(note => {
            const doc = parser.parseFromString(note.content || '', 'text/html');
            const items = doc.querySelectorAll('li[data-type="taskItem"]');

            items.forEach((li, index) => {
                const textHost = li.querySelector(':scope > div') || li;
                const cleanText = (textHost.textContent || '').trim();
                if (!cleanText) return;

                noteTasks.push({
                    id: `note-${note.id}-${index}`,
                    text: cleanText,
                    completed: li.getAttribute('data-checked') === 'true',
                    priority: 'MED',
                    createdAt: note.lastEdited,
                    noteId: note.id,
                    noteTitle: note.title || 'Untitled Note'
                });
            });
        });

        setTasks(prev => {
            const manualTasks = prev.filter(t => !t.noteId);
            const currentNoteTasks = prev.filter(t => t.noteId);
            if (JSON.stringify(currentNoteTasks) === JSON.stringify(noteTasks)) {
                return prev;
            }
            return [...manualTasks, ...noteTasks];
        });
    }, [notes, isLoaded]);

    // Granular Persistence Effects
    useEffect(() => {
        if (!isLoaded || isInitialLoad.current) return;
        storage.set('qn_notes', notes);
    }, [notes, isLoaded]);

    useEffect(() => {
        if (!isLoaded || isInitialLoad.current) return;
        storage.set('qn_tasks', tasks);
    }, [tasks, isLoaded]);

    useEffect(() => {
        if (!isLoaded || isInitialLoad.current) return;
        storage.set('qn_drawings', drawings);
    }, [drawings, isLoaded]);

    useEffect(() => {
        if (!isLoaded || isInitialLoad.current) return;
        storage.set('qn_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme, isLoaded]);

    useEffect(() => {
        if (!isLoaded || isInitialLoad.current) return;
        storage.set('qn_font', font);
        document.documentElement.setAttribute('data-font', font);
    }, [font, isLoaded]);

    // Apply theme/font immediately on load
    useEffect(() => {
        if (!isLoaded) return;
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-font', font);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded]);

    const updateNotes = useCallback((newNotes: Note[] | ((prev: Note[]) => Note[])) => {
        setNotes(newNotes);
    }, []);

    const updateTasks = useCallback((newTasks: Task[] | ((prev: Task[]) => Task[])) => {
        setTasks(newTasks);
    }, []);

    const updateTheme = useCallback((newTheme: Theme) => {
        setTheme(newTheme);
    }, []);

    const updateDrawings = useCallback((newDrawings: Drawing[] | ((prev: Drawing[]) => Drawing[])) => {
        setDrawings(newDrawings);
    }, []);

    const updateFont = useCallback((newFont: FontChoice) => {
        setFont(newFont);
    }, []);

    return {
        notes,
        setNotes: updateNotes,
        tasks,
        setTasks: updateTasks,
        theme,
        setTheme: updateTheme,
        drawings,
        setDrawings: updateDrawings,
        font,
        setFont: updateFont,
        isLoaded
    };
}
