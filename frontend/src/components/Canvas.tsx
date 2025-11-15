import React, { useEffect, forwardRef, useRef } from 'react';

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  lineWidth: number;
}

interface CanvasProps {
  isArtist: boolean;
  sendMessage: (message: object) => void;
  color: string;
  brushSize: number;
}

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ isArtist, sendMessage, color, brushSize }, ref) => {
    const drawing = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const pointerIdRef = useRef<number | null>(null);
    const sendBuffer = useRef<Segment[]>([]);
    const lastSendTime = useRef<number>(0);
    const throttleMs = 33; // ~30fps throttling

    useEffect(() => {
      const canvas = (ref as React.RefObject<HTMLCanvasElement>)?.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          // Preserve drawing buffer
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx?.drawImage(canvas, 0, 0);

          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          context.drawImage(tempCanvas, 0, 0);
          context.lineCap = 'round'; // Re-apply styles after resize
        }
      };

      const resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(canvas.parentElement!);
      resizeCanvas();

      return () => resizeObserver.disconnect();
    }, [ref]);

    useEffect(() => {
      const canvas = (ref as React.RefObject<HTMLCanvasElement>)?.current;
      const context = canvas?.getContext('2d');
      if (context) {
        context.strokeStyle = color;
        context.lineWidth = brushSize;
        context.lineJoin = 'round';
        context.lineCap = 'round';
      }
    }, [color, brushSize, ref]);

    // Draw a smooth curve between points using a quadratic bezier
    const drawSmooth = (ctx: CanvasRenderingContext2D, p0: { x: number; y: number }, p1: { x: number; y: number }) => {
      // Use midpoint as end point for quadratic control
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      ctx.stroke();
      ctx.closePath();
    };

    // Throttled sender: send latest segment from buffer every throttleMs
    const scheduleSend = () => {
      const now = performance.now();
      if (now - lastSendTime.current >= throttleMs) {
        const buf = sendBuffer.current;
        if (buf.length > 0) {
          const seg = buf[buf.length - 1]; // send most recent segment (delta compression)
          try {
            sendMessage({ type: 'drawing_data', data: seg });
          } catch (e) {
            // sendMessage should handle socket errors; swallow here
          }
          sendBuffer.current = [];
          lastSendTime.current = now;
        }
      } else {
        // schedule a timeout to attempt later if not already scheduled
        if ((scheduleSend as any)._timer) return;
        const wait = throttleMs - (now - lastSendTime.current);
        (scheduleSend as any)._timer = window.setTimeout(() => {
          (scheduleSend as any)._timer = null;
          scheduleSend();
        }, wait);
      }
    };

    useEffect(() => {
      const canvas = (ref as React.RefObject<HTMLCanvasElement>)?.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const getPos = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const onPointerDown = (e: PointerEvent) => {
        if (!isArtist) return;
        // Only respond to primary button/touch
        if (e.isPrimary === false) return;
        drawing.current = true;
        pointerIdRef.current = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        const pos = getPos(e);
        lastPoint.current = pos;
        if (ctx) {
          ctx.strokeStyle = color;
          ctx.lineWidth = brushSize;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isArtist) return;
        if (!drawing.current) return;
        if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
        const pos = getPos(e);
        const lp = lastPoint.current;
        if (!ctx || !lp) {
          lastPoint.current = pos;
          return;
        }

        // draw locally using smoothing
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        drawSmooth(ctx, lp, pos);

        // enqueue segment for sending (raw delta)
        sendBuffer.current.push({ x0: lp.x, y0: lp.y, x1: pos.x, y1: pos.y, color, lineWidth: brushSize });
        lastPoint.current = pos;

        scheduleSend();
      };

      const endDrawing = (e?: PointerEvent) => {
        if (!isArtist) return;
        if (!drawing.current) return;
        drawing.current = false;
        if (e && pointerIdRef.current !== null) {
          try {
            (canvas as any).releasePointerCapture(pointerIdRef.current);
          } catch {}
        }
        pointerIdRef.current = null;
        lastPoint.current = null;
        // flush remaining segments immediately
        const buf = sendBuffer.current;
        if (buf.length > 0) {
          const seg = buf[buf.length - 1];
          try { sendMessage({ type: 'drawing_data', data: seg }); } catch {}
          sendBuffer.current = [];
          lastSendTime.current = performance.now();
        }
        if (ctx) ctx.closePath();
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrawing);
      window.addEventListener('pointercancel', endDrawing);

      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', endDrawing);
        window.removeEventListener('pointercancel', endDrawing);
      };
    }, [ref, isArtist, color, brushSize, sendMessage]);

    // Render canvas
    return (
      <canvas
        ref={ref}
        className={`w-full h-full touch-none ${isArtist ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        // pointer events handled in effect
      />
    );
  }
);

export default Canvas;
