'use client';

import React, { useState } from 'react';
import { sendCommand } from '../lib/api';

const COLOR_PRESETS = [
  { name: 'Cyber Cyan', hex: '#00f0ff' },
  { name: 'Neon Green', hex: '#00ff88' },
  { name: 'Electric Pink', hex: '#ff007f' },
  { name: 'Hot Orange', hex: '#ff7700' },
  { name: 'Cyber Yellow', hex: '#ffee00' },
  { name: 'Purple Ray', hex: '#aa00ff' },
  { name: 'Pure White', hex: '#ffffff' }
];

const SCROLL_MODES = [
  { id: 'scroll_left', label: 'Scroll Left ◀' },
  { id: 'scroll_right', label: 'Scroll Right ▶' },
  { id: 'static', label: 'Static Centered ⏹' },
  { id: 'blink', label: 'Flash / Blink ⚡' },
  { id: 'bounce', label: 'Bounce ◀▶' }
];

const FONT_OPTIONS = [
  { id: 'standard', label: 'Standard 5×7' },
  { id: 'bold', label: 'Cyber Bold' },
  { id: 'mini', label: 'Compact Mini' },
  { id: 'digital', label: 'Digital Clock' }
];

export default function TextControl({ onToast, onLivePreview }) {
  const [text, setText] = useState('MATRIX STUDIO');
  const [color, setColor] = useState('#00f0ff');
  const [bgColor, setBgColor] = useState('#000000');
  const [speed, setSpeed] = useState(60);
  const [mode, setMode] = useState('scroll_left');
  const [font, setFont] = useState('standard');
  const [yOffset, setYOffset] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      onToast({ type: 'error', message: 'Please enter text to display.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendCommand('text', {
        text: text.trim(),
        color,
        bgColor,
        speed: parseInt(speed, 10),
        mode,
        font,
        yOffset: parseInt(yOffset, 10)
      });

      onToast({
        type: 'success',
        message: `Command sent! ID: ${res.command?.id?.substring(0, 16)}...`
      });
    } catch (err) {
      onToast({
        type: 'error',
        message: err.message || 'Failed to send text command'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel-card" onSubmit={handleSubmit}>
      {/* Text Input */}
      <div className="form-group">
        <label className="form-label" htmlFor="matrixTextInput">
          <span>Text Message (max 200 chars)</span>
          <span className="form-label-value">{text.length}/200</span>
        </label>
        <input
          id="matrixTextInput"
          type="text"
          className="input-text"
          value={text}
          maxLength={200}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter message to scroll..."
          required
        />
      </div>

      {/* Font & Style */}
      <div className="form-group">
        <label className="form-label">Font Type</label>
        <div className="options-grid">
          {FONT_OPTIONS.map((f) => (
            <div
              key={f.id}
              className={`option-chip ${font === f.id ? 'selected' : ''}`}
              onClick={() => setFont(f.id)}
            >
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Mode */}
      <div className="form-group">
        <label className="form-label">Movement / Effect Mode</label>
        <div className="options-grid">
          {SCROLL_MODES.map((m) => (
            <div
              key={m.id}
              className={`option-chip ${mode === m.id ? 'selected' : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div className="form-group">
        <label className="form-label">
          <span>Text Color</span>
          <span className="form-label-value">{color}</span>
        </label>
        <div className="color-presets-row">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              className={`color-swatch-btn ${color.toLowerCase() === p.hex.toLowerCase() ? 'selected' : ''}`}
              style={{ backgroundColor: p.hex }}
              title={p.name}
              onClick={() => setColor(p.hex)}
            />
          ))}
          <input
            type="color"
            className="color-picker-input"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            title="Custom Hex Picker"
          />
        </div>
      </div>

      {/* Speed Slider */}
      <div className="form-group">
        <label className="form-label">
          <span>Scrolling Speed Interval</span>
          <span className="form-label-value">{speed} ms / step</span>
        </label>
        <input
          type="range"
          className="slider-control"
          min="20"
          max="250"
          step="5"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
          <span>Fast (20ms)</span>
          <span>Medium (60ms)</span>
          <span>Slow (250ms)</span>
        </div>
      </div>

      {/* Vertical Offset */}
      <div className="form-group">
        <label className="form-label">
          <span>Vertical Alignment Offset</span>
          <span className="form-label-value">{yOffset} px</span>
        </label>
        <input
          type="range"
          className="slider-control"
          min="-2"
          max="3"
          step="1"
          value={yOffset}
          onChange={(e) => setYOffset(parseInt(e.target.value, 10))}
        />
      </div>

      {/* Submit Button */}
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? (
          <span>Sending to ESP32...</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>Send Text to Matrix</span>
          </>
        )}
      </button>
    </form>
  );
}
