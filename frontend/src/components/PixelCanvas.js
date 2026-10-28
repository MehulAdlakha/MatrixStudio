'use client';

import React, { useState, useRef } from 'react';
import {
  MATRIX_WIDTH,
  MATRIX_HEIGHT,
  TOTAL_LEDS,
  createEmptyGrid,
  processImageFile,
  PIXEL_PRESETS
} from '../lib/imageProcessor';
import { sendCommand } from '../lib/api';

const PALETTE = [
  '#ff007f', '#00f0ff', '#00ff88', '#ffee00',
  '#ff7700', '#9d00ff', '#ffffff', '#000000'
];

export default function PixelCanvas({ pixels, setPixels, onToast }) {
  const [activeColor, setActiveColor] = useState('#00f0ff');
  const [activeTool, setActiveTool] = useState('pencil'); // 'pencil' | 'eraser'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Image processing adjustments
  const [contrast, setContrast] = useState(1.1);
  const [brightness, setBrightness] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const lastUploadedFileRef = useRef(null);

  const hexToRgb = (hex) => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const handlePixelClick = (index) => {
    const updated = [...pixels];
    if (activeTool === 'eraser') {
      updated[index] = [0, 0, 0];
    } else {
      updated[index] = hexToRgb(activeColor);
    }
    setPixels(updated);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    lastUploadedFileRef.current = file;
    try {
      const processed = await processImageFile(file, {
        contrast,
        brightness,
        grayscale,
        threshold: 12
      });
      setPixels(processed);
      onToast({
        type: 'success',
        message: `Image converted to 30x10 LED matrix grid!`
      });
    } catch (err) {
      onToast({
        type: 'error',
        message: err.message || 'Failed to process image'
      });
    }
  };

  const reprocessLastImage = async (newContrast, newBrightness, newGray) => {
    if (!lastUploadedFileRef.current) return;
    try {
      const processed = await processImageFile(lastUploadedFileRef.current, {
        contrast: newContrast,
        brightness: newBrightness,
        grayscale: newGray,
        threshold: 12
      });
      setPixels(processed);
    } catch (err) {
      console.warn('Reprocess error:', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const loadPreset = (presetName) => {
    if (PIXEL_PRESETS[presetName]) {
      const grid = PIXEL_PRESETS[presetName]();
      setPixels(grid);
      onToast({ type: 'success', message: `Loaded preset: ${presetName}` });
    }
  };

  const handleClearCanvas = () => {
    setPixels(createEmptyGrid());
  };

  const handleSendToMatrix = async () => {
    setIsSubmitting(true);
    try {
      const res = await sendCommand('image', { pixels });
      onToast({
        type: 'success',
        message: `Image sent to ESP32! ID: ${res.command?.id?.substring(0, 16)}...`
      });
    } catch (err) {
      onToast({
        type: 'error',
        message: err.message || 'Failed to send image to matrix'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="panel-card">
      {/* Upload Dropzone */}
      <div
        className={`dropzone-container ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />
        <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="dropzone-text">Click or Drag & Drop Image Here</div>
        <div className="dropzone-hint">Automatically downscales & pixelates any PNG, JPG, WebP into 30×10</div>
      </div>

      {/* Adjustments row (if image loaded) */}
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label className="form-label">
            <span>Contrast Boost</span>
            <span className="form-label-value">{contrast.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            className="slider-control"
            min="0.5"
            max="2.5"
            step="0.1"
            value={contrast}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setContrast(val);
              reprocessLastImage(val, brightness, grayscale);
            }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '8px' }}>
          <label className="form-label">
            <span>Brightness Offset</span>
            <span className="form-label-value">{brightness > 0 ? `+${brightness}` : brightness}</span>
          </label>
          <input
            type="range"
            className="slider-control"
            min="-50"
            max="50"
            step="5"
            value={brightness}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setBrightness(val);
              reprocessLastImage(contrast, val, grayscale);
            }}
          />
        </div>
      </div>

      {/* Interactive Canvas Toolbar */}
      <div className="canvas-toolbar" style={{ marginTop: '14px' }}>
        <div className="toolbar-group">
          <button
            type="button"
            className={`tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
            onClick={() => setActiveTool('pencil')}
          >
            ✏️ Pencil
          </button>
          <button
            type="button"
            className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setActiveTool('eraser')}
          >
            🧹 Eraser
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={handleClearCanvas}
          >
            Clear Grid
          </button>
        </div>

        <div className="toolbar-group">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch-btn ${activeColor.toLowerCase() === c.toLowerCase() ? 'selected' : ''}`}
              style={{ backgroundColor: c, width: '24px', height: '24px' }}
              onClick={() => { setActiveColor(c); setActiveTool('pencil'); }}
            />
          ))}
          <input
            type="color"
            className="color-picker-input"
            style={{ width: '28px', height: '28px' }}
            value={activeColor}
            onChange={(e) => { setActiveColor(e.target.value); setActiveTool('pencil'); }}
          />
        </div>
      </div>

      {/* Preset Art Chips */}
      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label className="form-label">Quick Pixel Art Presets</label>
        <div className="options-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <button type="button" className="option-chip" onClick={() => loadPreset('space_invader')}>
            👾 Invader
          </button>
          <button type="button" className="option-chip" onClick={() => loadPreset('cyber_heart')}>
            💖 Heart
          </button>
          <button type="button" className="option-chip" onClick={() => loadPreset('matrix_rain')}>
            🌧️ Rain
          </button>
          <button type="button" className="option-chip" onClick={() => loadPreset('lightning_bolt')}>
            ⚡ Bolt
          </button>
        </div>
      </div>

      {/* Interactive 30x10 Drawing Grid */}
      <div className="matrix-chassis" style={{ marginBottom: '18px' }}>
        <div className="matrix-grid">
          {pixels.map((px, idx) => {
            const isLit = px[0] > 0 || px[1] > 0 || px[2] > 0;
            const col = `rgb(${px[0]}, ${px[1]}, ${px[2]})`;
            return (
              <div
                key={`draw-px-${idx}`}
                className={`matrix-pixel interactive ${isLit ? 'lit' : ''}`}
                style={{
                  backgroundColor: isLit ? col : '#0d1017',
                  color: col,
                  boxShadow: isLit ? `0 0 6px ${col}` : 'none'
                }}
                onClick={() => handlePixelClick(idx)}
              />
            );
          })}
        </div>
      </div>

      {/* Send Image to Matrix Button */}
      <button
        type="button"
        className="btn-primary"
        onClick={handleSendToMatrix}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span>Sending 300 Pixels to ESP32...</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Send Pixel Image to Matrix</span>
          </>
        )}
      </button>
    </div>
  );
}
