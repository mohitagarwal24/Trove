// A procedural source-connection drawing. Rendering is confined to the landing page.
export function mountConvergence(
  canvas: HTMLCanvasElement,
  progress: () => number,
  failed: () => void,
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  let width = 1,
    height = 1,
    frame = 0,
    visible = false,
    disposed = false;
  const mobile = matchMedia("(max-width: 760px)").matches;
  const count = mobile ? 12 : 24;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const draw = (time: number) => {
    frame = 0;
    if (!visible || disposed || document.hidden) return;
    try {
      context.clearRect(0, 0, width, height);
      const cx = width / 2,
        cy = height * 0.51,
        radius = Math.min(width * 0.47, height * 0.46);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius,
          y = cy + Math.sin(angle) * radius * 0.83;
        const bend = (progress() - 0.5) * radius * 0.4;
        const controlX = cx + Math.cos(angle + 0.6) * radius * 0.55 + bend;
        const controlY = cy + Math.sin(angle + 0.6) * radius * 0.55;
        context.beginPath();
        context.moveTo(x, y);
        context.quadraticCurveTo(controlX, controlY, cx, cy);
        context.strokeStyle = "rgba(196,207,226,.14)";
        context.lineWidth = 0.8;
        context.stroke();
        const t = (time / 8000 + i / count) % 1;
        const px =
          (1 - t) * (1 - t) * x + 2 * (1 - t) * t * controlX + t * t * cx;
        const py =
          (1 - t) * (1 - t) * y + 2 * (1 - t) * t * controlY + t * t * cy;
        context.beginPath();
        context.arc(px, py, 1.5, 0, Math.PI * 2);
        context.fillStyle = i % 4 === 0 ? "#8eaff1" : "#c9d0da";
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    } catch {
      disposed = true;
      failed();
    }
  };
  const start = () => {
    if (!frame && visible && !disposed && !document.hidden)
      frame = requestAnimationFrame(draw);
  };
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  const resizer = new ResizeObserver(() => {
    resize();
    start();
  });
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else start();
  };
  resize();
  observer.observe(canvas);
  resizer.observe(canvas);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizer.disconnect();
    document.removeEventListener("visibilitychange", visibility);
  };
}
