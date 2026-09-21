import React, { useState } from 'react';
import {
  Scan,
  LayoutDashboard,
  MapPin,
  BarChart3,
  FileText,
  Info,
  Sun,
  Moon,
  Bell,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { sounds } from './SoundEffects';

export default function Navbar({
  activeTab,
  setActiveTab,
  onNavigate,
  theme,
  onToggleTheme,
  backendOnline,
  notifications = [],
  notificationCount
}) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [soundActive, setSoundActive] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles },
    { id: 'detection', label: 'Detection', icon: Scan, badge: 'Live AI' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Road Map', icon: MapPin, badge: 'GIS' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'about', label: 'About', icon: Info },
  ];

  const handleSoundToggle = () => {
    const newState = sounds.toggle();
    setSoundActive(newState);
    if (newState) sounds.playBeep(900, 0.05);
  };

  const handleTabClick = (tabId) => {
    sounds.playBeep(700, 0.04);
    if (typeof onNavigate === 'function') {
      onNavigate(tabId);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header
      className="glass-panel"
      style={{
        position: 'sticky',
        top: '13px',
        left: 0,
        right: 0,
        zIndex: 100,
        margin: '0 1.5rem 1.25rem 1rem',
        padding: '0.48rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-glass)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem' }}>
        {/* Brand Logo */}
        <div
          onClick={() => handleTabClick('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            cursor: 'pointer',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <div
            style={{
              width: '35px',
              height: '35px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
              position: 'relative',
              flexShrink: 0
            }}
          >
            <Scan size={18} color="#ffffff" />
            <div
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '2px solid var(--bg-surface)'
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1.12rem',
                  letterSpacing: '-0.025em',
                  color: 'var(--text-primary)'
                }}
              >
                RoadVision
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '5px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-blue)',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}
              >
                AI
              </span>
            </div>
            <div
              style={{
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.04em'
              }}
            >
              INFRASTRUCTURE INTELLIGENCE
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--bg-input)',
            padding: '0.32rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 1.1rem',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.25) 100%)'
                    : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isActive ? '0 0 14px rgba(56, 189, 248, 0.25)' : 'none',
                  outline: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '0.1rem 0.38rem',
                      borderRadius: '4px',
                      background: isActive ? 'var(--accent-blue)' : 'rgba(56, 189, 248, 0.15)',
                      color: isActive ? '#ffffff' : 'var(--accent-blue)',
                      fontWeight: 700
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
          {/* Sound FX Toggle */}
          <button
            onClick={handleSoundToggle}
            title={soundActive ? 'Audio FX Enabled' : 'Audio FX Muted'}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-glass)',
              color: soundActive ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
              padding: '0.42rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            {soundActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              sounds.playBeep(1100, 0.04);
              onToggleTheme();
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              padding: '0.42rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
          </button>

          {/* Notification Icon */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                sounds.playBeep(850, 0.03);
                setShowNotifs(!showNotifs);
              }}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                padding: '0.42rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              <Bell size={15} />
              {notifications.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--severity-critical)',
                    boxShadow: '0 0 8px var(--severity-critical)',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </button>
          </div>

          {/* Notification Dropdown Drawer */}
          {showNotifs && (
            <div
              className="glass-panel animate-fade-in"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '300px',
                padding: '0.85rem',
                zIndex: 200,
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Municipal Dispatch Feeds</span>
                <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>{notifications.length} Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>
                    No active dispatch logs.
                  </div>
                ) : (
                  [...notifications].reverse().map((notif) => {
                    const isHigh = notif.severity === 'High' || notif.severity === 'Critical';
                    const isMed = notif.severity === 'Medium';
                    const color = isHigh ? 'var(--severity-critical)' : isMed ? 'var(--severity-medium)' : 'var(--accent-blue)';
                    return (
                      <div
                        key={notif.id}
                        style={{
                          padding: '0.55rem',
                          borderRadius: '7px',
                          background: `${color}08`,
                          border: `1px solid ${color}20`,
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifySpace: 'between', gap: '0.35rem', color: color, fontWeight: 700 }}>
                          <AlertTriangle size={12} /> {notif.severity} Severity Dispatch
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 600, marginTop: '0.15rem' }}>
                          {notif.address}
                        </div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
                          GPS: {notif.coords?.lat.toFixed(5)}°N, {notif.coords?.lng.toFixed(5)}°E
                        </div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
                          Ticket ID: {notif.id}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* User / Smart-City DOT Profile */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.28rem 0.65rem',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)'
            }}
            className="user-badge"
          >
            <div
              style={{
                width: '25px',
                height: '25px',
                borderRadius: '7px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.7rem'
              }}
            >
              SF
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>SF DOT</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>Admin Hub</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
