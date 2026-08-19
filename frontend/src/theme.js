// Theme manager for RoadVision AI

export function initTheme() {
  const savedTheme = localStorage.getItem('roadvision_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'dark'); // Default to cinematic dark
  
  document.documentElement.setAttribute('data-theme', initialTheme);
  return initialTheme;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('roadvision_theme', next);
  
  // Dispatch custom event so 3D Three.js canvas and charts update lighting dynamically
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: next } }));
  
  return next;
}
