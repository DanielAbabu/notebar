import React from 'react';

interface NavButtonProps {
    icon: React.ReactElement<{ className?: string; strokeWidth?: number }>;
    label: string;
    active: boolean;
    onClick: () => void;
}

/**
 * Navigation button for the bottom navbar.
 */
export function NavButton({ icon, label, active, onClick }: NavButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-all ${active ? 'theme-text' : 'theme-text-muted hover:theme-text'}`}
        >
            {React.cloneElement(icon, {
                className: 'w-5 h-5',
                strokeWidth: 2
            })}
            <span className={`text-[10px] uppercase tracking-widest font-medium`}>{label}</span>
        </button>
    );
}
