import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Task } from '../../types';

interface TaskModalProps {
    onClose: () => void;
    onSave: (data: { text: string, priority: 'HIGH' | 'MED' | 'LOW', dueDate?: string }) => void;
    initialData?: Task;
}

/**
 * Modal for creating or editing a task.
 */
export function TaskModal({ onClose, onSave, initialData }: TaskModalProps) {
    const [text, setText] = useState(initialData?.text || '');
    const [priority, setPriority] = useState<'HIGH' | 'MED' | 'LOW'>(initialData?.priority || 'MED');
    const [dueDate, setDueDate] = useState(initialData?.dueDate || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSave({ text, priority, dueDate });
            onClose();
        }
    };

    return (
        <Modal onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
                <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold theme-text">{initialData ? 'Edit Task' : 'Add New Task'}</h3>
                    <button type="button" onClick={onClose} className="p-1 hover:theme-card rounded-full theme-text-muted">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold theme-text-muted uppercase tracking-widest">Task Description</label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="What needs to be done?"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full theme-card border theme-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-theme-text/30 theme-text"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold theme-text-muted uppercase tracking-widest">Priority</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['LOW', 'MED', 'HIGH'] as const).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`h-9 rounded-xl text-[10px] font-bold border transition-all ${priority === p
                                        ? 'bg-theme-text text-theme-bg border-theme-text'
                                        : 'theme-card theme-text-muted border-theme-border hover:theme-text'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold theme-text-muted uppercase tracking-widest">Due Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 theme-text-muted" />
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full theme-card border theme-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-theme-text/30 theme-text"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="w-full h-11 rounded-xl bg-theme-text text-theme-bg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-black/5"
                >
                    {initialData ? 'Save Changes' : 'Create Task'}
                </button>
            </form>
        </Modal>
    );
}
