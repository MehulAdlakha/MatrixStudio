/**
 * Matrix Studio API Client
 * Connects to the Node.js + Express backend
 */

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    // If user configured a custom LAN IP in localStorage, prioritize it
    const storedUrl = localStorage.getItem('matrix_backend_url');
    if (storedUrl) return storedUrl.replace(/\/+$/, '');
  }
  return (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');
};

export const setCustomBackendUrl = (url) => {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('matrix_backend_url', url.trim());
    } else {
      localStorage.removeItem('matrix_backend_url');
    }
  }
};

export const getActiveBackendUrl = () => getBackendUrl();

/**
 * Send a display command to the Matrix backend
 */
export async function sendCommand(type, params) {
  const url = `${getBackendUrl()}/api/commands`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type, params })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: Failed to submit command`);
    }
    return data;
  } catch (err) {
    console.error('API Error [sendCommand]:', err);
    throw err;
  }
}

/**
 * Convenience method to clear the matrix display
 */
export async function clearDisplay() {
  const url = `${getBackendUrl()}/api/commands/clear`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clear display');
    return data;
  } catch (err) {
    console.error('API Error [clearDisplay]:', err);
    throw err;
  }
}

/**
 * Fetch current ESP32 device status and telemetry
 */
export async function fetchDeviceStatus() {
  const url = `${getBackendUrl()}/api/device/status`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch status`);
    const data = await res.json();
    return data.device || null;
  } catch (err) {
    return {
      online: false,
      error: err.message
    };
  }
}

/**
 * Fetch current active display command and command history
 */
export async function fetchCurrentCommand() {
  const url = `${getBackendUrl()}/api/commands/current`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch command`);
    return await res.json();
  } catch (err) {
    console.warn('API Warning [fetchCurrentCommand]:', err.message);
    return { command: null, history: [] };
  }
}

/**
 * Delete a single command history item
 */
export async function deleteHistoryItem(id) {
  const url = `${getBackendUrl()}/api/commands/history/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to delete history item`);
    return await res.json();
  } catch (err) {
    console.error('API Error [deleteHistoryItem]:', err);
    throw err;
  }
}

/**
 * Clear all command history items
 */
export async function clearAllHistory() {
  const url = `${getBackendUrl()}/api/commands/history`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to clear history`);
    return await res.json();
  } catch (err) {
    console.error('API Error [clearAllHistory]:', err);
    throw err;
  }
}
