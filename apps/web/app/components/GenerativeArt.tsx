"use client";

import { useEffect, useRef, useCallback } from "react";

type ArtType = "hero" | "convergence" | "grid" | "tree" | "matrix";

interface GenerativeArtProps {
  type: ArtType;
  colors?: string[];
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
}

function seeded(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  colors: string[],
) {
  ctx.clearRect(0, 0, w, h);
  const color = colors[0] || "#003FFF";
  const cols = 60;
  const spacing = w / cols;

  for (let i = 0; i < cols; i++) {
    const x = i * spacing + spacing / 2;
    const heightRatio = 0.3 + seeded(i + 100) * 0.5;
    const lineH = h * heightRatio;
    const baseY = (h - lineH) / 2;
    const sway = Math.sin(t * 0.0005 + i * 0.15) * 2;

    ctx.beginPath();
    ctx.moveTo(x + sway, baseY);
    ctx.lineTo(x + sway, baseY + lineH);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.08 + seeded(i + 200) * 0.12;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawConvergence(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  colors: string[],
) {
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const lineCount = 60;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    const r = Math.min(w, h) * 0.45;
    const drift = Math.sin(t * 0.0008 + i * 0.3) * 5;

    const sx = cx + Math.cos(angle) * r;
    const sy = cy + Math.sin(angle) * r;
    const ex = cx + drift;
    const ey = cy + drift * 0.5;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = colors[0] || "#3B82F6";
    ctx.globalAlpha = 0.12 + seeded(i) * 0.12;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  colors: string[],
) {
  ctx.clearRect(0, 0, w, h);
  const cols = 16;
  const rows = 12;
  const cellW = w / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + cellW / 2;
      const y = r * cellH + cellH / 2;
      const intensity = seeded(r * cols + c + 1000);
      const pulse = Math.sin(t * 0.001 + r * 0.3 + c * 0.2) * 0.5 + 0.5;

      ctx.beginPath();
      ctx.arc(x, y, 1.5 + intensity * 2 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = intensity > 0.7 ? (colors[0] || "#3B82F6") : "#ffffff";
      ctx.globalAlpha = 0.1 + intensity * 0.2 * pulse;
      ctx.fill();
    }
  }

  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, h);
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.03;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(w, r * cellH);
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.03;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  colors: string[],
) {
  ctx.clearRect(0, 0, w, h);
  const drift = Math.sin(t * 0.0006) * 3;

  function branch(x: number, y: number, len: number, angle: number, depth: number) {
    if (depth > 8 || len < 3) return;

    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex + drift * (depth * 0.1), ey);
    ctx.strokeStyle = depth < 4 ? (colors[0] || "#3B82F6") : "#ffffff";
    ctx.globalAlpha = 0.08 + (8 - depth) * 0.03;
    ctx.lineWidth = Math.max(0.5, (8 - depth) * 0.3);
    ctx.stroke();

    const spread = 0.5 + seeded(depth * 100 + Math.round(x)) * 0.3;
    branch(ex, ey, len * 0.68, angle - spread, depth + 1);
    branch(ex, ey, len * 0.68, angle + spread, depth + 1);
  }

  branch(w * 0.5, h * 0.9, h * 0.25, -Math.PI / 2, 0);
  ctx.globalAlpha = 1;
}

function drawMatrix(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  colors: string[],
) {
  ctx.clearRect(0, 0, w, h);
  const cols = 24;
  const spacing = w / cols;

  for (let c = 0; c < cols; c++) {
    const x = c * spacing + spacing / 2;
    const lineH = seeded(c + 2000) * h * 0.8;
    const offset = Math.sin(t * 0.0007 + c * 0.4) * 10;
    const startY = (h - lineH) / 2 + offset;

    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + lineH);
    ctx.strokeStyle = seeded(c + 3000) > 0.7 ? (colors[0] || "#3B82F6") : "#ffffff";
    ctx.globalAlpha = 0.06 + seeded(c + 4000) * 0.14;
    ctx.lineWidth = 1 + seeded(c + 5000) * 1.5;
    ctx.stroke();

    const dots = Math.floor(seeded(c + 6000) * 5) + 2;
    for (let d = 0; d < dots; d++) {
      const dy = startY + seeded(c * 10 + d + 7000) * lineH;
      ctx.beginPath();
      ctx.arc(x, dy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = colors[0] || "#3B82F6";
      ctx.globalAlpha = 0.15 + seeded(c * 10 + d + 8000) * 0.2;
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

const renderers: Record<ArtType, typeof drawHero> = {
  hero: drawHero,
  convergence: drawConvergence,
  grid: drawGrid,
  tree: drawTree,
  matrix: drawMatrix,
};

export default function GenerativeArt({
  type,
  colors = ["#3B82F6", "#10B981"],
  width = 400,
  height = 300,
  animate = true,
  className = "",
}: GenerativeArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const render = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }

      renderers[type](ctx, width, height, t, colors);

      if (animate) {
        rafRef.current = requestAnimationFrame(render);
      }
    },
    [type, width, height, colors, animate],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height }}
    />
  );
}
