// Centralized Backend URL configuration with environment variable support for production hosting
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
