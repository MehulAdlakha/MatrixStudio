'use client';

import React from 'react';

export default function DeviceStatus({ device }) {
  const isOnline = Boolean(device && device.online);

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const getRssiRating = (rssi) => {
    if (!rssi) return 'Unknown';
    if (rssi >= -60) return 'Excellent';
    if (rssi >= -70) return 'Good';
    if (rssi >= -80) return 'Fair';
    return 'Weak';
  };

  const formatMemory = (bytes) => {
    if (!bytes && bytes !== 0) return '--';
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <section className="device-status-card" aria-label="ESP32 Hardware Status">
      {/* 1. Status */}
      <div className="status-stat-item">
        <div className="status-stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
        </div>
        <div>
          <div className="status-stat-label">ESP32 Status</div>
          <div className="status-stat-value">
            <span className={`status-pulse-dot ${isOnline ? 'online' : 'offline'}`} />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* 2. Device IP */}
      <div className="status-stat-item">
        <div className="status-stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div>
          <div className="status-stat-label">Device IP</div>
          <div className="status-stat-value">
            {device?.ip || (isOnline ? '192.168.x.x' : 'Disconnected')}
          </div>
        </div>
      </div>

      {/* 3. Wi-Fi Signal */}
      <div className="status-stat-item">
        <div className="status-stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <div>
          <div className="status-stat-label">Wi-Fi RSSI</div>
          <div className="status-stat-value">
            {device?.rssi ? `${device.rssi} dBm (${getRssiRating(device.rssi)})` : '--'}
          </div>
        </div>
      </div>

      {/* 4. Free Heap Memory */}
      <div className="status-stat-item">
        <div className="status-stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <div className="status-stat-label">Free RAM</div>
          <div className="status-stat-value">
            {formatMemory(device?.freeHeap)}
          </div>
        </div>
      </div>

      {/* 5. Uptime & FPS */}
      <div className="status-stat-item">
        <div className="status-stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <div className="status-stat-label">Uptime / FPS</div>
          <div className="status-stat-value">
            {formatUptime(device?.uptime)} {device?.fps ? `(${device.fps} FPS)` : ''}
          </div>
        </div>
      </div>
    </section>
  );
}
