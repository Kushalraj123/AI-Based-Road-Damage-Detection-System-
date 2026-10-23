/**
 * Centralized Application Configuration
 * Dynamically resolves backend endpoints, bypasses tunnel reminders (localtunnel / ngrok),
 * and provides robust apiFetch wrapper with localStorage override support.
 */

export const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ROADVISION_BACKEND_URL');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  return (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
};

export const setBackendUrl = (url) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('ROADVISION_BACKEND_URL', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('ROADVISION_BACKEND_URL');
    }
  }
};

// Default export string for backwards compatibility
export let BACKEND_URL = getBackendUrl();

export const API_HEADERS = {
  'Bypass-Tunnel-Reminder': 'true',
  'bypass-tunnel-reminder': 'true',
  'ngrok-skip-browser-warning': 'true'
};

/**
 * Universal API Fetch wrapper that automatically prepends backend URL for relative paths
 * and attaches tunnel-bypass headers
 */
export const apiFetch = async (url, options = {}) => {
  let targetUrl = url;
  const currentBase = getBackendUrl();
  
  // If a relative API path was passed
  if (targetUrl.startsWith('/api')) {
    targetUrl = `${currentBase}${targetUrl}`;
  }

  // Only include tunnel bypass headers if accessing a tunnel service (localtunnel / ngrok)
  const isTunnel = targetUrl.includes('localtunnel.me') || targetUrl.includes('ngrok') || targetUrl.includes('lt.io');
  const baseHeaders = isTunnel ? API_HEADERS : {};

  const customHeaders = {
    ...baseHeaders,
    ...(options.headers || {})
  };

  return fetch(targetUrl, {
    ...options,
    headers: customHeaders
  });
};

// Dynamic API Endpoints Mapping
export const API_ENDPOINTS = {
  get STATUS() { return `${getBackendUrl()}/api/status`; },
  get MODELS() { return `${getBackendUrl()}/api/models`; },
  get DETECT() { return `${getBackendUrl()}/api/detect`; },
  get DETECT_FRAME() { return `${getBackendUrl()}/api/detect-frame`; },
  get DETECT_VIDEO() { return `${getBackendUrl()}/api/detect-video`; },
  VIDEO_STATUS: (taskId) => `${getBackendUrl()}/api/video-status/${taskId}`,
  get STATS() { return `${getBackendUrl()}/api/stats`; },
  get HISTORY() { return `${getBackendUrl()}/api/history`; },
  get HISTORY_CLEAR() { return `${getBackendUrl()}/api/history/clear`; },
  get NOTIFICATIONS() { return `${getBackendUrl()}/api/notifications`; },
  get NOTIFICATIONS_SUBMIT() { return `${getBackendUrl()}/api/notifications/submit`; },
  get DB_STATUS() { return `${getBackendUrl()}/api/db/status`; }
};

export default {
  get BACKEND_URL() { return getBackendUrl(); },
  getBackendUrl,
  setBackendUrl,
  API_HEADERS,
  apiFetch,
  API_ENDPOINTS
};

