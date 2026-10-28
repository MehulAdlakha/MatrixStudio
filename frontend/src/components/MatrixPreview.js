'use client';

import React from 'react';
import { MATRIX_WIDTH, MATRIX_HEIGHT } from '../lib/imageProcessor';

export default function MatrixPreview({ pixels, onPixelClick, isInteractive = false }) {
  const getPixelStyle = (px) => {
    if (!px) return { backgroundColor: '#0d1017' };
    const [r, g, b] = px;
    if (r === 0 && g === 0 && b === 0) {
      return { backgroundColor: '#0d1017' };
    }
    const colorStr = `rgb(${r}, ${g}, ${b})`;
    return {
      backgroundColor: colorStr,
      color: colorStr,
      boxShadow: `0 0 8px ${colorStr}, 0 0 16px ${colorStr}`
    };
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
        <div className="matrix-grid">
          {Array.from({ length: MATRIX_HEIGHT }).map((_, y) => (
            <React.Fragment key={`row-${y}`}>
              {Array.from({ length: MATRIX_WIDTH }).map((_, x) => {
                const index = y * MATRIX_WIDTH + x;
                const px = pixels && pixels[index] ? pixels[index] : [0, 0, 0];
                const isLit = px[0] > 0 || px[1] > 0 || px[2] > 0;

                return (
                  <div
                    key={`px-${x}-${y}`}
                    className={`matrix-pixel ${isLit ? 'lit' : ''} ${isInteractive ? 'interactive' : ''}`}
                    style={getPixelStyle(px)}
                    title={`(${x}, ${y}) - RGB(${px[0]}, ${px[1]}, ${px[2]})`}
                    onClick={() => isInteractive && onPixelClick && onPixelClick(index, x, y)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
