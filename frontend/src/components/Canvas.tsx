import React, { useEffect, forwardRef } from 'react';

interface CanvasProps {
  isArtist: boolean;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  finishDrawing: () => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  color: string;
  brushSize: number;
}

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ isArtist, startDrawing, finishDrawing, draw, color, brushSize }, ref) => {
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
      }
    }, [color, brushSize, ref]);

    return (
      <canvas
        ref={ref}
        className={`w-full h-full ${isArtist ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        onMouseDown={isArtist ? startDrawing : undefined}
        onMouseUp={isArtist ? finishDrawing : undefined}
        onMouseMove={isArtist ? draw : undefined}
        onMouseLeave={isArtist ? finishDrawing : undefined}
      />
    );
  }
);

export default Canvas;
