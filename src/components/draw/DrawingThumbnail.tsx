import React, { useEffect, useRef } from 'react';
import { Drawing } from '../../types';
import { CANVAS_W, CANVAS_H, renderPaths } from '../../lib/drawing';

export function DrawingThumbnail({ drawing }: { drawing: Drawing }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const scale = 0.5;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        
        canvas.width = CANVAS_W * scale * dpr;
        canvas.height = CANVAS_H * scale * dpr;
        
        ctx.scale(scale * dpr, scale * dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.fillStyle = drawing.background || '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        renderPaths(ctx, drawing.paths || [], CANVAS_W, CANVAS_H);
    }, [drawing]);

    return (
        <canvas
            ref={ref}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ background: drawing.background || '#FFFFFF' }}
        />
    );
}
