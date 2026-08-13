import { getStroke } from 'perfect-freehand';
import { DrawPath } from '../types';

export const CANVAS_W = 640;
export const CANVAS_H = 440;

// Standard helper from the perfect-freehand docs: turns the outline points
// getStroke() returns into a smooth SVG path string.
export function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) return '';
  const d = points.reduce<(string | number)[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...points[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

/** Renders a full set of committed strokes onto a canvas 2D context. */
export function renderPaths(ctx: CanvasRenderingContext2D, paths: DrawPath[], w: number, h: number) {
  paths.forEach((path) => {
    if (path.points.length < 1) return;
    const outline = getStroke(path.points, {
      size: path.size,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
    });
    const d = getSvgPathFromStroke(outline);
    if (!d) return;
    ctx.globalCompositeOperation = path.eraser ? 'destination-out' : 'source-over';
    ctx.fillStyle = path.color;
    ctx.fill(new Path2D(d));
  });
  ctx.globalCompositeOperation = 'source-over';
}
