'use client';

import React from 'react';

export default function CommandHistory({ history = [], onDelete, onClearAll }) {
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="panel-card">
      <div className="section-title" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>Active Effect (Running in Loop)</span>
        </div>

        {history.length > 0 && onClearAll && (
          <button
            type="button"
            className="history-clear-all-btn"
            onClick={onClearAll}
            title="Stop effect & clear display"
          >
            Stop Effect
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Matrix is idle. Select an animation, text, or draw above to run.
        </div>
      ) : (
        <div className="history-list">
          {history.slice(0, 1).map((cmd) => (
            <div key={cmd.id} className="history-item" style={{ borderColor: 'rgba(0, 240, 255, 0.25)', background: 'rgba(0, 240, 255, 0.03)' }}>
              <div className="history-info">
                <div className="history-summary">{cmd.summary}</div>
                <div className="history-meta">
                  <span>{cmd.id}</span> • <span>Started {formatTime(cmd.createdAt)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {cmd.acknowledged ? (
                  <span className="ack-badge success" title={`Running on ESP32 in loop`}>
                    ✓ RUNNING IN LOOP
                  </span>
                ) : (
                  <span className="ack-badge pending" title="Sending to ESP32...">
                    ⏳ APPLYING
                  </span>
                )}

                {onDelete && (
                  <button
                    type="button"
                    className="history-delete-btn"
                    onClick={() => onDelete(cmd.id)}
                    title="Stop effect and turn off display"
                    aria-label={`Stop effect ${cmd.id}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
