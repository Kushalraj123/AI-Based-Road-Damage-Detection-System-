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
      {/* Sticky Glassmorphic Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        backendOnline={backendOnline}
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
