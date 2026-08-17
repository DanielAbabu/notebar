import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Task, Theme, Drawing, FontChoice } from '../types';
import { storage } from '../lib/storage';

export const INITIAL_NOTES: Note[] = [
    {
        id: 'welcome',
        title: 'Welcome to NoteBar 2.1.0 🚀',
        content: `<h2>Your Personal Side Panel Productivity Hub</h2>
        <p>Welcome! NoteBar is designed for fast, beautiful note-taking directly in your Chrome side panel. Here is a complete guide to everything you can do.</p>
        
        <h3>📝 Note-Taking & Organization</h3>
        <ul>
          <li><p><strong>Rich Text Editing:</strong> Use the toolbar to add headings, bold, italics, lists, and links.</p></li>
          <li><p><strong>Web Clipper:</strong> Highlight any text on a webpage, right-click, and select "Save to NoteBar" to instantly clip it alongside the page URL! You don't even need the side panel open.</p></li>
          <li><p><strong>Pinning:</strong> Click the pin icon in the corner of a note to keep important notes anchored at the top.</p></li>
          <li><p><strong>Archiving:</strong> Don't want to delete a note? Archive it! You can view and restore archived notes and sketches at any time.</p></li>
        </ul>

        <h3>✅ Interactive Tasks</h3>
        <ul>
          <li><p><strong>Syncing Tasks:</strong> Add checkboxes inside your notes using the toolbar. They automatically sync to your global To-Do list!</p></li>
          <li><p><strong>Standalone Tasks:</strong> Add tasks directly in the To-Do tab with High, Medium, or Low priorities.</p></li>
          <li><p><strong>Due Dates & Reminders:</strong> Set due dates and times for tasks. NoteBar will send you a desktop notification when a task is due.</p></li>
          <li><p><strong>Auto-Cleanup:</strong> Completed tasks are automatically cleared after 24 hours to keep your list pristine.</p></li>
        </ul>
        <p><strong>Try it out:</strong></p>
        <ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Check this task to see it sync with your To-Do list!</p></div></li></ul>

        <h3>🎨 Drawing & Sketching</h3>
        <ul>
          <li><p><strong>Blank Canvas:</strong> Switch to the Draw tab to sketch out quick diagrams, wireframes, or doodles.</p></li>
          <li><p><strong>Colors & Strokes:</strong> Choose from an infinite color palette and adjustable stroke widths.</p></li>
          <li><p><strong>Infinite Undo:</strong> Made a mistake? Use the undo and redo buttons freely.</p></li>
        </ul>

        <h3>⚙️ Settings & Customization</h3>
        <ul>
          <li><p><strong>Themes:</strong> Choose between beautiful light and dark modes (Alabaster, Obsidian) or vibrant colors (Rosé, Nord, Evergreen).</p></li>
          <li><p><strong>Typography:</strong> Switch between clean Sans, elegant Serif, or technical Monospace fonts.</p></li>
          <li><p><strong>Data Export:</strong> Export all your notes as a Markdown file, export a single note as HTML, or download a full JSON backup of your entire workspace.</p></li>
        </ul>

        <h3>⚡ Keyboard Shortcuts</h3>
        <ul>
          <li><p><strong>Cmd/Ctrl + K:</strong> Open the Command Palette to quickly search for or create anything.</p></li>
          <li><p><strong>Cmd/Ctrl + N:</strong> Create a new note instantly.</p></li>
          <li><p><strong>Cmd/Ctrl + Shift + T:</strong> Add a new task.</p></li>
          <li><p><strong>Esc:</strong> Close modals, editors, or the command palette.</p></li>
        </ul>

        <p>⚠️ <strong>Privacy First:</strong> Everything you write or draw is stored 100% locally in your browser. We have no servers and collect no data.</p>
        <p><em>Have fun being productive! Made with ❤️ by Daniel Ababu.</em></p>`,
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
    const [syncEnabled, setSyncEnabled] = useState(false);
    const isInitialLoad = useRef(true);

    // Load initial data
    useEffect(() => {
        const init = async () => {
            const data = await storage.getAll();

            // Only use INITIAL_DATA if the key was completely missing (null)
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

    // Listen for background script storage changes
    useEffect(() => {
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.qn_tasks && changes.qn_tasks.newValue) {
                setTasks(changes.qn_tasks.newValue as Task[]);
            }
        };
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
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
