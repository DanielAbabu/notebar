import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Image } from '@tiptap/extension-image';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { ChevronLeft, Archive, Heading1, Heading2, Heading3, Bold, Italic, Strikethrough, List as ListIcon, CheckSquare as CheckSquareIcon, Link as LinkIcon, Pin, Download, Code, Image as ImageIcon } from 'lucide-react';
import { Link } from '@tiptap/extension-link';
import { Note } from '../../types';

const lowlight = createLowlight(common);

function stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

interface NoteEditorProps {
    note: Note;
    onUpdate: (n: Note) => void;
    onBack: () => void;
    onArchive: (id: string) => void;
    onExport: (note: Note) => void;
    onTogglePin: (id: string) => void;
}

/**
 * Full-screen rich text editor for notes, built on Tiptap (ProseMirror) rather
 * than raw contentEditable + document.execCommand — execCommand is deprecated
 * and behaves inconsistently across browsers, which was causing the formatting
 * quirks in the old editor. Checkboxes use Tiptap's TaskList/TaskItem nodes,
 * which the task-sync logic in useStorage.ts now reads directly instead of
 * scanning raw <input> elements.
 */
export function NoteEditor({ note, onUpdate, onBack, onArchive, onExport, onTogglePin }: NoteEditorProps) {
    const [title, setTitle] = useState(note?.title || '');
    const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING...'>('SAVED');
    const titleRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const titleRefForSave = useRef(title);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Link.configure({ openOnClick: false }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: 'Start writing…' }),
            Image.configure({ inline: true, allowBase64: true }),
            CodeBlockLowlight.configure({ lowlight }),
        ],
        content: note?.content || '<p></p>',
        autofocus: (note?.title || '').trim() ? 'end' : false,
        editorProps: {
            attributes: {
                class: 'w-full flex-1 bg-transparent focus:outline-none text-base leading-snug theme-text min-h-[500px] prose prose-theme max-w-none',
            },
        },
        onUpdate: () => scheduleSave(),
        onCreate: ({ editor }) => {
            // Defensive: if this note's stored content is malformed HTML that
            // somehow makes it past the parser and into an inconsistent editor
            // state, fail soft by dropping to a plain-text version of the
            // content instead of leaving the note unopenable.
            try {
                editor.getHTML();
            } catch {
                const stripped = stripHtml(note.content || '');
                editor.commands.setContent(`<p>${escapeHtml(stripped)}</p>`);
            }
        },
    });

    useEffect(() => {
        titleRefForSave.current = title;
    }, [title]);

    const saveNote = useCallback(() => {
        if (!editor) return;
        const currentContent = editor.getHTML();
        const currentTitle = titleRefForSave.current;
        if (currentTitle !== note.title || currentContent !== note.content) {
            onUpdate({ ...note, title: currentTitle, content: currentContent });
        }
        setSaveStatus('SAVED');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }, [editor, note, onUpdate]);

    const scheduleSave = useCallback(() => {
        setSaveStatus('SAVING...');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(saveNote, 1000);
    }, [saveNote]);

    // Switching notes: load the new note's content and reset local state.
    useEffect(() => {
        setTitle(note.title || '');
        if (editor) {
            try {
                if (editor.getHTML() !== note.content) {
                    editor.commands.setContent(note.content || '<p></p>');
                }
            } catch {
                editor.commands.setContent(`<p>${escapeHtml(stripHtml(note.content || ''))}</p>`);
            }
        }
        if (!(note.title || '').trim()) {
            setTimeout(() => titleRef.current?.focus(), 50);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [note.id]);

    const saveNoteRef = useRef(saveNote);
    useEffect(() => {
        saveNoteRef.current = saveNote;
    }, [saveNote]);

    // Flush pending changes when the panel closes or loses visibility.
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') saveNoteRef.current();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            saveNoteRef.current();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        scheduleSave();
    };

    const handleDone = () => {
        saveNote();
        onBack();
    };

    const setLink = () => {
        if (!editor) return;
        const url = window.prompt('Enter URL:');
        if (url) editor.chain().focus().setLink({ href: url }).run();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                editor.chain().focus().setImage({ src: result }).run();
            }
        };
        reader.readAsDataURL(file);
    };

    if (!editor) return null;

    return (
        <div className="flex flex-col h-full theme-bg theme-text overflow-y-auto">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />
            <div className="px-6 py-4 flex justify-between items-center border-b theme-border theme-bg z-10">
                <button onClick={handleDone} className="flex items-center gap-1 theme-text-muted hover:theme-text transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-bold">Done</span>
                </button>
                <div className="flex items-center gap-4">
                    <span className={`text-[10px] tracking-widest transition-colors ${saveStatus === 'SAVING...' ? 'text-amber-500' : 'theme-text-muted'}`}>
                        {saveStatus}
                    </span>
                    <button
                        onClick={() => onTogglePin(note.id)}
                        className={`p-2 rounded-xl transition-all ${note.isPinned ? 'bg-theme-text text-theme-bg shadow-lg scale-110' : 'theme-text-muted hover:theme-text hover:bg-theme-text/5'}`}
                        title={note.isPinned ? 'Unpin note' : 'Pin note'}
                    >
                        <Pin className={`w-4 h-4 rotate-45 ${note.isPinned ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-none px-6 py-8 space-y-6">
                <input
                    ref={titleRef}
                    type="text"
                    placeholder="Note Title"
                    value={title}
                    onChange={handleTitleChange}
                    className="w-full bg-transparent text-xl font-bold focus:outline-none placeholder:opacity-20 theme-text"
                />

                <div className="flex items-center gap-4 py-3 border-y theme-border theme-text-muted overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'theme-text bg-theme-text/10' : ''}`}>
                            <Heading1 className="w-4 h-4" />
                        </button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'theme-text bg-theme-text/10' : ''}`}>
                            <Heading2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('heading', { level: 3 }) ? 'theme-text bg-theme-text/10' : ''}`}>
                            <Heading3 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-px h-5 theme-border border-l" />

                    <div className="flex items-center gap-2">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('bold') ? 'theme-text bg-theme-text/10' : ''}`}>
                            <Bold className="w-4 h-4" />
                        </button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('italic') ? 'theme-text bg-theme-text/10' : ''}`}>
                            <Italic className="w-4 h-4" />
                        </button>
                        <button onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('strike') ? 'theme-text bg-theme-text/10' : ''}`}>
                            <Strikethrough className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-px h-5 theme-border border-l" />

                    <div className="flex items-center gap-2">
                        <button onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('bulletList') ? 'theme-text bg-theme-text/10' : ''}`}>
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checkbox" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('taskList') ? 'theme-text bg-theme-text/10' : ''}`}>
                            <CheckSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={setLink} title="Link" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('link') ? 'theme-text bg-theme-text/10' : ''}`}>
                            <LinkIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block" className={`p-2 hover:theme-card rounded-lg transition-colors ${editor.isActive('codeBlock') ? 'theme-text bg-theme-text/10' : ''}`}>
                            <Code className="w-4 h-4" />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} title="Insert Image" className="p-2 hover:theme-card rounded-lg transition-colors theme-text-muted hover:theme-text">
                            <ImageIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <EditorContent editor={editor} />
            </div>

            <div className="px-6 py-4 border-t theme-border flex justify-between items-center text-[10px] theme-text-muted uppercase tracking-widest">
                <div>
                    LAST EDITED: {new Date(note.lastEdited).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(note.lastEdited).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => onExport(note)} title="Export as HTML" className="hover:theme-text transition-colors">
                        <Download className="w-3 h-3" />
                    </button>
                    <button onClick={() => onArchive(note.id)} title="Archive note" className="text-red-500 hover:opacity-80 transition-opacity">
                        <Archive className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
