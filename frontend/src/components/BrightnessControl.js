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
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [isUpdatingMirror, setIsUpdatingMirror] = useState(false);

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

  const toggleMirror = async (axis) => {
    const newX = axis === 'X' ? !mirrorX : mirrorX;
    const newY = axis === 'Y' ? !mirrorY : mirrorY;
    if (axis === 'X') setMirrorX(newX);
    if (axis === 'Y') setMirrorY(newY);

    setIsUpdatingMirror(true);
    try {
      await sendCommand('mirror', { mirrorX: newX, mirrorY: newY });
      onToast({
        type: 'success',
        message: `Mirror set: Horizontal=${newX ? 'ON (Flipped)' : 'OFF'}, Vertical=${newY ? 'ON (Flipped)' : 'OFF'}`
      });
    } catch (err) {
      onToast({
        type: 'error',
        message: err.message || 'Failed to update mirror settings'
      });
    } finally {
      setIsUpdatingMirror(false);
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

      {/* Universal Mirror & Flip Section */}
      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="form-label" style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem' }}>🪞</span>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>Universal Mirror & Flip</span>
          </div>
          <span className="form-label-value" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Applies to text, image & anims
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className={`tool-btn ${mirrorX ? 'active' : ''}`}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: mirrorX ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)',
              background: mirrorX ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255,255,255,0.03)'
            }}
            onClick={() => toggleMirror('X')}
            disabled={isUpdatingMirror}
            title="Mirror horizontally (flip left and right)"
          >
            <span>↔ Flip X</span>
            <span style={{ fontWeight: 700, color: mirrorX ? '#00f0ff' : '#888' }}>{mirrorX ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            className={`tool-btn ${mirrorY ? 'active' : ''}`}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: mirrorY ? '1px solid #ff007f' : '1px solid rgba(255,255,255,0.1)',
              background: mirrorY ? 'rgba(255, 0, 127, 0.18)' : 'rgba(255,255,255,0.03)'
            }}
            onClick={() => toggleMirror('Y')}
            disabled={isUpdatingMirror}
            title="Flip vertically (upside down)"
          >
            <span>↕ Flip Y</span>
            <span style={{ fontWeight: 700, color: mirrorY ? '#ff007f' : '#888' }}>{mirrorY ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
