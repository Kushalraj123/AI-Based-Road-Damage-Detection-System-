import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import TechPipeline from './components/TechPipeline';
import FeatureGrid from './components/FeatureGrid';
import DetectionStudio from './components/DetectionStudio';
import DashboardView from './components/DashboardView';
import RoadMapView from './components/RoadMapView';
import AnalyticsDeepDive from './components/AnalyticsDeepDive';
import ReportsGenerator from './components/ReportsGenerator';
import AboutArchitecture from './components/AboutArchitecture';
import Footer from './components/Footer';
import { initTheme, toggleTheme } from './theme';
import { sounds } from './components/SoundEffects';

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState('dark');
  const [backendOnline, setBackendOnline] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const currentTheme = initTheme();
    setTheme(currentTheme);

    // Check backend health
    const checkBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          setBackendOnline(data.status === 'healthy');
        } else {
          setBackendOnline(false);
        }
      } catch (e) {
        setBackendOnline(false);
      }
    };

    checkBackend();
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [seenNotificationIds, setSeenNotificationIds] = useState(new Set());

  // Polling notifications from backend
  useEffect(() => {
    if (!backendOnline) return;

    const pollNotifications = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/notifications`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          
          // Check for new notifications
          const unseen = data.filter(notif => !seenNotificationIds.has(notif.id));
          if (unseen.length > 0) {
            // Mark as seen
            unseen.forEach(notif => seenNotificationIds.add(notif.id));
            setSeenNotificationIds(new Set(seenNotificationIds));
            
            // Pop up the most recent unseen toast
            const latest = unseen[unseen.length - 1];
            setActiveToast(latest);
            sounds.playLockOn();
            setTimeout(() => {
              setActiveToast(null);
            }, 6000);
          }
        }
      } catch (err) {
        console.error("Error polling notifications:", err);
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 3000);
    return () => clearInterval(interval);
  }, [backendOnline, seenNotificationIds]);

  const handleToggleTheme = () => {
    const nextTheme = toggleTheme();
    setTheme(nextTheme);
  };

  const handleNavigate = (tabId) => {
    sounds.playBeep(700, 0.03);
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dynamic Toast Alert for HCMC Municipal Department Notification */}
      {activeToast && (
        <div
          className="toast-slide-in"
          style={{
            position: 'fixed',
            top: '90px',
            right: '24px',
            zIndex: 9999,
            width: '340px',
            padding: '1.25rem',
            background: 'var(--bg-glass-strong)',
            backdropFilter: 'blur(20px)',
            border: '2px solid var(--accent-purple)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.35)',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
            <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px' }}>
              <span className="toast-dot-ping" style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: 'var(--severity-critical)', opacity: 0.75 }} />
              <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '8px', width: '8px', background: 'var(--severity-critical)' }} />
            </span>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', fontWeight: 800, letterSpacing: '0.05em' }}>
              MUNICIPAL DISPATCH SIGNAL
            </span>
          </div>
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            HCMC Dispatch Alert Received
          </h4>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Road damage reported at: <strong style={{ color: 'var(--accent-cyan)' }}>{activeToast.address}</strong>
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            <span>GPS: {activeToast.coords.lat.toFixed(5)}°N, {activeToast.coords.lng.toFixed(5)}°E</span>
            <span style={{ color: 'var(--severity-critical)', fontWeight: 700 }}>{activeToast.severity} Severity</span>
          </div>
        </div>
      )}

      {/* Sticky Glassmorphic Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        backendOnline={backendOnline}
        notifications={notifications}
      />

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* Cinematic 3D Road Hero */}
            <HeroSection
              onStartDetection={() => handleNavigate('detection')}
              onExploreDashboard={() => handleNavigate('dashboard')}
              onExploreMap={() => handleNavigate('roadmap')}
            />

            {/* AI Visual Pipeline */}
            <TechPipeline />

            {/* 3D Tilt Feature Grid */}
            <FeatureGrid onNavigate={handleNavigate} />
          </div>
        )}

        {activeTab === 'detection' && (
          <div className="animate-fade-in" style={{ paddingTop: '1rem' }}>
            <DetectionStudio
              onPushToMap={() => handleNavigate('roadmap')}
              onGenerateReport={() => handleNavigate('reports')}
            />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="animate-fade-in" style={{ paddingTop: '1rem' }}>
            <DashboardView
              onNavigateToDetection={() => handleNavigate('detection')}
              onNavigateToMap={() => handleNavigate('roadmap')}
            />
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="animate-fade-in" style={{ paddingTop: '1rem' }}>
            <RoadMapView
              onInspectItem={(item) => handleNavigate('detection')}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in" style={{ paddingTop: '1rem' }}>
            <AnalyticsDeepDive />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="animate-fade-in" style={{ paddingTop: '1rem' }}>
            <ReportsGenerator />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="animate-fade-in" style={{ paddingTop: '1rem' }}>
            <AboutArchitecture />
          </div>
        )}
      </main>

      {/* Modern Futuristic Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
