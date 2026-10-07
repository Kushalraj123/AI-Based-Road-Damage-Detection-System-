/**
 * Centralized Application Configuration
 * Dynamically resolves backend endpoints and environment options.
 */

// Backend Base URL from environment variable or default local host
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// API Endpoints Mapping
export const API_ENDPOINTS = {
  STATUS: `${BACKEND_URL}/api/status`,
  MODELS: `${BACKEND_URL}/api/models`,
  DETECT: `${BACKEND_URL}/api/detect`,
  DETECT_FRAME: `${BACKEND_URL}/api/detect-frame`,
  DETECT_VIDEO: `${BACKEND_URL}/api/detect-video`,
  VIDEO_STATUS: (taskId) => `${BACKEND_URL}/api/video-status/${taskId}`,
  STATS: `${BACKEND_URL}/api/stats`,
  HISTORY: `${BACKEND_URL}/api/history`,
  HISTORY_CLEAR: `${BACKEND_URL}/api/history/clear`,
  NOTIFICATIONS: `${BACKEND_URL}/api/notifications`,
  NOTIFICATIONS_SUBMIT: `${BACKEND_URL}/api/notifications/submit`,
  DB_STATUS: `${BACKEND_URL}/api/db/status`
};

export default {
  BACKEND_URL,
  API_ENDPOINTS
};
