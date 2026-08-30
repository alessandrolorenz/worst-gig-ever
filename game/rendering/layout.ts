/**
 * Reference-canvas <-> device-screen mapping.
 *
 * Gameplay is authored once against the 1920x1080 landscape canvas (M3) and
 * scaled to whatever the device gives us. Keeping this pure means tap
 * coordinates and drawn positions are derived from exactly the same numbers,
 * so a hit lands where the player saw the target.
 *
 * Fit mode is "contain": the whole canvas always stays visible, with letterbox
 * bars on aspect ratios that do not match. Nothing gameplay-critical can be
 * cropped off-screen, which matters more for a graybox than edge-to-edge art.
 */
import { REFERENCE_CANVAS } from '../config/stage.ts';

export interface CanvasFit {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
  /**
   * Position of the play surface within the window. Only the web input path
   * needs it: browser events carry viewport coordinates, while React Native
   * touches already arrive relative to the touched view.
   */
  pageX: number;
  pageY: number;
}

export function createViewport(): Viewport {
  return { width: REFERENCE_CANVAS.width, height: REFERENCE_CANVAS.height, pageX: 0, pageY: 0 };
}

export function fitCanvas(viewWidth: number, viewHeight: number): CanvasFit {
  const safeWidth = viewWidth > 0 ? viewWidth : REFERENCE_CANVAS.width;
  const safeHeight = viewHeight > 0 ? viewHeight : REFERENCE_CANVAS.height;
  const scale = Math.min(safeWidth / REFERENCE_CANVAS.width, safeHeight / REFERENCE_CANVAS.height);
  return {
    scale,
    offsetX: (safeWidth - REFERENCE_CANVAS.width * scale) / 2,
    offsetY: (safeHeight - REFERENCE_CANVAS.height * scale) / 2,
    width: REFERENCE_CANVAS.width * scale,
    height: REFERENCE_CANVAS.height * scale,
  };
}

/** Device point (relative to the play surface) -> canvas point. */
export function screenToCanvas(fit: CanvasFit, screenX: number, screenY: number) {
  return {
    x: (screenX - fit.offsetX) / fit.scale,
    y: (screenY - fit.offsetY) / fit.scale,
  };
}

/** Canvas point -> device point. */
export function canvasToScreen(fit: CanvasFit, canvasX: number, canvasY: number) {
  return {
    x: canvasX * fit.scale + fit.offsetX,
    y: canvasY * fit.scale + fit.offsetY,
  };
}
