import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
    icon: React.ReactElement<{ className?: string; strokeWidth?: number }>;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * A beautiful empty state component with an illustration and optional action button.
 */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6"
        >
            <div className="relative">
                <div className="absolute inset-0 bg-theme-text/5 blur-3xl rounded-full scale-150" />
                <div className="relative w-20 h-20 rounded-3xl bg-theme-card border theme-border flex items-center justify-center shadow-xl">
                    {React.cloneElement(icon, {
                        className: 'w-10 h-10 theme-text opacity-40',
                        strokeWidth: 1.5
                    })}
                </div>
            </div>

            <div className="space-y-2 max-w-[240px]">
                <h3 className="text-lg font-bold theme-text tracking-tight">{title}</h3>
                <p className="text-xs theme-text-muted leading-relaxed font-medium">
                    {description}
                </p>
            </div>

            {onAction && actionLabel && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onAction}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-theme-text text-theme-bg text-sm font-bold shadow-lg shadow-black/5 hover:opacity-90 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {actionLabel}
                </motion.button>
            )}
        </motion.div>
    );
}
