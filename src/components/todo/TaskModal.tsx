import React, { useState } from 'react';
import { X, Calendar, Bell } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Task } from '../../types';

interface TaskModalProps {
    onClose: () => void;
    onSave: (data: { text: string, priority: 'HIGH' | 'MED' | 'LOW', dueDate: string, hasReminder: boolean }) => void;
    initialData?: Task;
}

/**
 * Modal for creating or editing a task.
 */
export function TaskModal({ onClose, onSave, initialData }: TaskModalProps) {
    const [text, setText] = useState(initialData?.text || '');
    const [priority, setPriority] = useState<'HIGH' | 'MED' | 'LOW'>(initialData?.priority || 'MED');
    const defaultDate = new Date();
    const defaultDateStr = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const [dueDate, setDueDate] = useState(initialData?.dueDate || defaultDateStr);
    const [hasReminder, setHasReminder] = useState(initialData !== undefined ? !!initialData.hasReminder : true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && dueDate) {
            onSave({ text, priority, dueDate, hasReminder });
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
                                type="datetime-local"
                                required
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full theme-card border theme-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-theme-text/30 theme-text"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 mt-2 rounded-xl theme-card border theme-border">
                        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setHasReminder(!hasReminder)}>
                            <Bell className={`w-4 h-4 ${hasReminder ? 'theme-text' : 'theme-text-muted opacity-50'}`} />
                            <label className="text-[10px] font-bold theme-text-muted uppercase tracking-widest cursor-pointer">
                                Desktop Reminder
                            </label>
                        </div>
                        <button
                            type="button"
                            onClick={() => setHasReminder(!hasReminder)}
                            className={`w-9 h-5 rounded-full relative transition-colors border ${hasReminder ? 'bg-black border-black' : 'bg-gray-400 border-gray-400'}`}
                        >
                            <span className={`absolute top-[1px] left-[1px] w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${hasReminder ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={!text.trim() || !dueDate}
                    className="w-full h-11 rounded-xl bg-theme-text text-theme-bg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-black/5"
                >
                    {initialData ? 'Save Changes' : 'Create Task'}
                </button>
            </form>
        </Modal>
    );
}
