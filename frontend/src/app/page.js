'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import DeviceStatus from '../components/DeviceStatus';
import MatrixPreview from '../components/MatrixPreview';
import TextControl from '../components/TextControl';
import PixelCanvas from '../components/PixelCanvas';
import AnimationControl from '../components/AnimationControl';
import BrightnessControl from '../components/BrightnessControl';
import CommandHistory from '../components/CommandHistory';
import Toast from '../components/Toast';
import { fetchDeviceStatus, fetchCurrentCommand, deleteHistoryItem, clearAllHistory, clearDisplay } from '../lib/api';
import { createEmptyGrid } from '../lib/imageProcessor';

export default function MatrixStudioPage() {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'animation'
  const [device, setDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [previewPixels, setPreviewPixels] = useState(() => createEmptyGrid());

  // Show Toast helper
  const addToast = useCallback(({ type = 'success', message }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleDeleteHistoryItem = useCallback(async (id) => {
    try {
      await deleteHistoryItem(id);
      await clearDisplay();
      setPreviewPixels(createEmptyGrid());
      setHistory([]);
      addToast({ type: 'success', message: 'Effect stopped & display cleared' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to stop effect' });
    }
  }, [addToast]);

  const handleClearAllHistory = useCallback(async () => {
    try {
      await clearAllHistory();
      await clearDisplay();
      setPreviewPixels(createEmptyGrid());
      setHistory([]);
      addToast({ type: 'success', message: 'Display cleared & effect stopped' });
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to clear display' });
    }
  }, [addToast]);

  // Poll Device Status and Command History
  const refreshData = useCallback(async () => {
    try {
      const dev = await fetchDeviceStatus();
      setDevice(dev);

      const cmdData = await fetchCurrentCommand();
      if (cmdData?.history) {
        setHistory(cmdData.history);
      }
    } catch (err) {
      console.warn('Poll error:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <main className="app-container">
      {/* Header */}
      <Header
        onToast={addToast}
        onClear={() => {
          setPreviewPixels(createEmptyGrid());
          refreshData();
        }}
      />

      {/* Hardware Telemetry Bar */}
      <DeviceStatus device={device} />

      {/* 30x10 Virtual Matrix Simulator */}
      <MatrixPreview pixels={previewPixels} />

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Interactive Control Panels */}
        <div>
          {/* Tabs Selector */}
          <div className="tabs-container" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'text'}
              className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <span>Text & Typography</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'image'}
              className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
              onClick={() => setActiveTab('image')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Image & Pixel Art</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'animation'}
              className={`tab-btn ${activeTab === 'animation' ? 'active' : ''}`}
              onClick={() => setActiveTab('animation')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Built-in Animations</span>
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'text' && (
            <TextControl onToast={addToast} />
          )}

          {activeTab === 'image' && (
            <PixelCanvas
              pixels={previewPixels}
              setPixels={setPreviewPixels}
              onToast={addToast}
            />
          )}

          {activeTab === 'animation' && (
            <AnimationControl onToast={addToast} />
          )}
        </div>

        {/* Right Column: Global Controls & Hardware Activity */}
        <div>
          {/* Global Brightness Slider */}
          <BrightnessControl onToast={addToast} />

          {/* Real-time Command History & Acknowledgement Log */}
          <CommandHistory
            history={history}
            onDelete={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
          />
        </div>
      </div>

      {/* Floating Toast Alerts */}
      <Toast toasts={toasts} />
    </main>
  );
}
