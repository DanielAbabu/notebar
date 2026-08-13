import React, { useState } from 'react';
import { Archive, PenLine, LayoutGrid, List, Sparkles, Clock, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Drawing } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { DrawingThumbnail } from './DrawingThumbnail';

interface DrawingGalleryProps {
    drawings: Drawing[];
    onOpen: (id: string) => void;
    onCreate: () => void;
    onArchive: (id: string) => void;
}

export function DrawingGallery({ drawings, onOpen, onCreate, onArchive }: DrawingGalleryProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    if (drawings.length === 0) {
        return (
            <EmptyState
                icon={<PenLine />}
                title="No sketches yet"
                description="Doodle a diagram, mark up an idea, or just sketch for fun."
                actionLabel="New Sketch"
                onAction={onCreate}
            />
        );
    }

    const sorted = [...drawings].sort((a, b) => b.lastEdited - a.lastEdited);

    return (
        <div className="space-y-4">
            {/* Gallery Control Bar */}
            <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider theme-text-muted">
                        Canvas Gallery ({sorted.length})
                    </span>
                </div>

                <div className="flex items-center gap-1 bg-theme-text/[0.04] p-1 rounded-xl border theme-border">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-theme-text text-theme-bg shadow-xs' : 'theme-text-muted hover:theme-text'}`}
                        title="Grid view"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-theme-text text-theme-bg shadow-xs' : 'theme-text-muted hover:theme-text'}`}
                        title="List view"
                    >
                        <List className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Grid Representation */}
            {viewMode === 'grid' ? (
                <motion.div
                    layout
                    className="grid grid-cols-2 gap-3.5"
                >
                    <AnimatePresence>
                        {sorted.map((d) => {
                            const strokeCount = d.paths?.length || 0;
                            const uniqueColors = Array.from(new Set(d.paths?.map(p => p.color) || [])).slice(0, 4);

                            return (
                                <motion.div
                                    key={d.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => onOpen(d.id)}
                                    className="group relative flex flex-col rounded-2xl theme-card border theme-border overflow-hidden cursor-pointer hover:border-theme-text/30 hover:shadow-xl transition-all duration-300"
                                >
                                    {/* Sketch Canvas Container */}
                                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5">
                                        <DrawingThumbnail drawing={d} />
                                        
                                        {/* Dynamic Backdrop Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-40 group-hover:opacity-60 transition-opacity duration-300" />

                                        {/* Top Pill Badges */}
                                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 border border-white/10">
                                                <Sparkles className="w-2.5 h-2.5" />
                                                {strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}
                                            </span>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); onArchive(d.id); }}
                                                title="Archive sketch"
                                                className="p-1.5 rounded-full bg-black/40 hover:bg-red-500 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                            >
                                                <Archive className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Footer Info */}
                                    <div className="p-3 space-y-1.5 theme-bg border-t theme-border">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-bold theme-text truncate">
                                                {d.title || 'Untitled Sketch'}
                                            </h4>

                                            {/* Color Swatch Dots */}
                                            {uniqueColors.length > 0 && (
                                                <div className="flex items-center -space-x-1 flex-shrink-0">
                                                    {uniqueColors.map((c, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-xs"
                                                            style={{ background: c }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 text-[10px] theme-text-muted">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                {formatDistanceToNowStrict(d.lastEdited, { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            ) : (
                /* List Representation */
                <motion.div
                    layout
                    className="space-y-2.5"
                >
                    <AnimatePresence>
                        {sorted.map((d) => {
                            const strokeCount = d.paths?.length || 0;
                            const uniqueColors = Array.from(new Set(d.paths?.map(p => p.color) || [])).slice(0, 4);

                            return (
                                <motion.div
                                    key={d.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    onClick={() => onOpen(d.id)}
                                    className="group flex items-center gap-3.5 p-3 rounded-2xl theme-card border theme-border cursor-pointer hover:border-theme-text/30 hover:shadow-lg transition-all duration-300"
                                >
                                    {/* Left Preview Box */}
                                    <div className="relative w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 border theme-border">
                                        <DrawingThumbnail drawing={d} />
                                    </div>

                                    {/* Middle Details */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-bold theme-text truncate">
                                                {d.title || 'Untitled Sketch'}
                                            </h4>
                                            <span className="text-[10px] theme-text-muted flex-shrink-0">
                                                {formatDistanceToNowStrict(d.lastEdited, { addSuffix: true })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[10px] theme-text-muted">
                                            <span className="inline-flex items-center gap-1 font-medium">
                                                <Sparkles className="w-3 h-3" />
                                                {strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}
                                            </span>

                                            {uniqueColors.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Palette className="w-3 h-3" />
                                                    <div className="flex items-center -space-x-1">
                                                        {uniqueColors.map((c, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="w-2.5 h-2.5 rounded-full border border-black/20"
                                                                style={{ background: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Action Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onArchive(d.id); }}
                                        title="Archive sketch"
                                        className="p-2 rounded-xl theme-card border theme-border theme-text-muted hover:text-red-500 hover:border-red-500/30 transition-colors opacity-80 group-hover:opacity-100"
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}
