import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { ChevronLeft, Archive, Undo2, Eraser, Download, Palette, ChevronDown, Check } from 'lucide-react';
import { Drawing, DrawPath } from '../../types';
import { CANVAS_W, CANVAS_H, renderPaths } from '../../lib/drawing';

interface DrawingCanvasProps {
    drawing: Drawing;
    onUpdate: (d: Drawing) => void;
    onBack: () => void;
    onArchive: (id: string) => void;
}

const SWATCHES = ['#1B1B18', '#B84A3E', '#C9791E', '#2B8C7E', '#5A6BB0', '#8B4FA3', '#D9A441', '#FFFFFF'];
const SIZES = [3, 6, 12, 22];

/**
 * Drawing editor. `drawing.paths` (the prop) is the single source of truth —
 * there's no local ref that mirrors it, so there's no way for the on-screen
 * strokes to fall out of sync with what's actually persisted.
 */
export function DrawingCanvas({ drawing, onUpdate, onBack, onArchive }: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const dprRef = useRef(1);
    const [color, setColor] = useState('#1B1B18');
    const [size, setSize] = useState(6);
    const [eraser, setEraser] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const currentPointsRef = useRef<number[][]>([]);
    const isDrawing = useRef(false);

    const getCtx = () => canvasRef.current?.getContext('2d') || null;
    const getOffscreenCtx = () => offscreenRef.current?.getContext('2d') || null;

    const closePickers = () => {
        if (showColorPicker) setShowColorPicker(false);
        if (showSizePicker) setShowSizePicker(false);
    };

    // One-time setup: size the visible + offscreen canvases to the logical
    // resolution, scaled for device pixel ratio with high image smoothing quality.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        dprRef.current = dpr;

        canvas.width = CANVAS_W * dpr;
        canvas.height = CANVAS_H * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        }

        const off = document.createElement('canvas');
        off.width = CANVAS_W * dpr;
        off.height = CANVAS_H * dpr;
        const offCtx = off.getContext('2d');
        if (offCtx) {
            offCtx.scale(dpr, dpr);
            offCtx.imageSmoothingEnabled = true;
            offCtx.imageSmoothingQuality = 'high';
        }
        offscreenRef.current = off;
    }, []);

    // Re-render the committed (offscreen) layer whenever the paths prop changes
    useEffect(() => {
        const offCtx = getOffscreenCtx();
        const mainCtx = getCtx();
        if (!offCtx || !mainCtx) return;
        offCtx.fillStyle = drawing.background;
        offCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        renderPaths(offCtx, drawing.paths, CANVAS_W, CANVAS_H);
        
        mainCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        mainCtx.drawImage(offscreenRef.current!, 0, 0, CANVAS_W * dprRef.current, CANVAS_H * dprRef.current, 0, 0, CANVAS_W, CANVAS_H);
    }, [drawing.paths, drawing.background]);

    const persist = useCallback((paths: DrawPath[]) => {
        onUpdate({ ...drawing, paths, lastEdited: Date.now() });
    }, [drawing, onUpdate]);

    const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
        const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
        return [x, y, e.pressure || 0.5];
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        closePickers();
        isDrawing.current = true;
        const p = pos(e);
        currentPointsRef.current = [p];
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

        const ctx = getCtx();
        const off = offscreenRef.current;
        if (ctx && off) {
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.drawImage(off, 0, 0, CANVAS_W * dprRef.current, CANVAS_H * dprRef.current, 0, 0, CANVAS_W, CANVAS_H);
            renderPaths(ctx, [{ points: currentPointsRef.current, color, size, eraser }], CANVAS_W, CANVAS_H);
        }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return;
        currentPointsRef.current.push(pos(e));
        const ctx = getCtx();
        const off = offscreenRef.current;
        if (!ctx || !off) return;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(off, 0, 0, CANVAS_W * dprRef.current, CANVAS_H * dprRef.current, 0, 0, CANVAS_W, CANVAS_H);
        renderPaths(ctx, [{ points: currentPointsRef.current, color, size, eraser }], CANVAS_W, CANVAS_H);
    };

    const onPointerUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (currentPointsRef.current.length > 1) {
            persist([...drawing.paths, { points: currentPointsRef.current, color, size, eraser }]);
        }
        currentPointsRef.current = [];
    };

    const undo = () => {
        closePickers();
        if (!drawing.paths.length) return;
        persist(drawing.paths.slice(0, -1));
    };

    const clearAll = () => {
        closePickers();
        if (!confirm('Clear the whole sketch?')) return;
        persist([]);
    };

    const downloadPng = () => {
        closePickers();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `notebar-sketch-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="flex flex-col h-full theme-bg theme-text overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b theme-border theme-bg z-10">
                <button onClick={onBack} className="flex items-center gap-1 theme-text-muted hover:theme-text transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-bold">Done</span>
                </button>
                <div className="flex items-center gap-3">
                    <button onClick={downloadPng} title="Export as PNG" className="p-2 hover:theme-card rounded-lg transition-colors theme-text-muted hover:theme-text">
                        <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => onArchive(drawing.id)} title="Archive sketch" className="p-2 hover:theme-card rounded-lg transition-colors theme-text-muted hover:theme-text">
                        <Archive className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Drawing Toolbar with Click Dropdown Pickers */}
            <div className="px-6 py-3 flex items-center justify-between border-b theme-border overflow-visible relative gap-4 z-20">
                <div className="flex items-center gap-3">
                    {/* Color Selection Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowColorPicker(v => !v); setShowSizePicker(false); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${showColorPicker ? 'bg-theme-text/10 border-theme-text/40 shadow-xs' : 'theme-card border-theme-border hover:border-theme-text/30'}`}
                            title="Choose Color"
                        >
                            <span className="w-4 h-4 rounded-full border border-black/20 shadow-xs" style={{ background: eraser ? '#FFFFFF' : color }} />
                            <span className="text-xs font-bold theme-text uppercase">{eraser ? 'Eraser' : color}</span>
                            <ChevronDown className={`w-3.5 h-3.5 theme-text-muted transition-transform duration-300 ${showColorPicker ? 'rotate-180' : ''}`} />
                        </button>

                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-2 z-40 p-4 theme-card border theme-border rounded-2xl shadow-2xl backdrop-blur-md w-64 space-y-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-muted block">Color Palette</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {SWATCHES.map((hex) => (
                                        <button
                                            key={hex}
                                            onClick={() => { setColor(hex); setEraser(false); setShowColorPicker(false); }}
                                            className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center ${color === hex && !eraser ? 'scale-105 border-theme-text ring-2 ring-theme-text/30 shadow-md' : 'border-theme-border opacity-90 hover:opacity-100 hover:scale-105'}`}
                                            style={{ background: hex }}
                                        >
                                            {color === hex && !eraser && <Check className={`w-4 h-4 ${hex === '#FFFFFF' ? 'text-black' : 'text-white'}`} />}
                                        </button>
                                    ))}
                                </div>
                                <div className="pt-2 border-t theme-border space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider theme-text-muted block">Custom Color Wheel</span>
                                    <HexColorPicker color={color} onChange={(c) => { setColor(c); setEraser(false); }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Visual Stroke Width Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowSizePicker(v => !v); setShowColorPicker(false); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showSizePicker ? 'bg-theme-text/10 border-theme-text/40 shadow-xs' : 'theme-card border-theme-border hover:border-theme-text/30'}`}
                            title="Stroke Weight"
                        >
                            <span
                                className="rounded-full bg-theme-text inline-block transition-all"
                                style={{ width: Math.max(Math.min(size * 0.75, 14), 5), height: Math.max(Math.min(size * 0.75, 14), 5) }}
                            />
                            <ChevronDown className={`w-3.5 h-3.5 theme-text-muted transition-transform duration-300 ${showSizePicker ? 'rotate-180' : ''}`} />
                        </button>

                        {showSizePicker && (
                            <div className="absolute top-full left-0 mt-2 z-40 p-2 theme-card border theme-border rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-1.5">
                                {SIZES.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => { setSize(s); setEraser(false); setShowSizePicker(false); }}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${size === s && !eraser ? 'bg-theme-text text-theme-bg shadow-md scale-105' : 'hover:bg-theme-text/10'}`}
                                        title={`Stroke Weight ${s}`}
                                    >
                                        <span
                                            className={`w-5 rounded-full transition-all ${size === s && !eraser ? 'bg-theme-bg' : 'bg-theme-text'}`}
                                            style={{ height: Math.max(Math.min(s * 0.65, 16), 3) }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Tools: Eraser & Undo */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        onClick={() => { setEraser((v) => !v); closePickers(); }}
                        title="Eraser Tool"
                        className={`p-2 rounded-xl transition-all border ${eraser ? 'bg-theme-text text-theme-bg border-theme-text shadow-md' : 'theme-card border-theme-border theme-text-muted hover:theme-text'}`}
                    >
                        <Eraser className="w-4 h-4" />
                    </button>
                    <button
                        onClick={undo}
                        title="Undo Stroke"
                        className="p-2 rounded-xl theme-card border theme-border transition-colors theme-text-muted hover:theme-text"
                    >
                        <Undo2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={closePickers}>
                <div className="w-full h-full rounded-2xl border theme-border overflow-hidden bg-white dark:bg-zinc-900 shadow-inner" style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}`, maxHeight: '100%' }}>
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full touch-none cursor-crosshair"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                    />
                </div>
            </div>

            <button onClick={clearAll} className="mx-6 mb-6 py-2 rounded-xl border theme-border text-[11px] font-bold uppercase tracking-widest theme-text-muted hover:text-red-500 hover:border-red-500/40 transition-colors">
                Clear sketch
            </button>
        </div>
    );
}
