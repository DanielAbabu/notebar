import React from 'react';
import { motion } from 'motion/react';

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

/**
 * A reusable modal component with backdrop blur and enter/exit animations.
 */
export function Modal({ children, onClose }: ModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm theme-bg rounded-2xl shadow-2xl overflow-hidden border theme-border"
                onClick={e => e.stopPropagation()}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}
