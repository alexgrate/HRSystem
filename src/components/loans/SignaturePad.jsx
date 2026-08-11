import { useCallback, useEffect, useRef } from "react";

// Self-contained canvas signature capture — no external dependency. Draws with
// mouse or touch; on each completed stroke, reports the current drawing as a
// PNG data URI via onChange (or null once cleared / before any ink exists).
// This is the sole consent mechanism for Dash loan agreements — there is no
// separate "I agree" checkbox alongside it.
export default function SignaturePad({ onChange, height = 160, className = "" }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const lastPointRef = useRef(null);

  // Size the backing bitmap for the device's pixel ratio so strokes stay
  // crisp, while the CSS size stays whatever the container gives it.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
  }, []);

  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const start = useCallback(
    (e) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawingRef.current = true;
      lastPointRef.current = getPoint(e);
    },
    [getPoint],
  );

  const move = useCallback(
    (e) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const point = getPoint(e);
      const last = lastPointRef.current || point;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
      hasInkRef.current = true;
    },
    [getPoint],
  );

  const end = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (hasInkRef.current) {
      onChange?.(canvasRef.current.toDataURL("image/png"));
    }
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    hasInkRef.current = false;
    onChange?.(null);
  }, [onChange]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: "none" }}
        className="w-full cursor-crosshair rounded-xl border border-line bg-white"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-ink-faint">Sign with your mouse or finger.</p>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-sunken"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
