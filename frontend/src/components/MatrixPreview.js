'use client';

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { MATRIX_WIDTH, MATRIX_HEIGHT } from '../lib/imageProcessor';

function MatrixPreview({ pixels, onPixelClick, isInteractive = false }) {
  const canvasRef = useRef(null);

  // High-performance Canvas Renderer (sub-millisecond 60 FPS drawing)
  const drawMatrix = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, width, height);

    const cellW = width / MATRIX_WIDTH;
    const cellH = height / MATRIX_HEIGHT;
    const radius = Math.min(cellW, cellH) * 0.38;

    for (let y = 0; y < MATRIX_HEIGHT; y++) {
      for (let x = 0; x < MATRIX_WIDTH; x++) {
        const index = y * MATRIX_WIDTH + x;
        const px = pixels && pixels[index] ? pixels[index] : [0, 0, 0];
        const r = px[0] || 0;
        const g = px[1] || 0;
        const b = px[2] || 0;
        const isLit = r > 0 || g > 0 || b > 0;

        const cx = x * cellW + cellW / 2;
        const cy = y * cellH + cellH / 2;

        if (!isLit) {
          // Unlit LED socket & recessed lens
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#0d121c';
          ctx.fill();

          ctx.lineWidth = 1;
          ctx.strokeStyle = '#182030';
          ctx.stroke();
        } else {
          // Lit LED: Outer Soft Glow Bloom
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 1.55, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
          ctx.fill();

          // Lit LED: Vibrant Core
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();

          // Authentic WS2812B Convex Lens Specular Highlight
          ctx.beginPath();
          ctx.arc(cx - radius * 0.28, cy - radius * 0.28, radius * 0.32, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fill();
        }
      }
    }
  }, [pixels]);

  useEffect(() => {
    let animId = requestAnimationFrame(drawMatrix);
    return () => cancelAnimationFrame(animId);
  }, [drawMatrix]);

  // Handle interaction for Canvas pixel painting
  const handleCanvasClick = (e) => {
    if (!isInteractive || !onPixelClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cellW = canvas.width / MATRIX_WIDTH;
    const cellH = canvas.height / MATRIX_HEIGHT;

    const col = Math.floor(clickX / cellW);
    const row = Math.floor(clickY / cellH);

    if (col >= 0 && col < MATRIX_WIDTH && row >= 0 && row < MATRIX_HEIGHT) {
      const index = row * MATRIX_WIDTH + col;
      onPixelClick(index, col, row);
    }
  };

  return (
    <div className="matrix-preview-card">
      <div className="matrix-header-row">
        <div className="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
          </svg>
          <span>Live 30 × 10 LED Matrix Simulator</span>
        </div>
        <div className="matrix-badge-info">
          30 Cols × 10 Rows (300 WS2812B LEDs)
        </div>
      </div>

      <div className="matrix-chassis">
        <canvas
          ref={canvasRef}
          width={1200}
          height={400}
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: '30 / 10',
            display: 'block',
            borderRadius: '8px',
            cursor: isInteractive ? 'crosshair' : 'default'
          }}
          onClick={handleCanvasClick}
        />
      </div>
    </div>
  );
}

export default memo(MatrixPreview);
