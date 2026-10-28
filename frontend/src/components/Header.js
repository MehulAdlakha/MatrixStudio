'use client';

import React, { useState } from 'react';
import { getActiveBackendUrl, setCustomBackendUrl, clearDisplay } from '../lib/api';

export default function Header({ onClear, onToast, isClearing }) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState(getActiveBackendUrl());

  const handleSaveBackendUrl = (e) => {
    e.preventDefault();
    setCustomBackendUrl(backendUrlInput);
    setShowConfigModal(false);
    onToast({
      type: 'success',
      message: `Backend URL updated to: ${backendUrlInput}`
    });
  };

  const handleClearClick = async () => {
    try {
      await clearDisplay();
      if (onClear) onClear();
      onToast({ type: 'success', message: 'Matrix display cleared!' });
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Failed to clear display' });
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24">
              <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
            </svg>
          </div>
          <div>
            <div className="brand-title">MATRIX STUDIO</div>
            <div className="brand-subtitle">
              <span>30 × 10 WS2812 Controller</span>
              <span className="badge-tag">300 LEDs</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowConfigModal(true)}
            title="Configure Backend Host & LAN IP"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Network IP</span>
          </button>

          <button
            type="button"
            className="btn-danger"
            onClick={handleClearClick}
            disabled={isClearing}
            title="Turn off all LEDs on matrix"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            <span>Clear Display</span>
          </button>
        </div>
      </header>

      {/* Network Configuration Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Network & Backend Config</h3>
            <p className="modal-desc">
              Specify your Express backend host address. Use <code>http://localhost:5000</code> when working on the same machine, or your LAN IP (e.g. <code>http://192.168.1.150:5000</code>) when controlling from a smartphone on Wi-Fi.
            </p>
            <form onSubmit={handleSaveBackendUrl}>
              <div className="form-group">
                <label className="form-label" htmlFor="backendUrl">Backend Server URL</label>
                <input
                  id="backendUrl"
                  type="text"
                  className="input-text"
                  value={backendUrlInput}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  placeholder="http://192.168.1.150:5000"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setBackendUrlInput('http://localhost:5000');
                  }}
                >
                  Reset Localhost
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowConfigModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
