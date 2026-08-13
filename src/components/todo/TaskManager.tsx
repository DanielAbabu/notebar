import React, { useState, useMemo } from 'react';
import { User, FileText, Circle, AlertCircle, Calendar, Edit2, Trash2, ChevronRight, ChevronDown, CheckCircle2, ClipboardList } from 'lucide-react';
import { Task } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface TaskManagerProps {
    tasks: Task[];
    toggleTask: (id: string) => void;
    onOpenAddModal: () => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (id: string) => void;
}

/**
 * Manages the display and grouping of tasks.
 * Groups tasks by the note they are associated with, or 'Personal' for standalone tasks.
 */
export function TaskManager({ tasks, toggleTask, onOpenAddModal, onEditTask, onDeleteTask }: TaskManagerProps) {
    const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
    const activeTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    // Group tasks by note
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = { 'Personal': [] };
        activeTasks.forEach(task => {
            const groupName = task.noteTitle || 'Personal';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(task);
        });
        return groups;
    }, [activeTasks]);

    return (
        <div className="space-y-6">
            <div className="space-y-8">
                {activeTasks.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList />}
                        title="All caught up!"
                        description="Your to-do list is empty. Add a new task to stay organized and productive."
                        actionLabel="Add Task"
                        onAction={onOpenAddModal}
                    />
                ) : (
                    Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                        (groupTasks as Task[]).length > 0 && (
                            <div key={groupName} className="space-y-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[13.5px] font-extrabold theme-text-muted uppercase tracking-normal flex items-center gap-2.5">
                                        {groupName === 'Personal' ? <User className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        {groupName}
                                    </h4>
                                    <span className="text-[11px] theme-accent px-2.5 py-1 rounded-md theme-text font-bold">{(groupTasks as Task[]).length}</span>
                                </div>
                                <div className="space-y-3">
                                    {(groupTasks as Task[]).map(task => (
                                        <div key={task.id} className="flex items-center gap-3 p-3.5 theme-card rounded-xl border theme-border group">
                                            <button onClick={() => toggleTask(task.id)} className="theme-text-muted hover:theme-text transition-colors">
                                                <Circle className="w-5 h-5" />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span className="block text-sm font-medium theme-text truncate">{task.text}</span>
                                                {task.dueDate && (() => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);

                                                    const parts = task.dueDate.split('-');
                                                    const due = parts.length === 3
                                                        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
                                                        : new Date(task.dueDate);
                                                    due.setHours(0, 0, 0, 0);

                                                    const isOverdue = due < today;
                                                    const isToday = due.getTime() === today.getTime();

                                                    return (
                                                        <span className={`flex items-center gap-1 text-[10px] mt-1 ${isOverdue ? 'text-red-500 font-bold' : isToday ? 'text-amber-500 font-bold' : 'theme-text-muted'}`}>
                                                            {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                                            {isOverdue ? 'Overdue: ' : isToday ? 'Due Today: ' : 'Due: '}
                                                            {due.toLocaleDateString()}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${task.priority === 'HIGH' ? 'border-red-500/50 text-red-500 bg-red-500/5' :
                                                    task.priority === 'MED' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : 'border-theme-border theme-text-muted opacity-60'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onEditTask(task)} className="p-1 hover:theme-accent rounded transition-colors theme-text-muted hover:theme-text">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => onDeleteTask(task.id)} className="p-1 hover:bg-red-500/10 rounded transition-colors text-red-500">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))
                )}

                {completedTasks.length > 0 && (
                    <div>
                        <button
                            onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
                            className="flex items-center gap-2 text-[10px] font-bold theme-text-muted uppercase tracking-normal mb-4 hover:theme-text transition-colors"
                        >
                            {isCompletedCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Completed ({completedTasks.length})
                        </button>

                        {!isCompletedCollapsed && (
                            <div className="space-y-2 opacity-60">
                                {completedTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 group">
                                        <button onClick={() => toggleTask(task.id)} className="theme-text">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <span className="flex-1 text-sm line-through theme-text truncate">{task.text}</span>
                                        <button onClick={() => onDeleteTask(task.id)} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded text-red-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
