'use client';

import React, { useState } from 'react';
import { sendCommand } from '../lib/api';

const PRESETS = [
  { label: '10%', val: 25 },
  { label: '25%', val: 64 },
  { label: '50%', val: 128 },
  { label: '75%', val: 192 },
  { label: '100%', val: 255 }
];

export default function BrightnessControl({ onToast }) {
  const [brightness, setBrightness] = useState(128);
  const [isUpdating, setIsUpdating] = useState(false);

  const applyBrightness = async (val) => {
    setIsUpdating(true);
    try {
      await sendCommand('brightness', { value: val });
      onToast({
        type: 'success',
        message: `Brightness set to ${Math.round((val / 255) * 100)}% (${val}/255)`
      });
    } catch (err) {
      onToast({
        type: 'error',
        message: err.message || 'Failed to update brightness'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSliderChange = (e) => {
    setBrightness(parseInt(e.target.value, 10));
  };

  const handleSliderCommit = () => {
    applyBrightness(brightness);
  };

  return (
    <div className="panel-card" style={{ marginBottom: '24px' }}>
      <div className="form-group" style={{ marginBottom: '14px' }}>
        <div className="form-label">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Global Matrix Brightness</span>
          </div>
          <span className="form-label-value">
            {brightness} / 255 ({Math.round((brightness / 255) * 100)}%)
          </span>
        </div>

        <input
          type="range"
          className="slider-control"
          min="5"
          max="255"
          value={brightness}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`tool-btn ${brightness === p.val ? 'active' : ''}`}
              onClick={() => {
                setBrightness(p.val);
                applyBrightness(p.val);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '6px 14px' }}
          onClick={() => applyBrightness(brightness)}
          disabled={isUpdating}
        >
          {isUpdating ? 'Applying...' : 'Apply Brightness'}
        </button>
      </div>
    </div>
  );
}
