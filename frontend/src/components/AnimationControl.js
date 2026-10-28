'use client';

import React, { useState } from 'react';
import { sendCommand } from '../lib/api';

const ANIMATIONS = [
  { id: 'rainbow', name: 'Rainbow Wave', icon: '🌈', desc: 'Continuous HSV spectrum flow' },
  { id: 'matrix_rain', name: 'Matrix Rain', icon: '💻', desc: 'Cascading digital code streams' },
  { id: 'fire', name: 'Cyber Flame', icon: '🔥', desc: 'Procedural heat & ember simulation' },
  { id: 'pulse', name: 'Color Breathing', icon: '💓', desc: 'Smooth sinusoidal color swell' },
  { id: 'starfield', name: 'Cyber Sparkle', icon: '✨', desc: 'Twinkling galactic particles' },
  { id: 'color_wipe', name: 'Scanning Wipe', icon: '⚡', desc: 'Radar scanline sweeping the grid' }
];

export default function AnimationControl({ onToast }) {
  const [selectedAnim, setSelectedAnim] = useState('rainbow');
  const [speed, setSpeed] = useState(40);
  const [intensity, setIntensity] = useState(80);
  const [primaryColor, setPrimaryColor] = useState('#00f0ff');
  const [secondaryColor, setSecondaryColor] = useState('#ff007f');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartAnimation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await sendCommand('animation', {
        name: selectedAnim,
        speed: parseInt(speed, 10),
        intensity: parseInt(intensity, 10),
        primaryColor,
        secondaryColor
      });

      onToast({
        type: 'success',
        message: `Playing ${ANIMATIONS.find(a => a.id === selectedAnim)?.name}! ID: ${res.command?.id?.substring(0, 16)}...`
      });
    } catch (err) {
      onToast({
        type: 'error',
        message: err.message || 'Failed to start animation'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel-card" onSubmit={handleStartAnimation}>
      {/* Animation Selection Cards */}
      <div className="form-group">
        <label className="form-label">Select Animation Profile</label>
        <div className="animation-cards-grid">
          {ANIMATIONS.map((anim) => (
            <div
              key={anim.id}
              className={`anim-card ${selectedAnim === anim.id ? 'selected' : ''}`}
              onClick={() => setSelectedAnim(anim.id)}
            >
              <div className="anim-icon">{anim.icon}</div>
              <div className="anim-name">{anim.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Animation Speed */}
      <div className="form-group">
        <label className="form-label">
          <span>Frame Speed</span>
          <span className="form-label-value">{speed} ms / frame (~{Math.round(1000 / speed)} FPS)</span>
        </label>
        <input
          type="range"
          className="slider-control"
          min="15"
          max="120"
          step="5"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
          <span>Hyper Fast (15ms)</span>
          <span>Smooth (40ms)</span>
          <span>Slow (120ms)</span>
        </div>
      </div>

      {/* Animation Intensity */}
      <div className="form-group">
        <label className="form-label">
          <span>Density & Intensity</span>
          <span className="form-label-value">{intensity}%</span>
        </label>
        <input
          type="range"
          className="slider-control"
          min="10"
          max="100"
          step="5"
          value={intensity}
          onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
        />
      </div>

      {/* Color Overrides for Animations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            <span>Primary Color</span>
            <span className="form-label-value">{primaryColor}</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="color"
              className="color-picker-input"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tail / Theme</span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            <span>Secondary Color</span>
            <span className="form-label-value">{secondaryColor}</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="color"
              className="color-picker-input"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accent Glow</span>
          </div>
        </div>
      </div>

      {/* Play Animation Button */}
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? (
          <span>Launching Animation...</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Play Animation on Matrix</span>
          </>
        )}
      </button>
    </form>
  );
}
