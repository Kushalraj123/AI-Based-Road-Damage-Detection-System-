import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Cpu,
  Target,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ThreeRoadHero from './ThreeRoadHero';
import { sounds } from './SoundEffects';

export default function HeroSection({ onStartDetection, onExploreDashboard, onExploreMap }) {
  const [activeTelemetry, setActiveTelemetry] = useState('pothole');

  const stats = [
    { label: 'Detection Accuracy', value: '98.7%', change: '+1.4% vs baseline', icon: Target, color: 'var(--accent-cyan)' },
    { label: 'Roads Analyzed', value: '12,450+', change: '840 km covered', icon: Layers, color: 'var(--accent-blue)' },
    { label: 'Damage Cases Detected', value: '36,280', change: '8,420 critical flagged', icon: AlertCircle, color: 'var(--severity-critical)' },
    { label: 'Images Processed Today', value: '4.2K', change: 'Real-time 60 FPS', icon: Zap, color: 'var(--accent-purple)' },
  ];

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '3rem 2rem 4rem 2rem',
        borderRadius: 'var(--radius-xl)',
        margin: '0 1rem 3rem 1rem',
        background: 'radial-gradient(ellipse at 50% 10%, rgba(6, 182, 212, 0.15), transparent 70%), var(--bg-surface)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      {/* 3D WebGL Road Canvas in the Background */}
      <ThreeRoadHero />

      {/* Floating Holographic AI Telemetry Badges (Overlaid on 3D Canvas) */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          right: '5%',
          zIndex: 5,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '280px'
        }}
        className="hero-floating-hud"
      >
        <div
          className="glass-panel"
          style={{
            padding: '0.85rem 1.1rem',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            boxShadow: '0 0 25px rgba(6, 182, 212, 0.25)',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span className="mono-tag" style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Zap size={13} /> LIVE SCAN HUD
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--status-active)', fontWeight: 600 }}>● 60 FPS</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            YOLOv10 / SAM Pavement Core
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Triangulating 3D road distress vectors in real-time
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '0.85rem 1.1rem',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            boxShadow: '0 0 25px rgba(244, 63, 94, 0.2)',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
              P1 Alert Detected
            </span>
            <span className="mono-tag" style={{ color: 'var(--severity-critical)', fontSize: '0.7rem' }}>
              98.2% CONF
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Severe Cavity Pothole (D40)
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Est. Depth: 7.5 cm • Immediate repair dispatch
          </div>
        </div>
      </div>

      {/* Hero Foreground Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '820px',
          margin: '0 auto 2.5rem auto',
          textAlign: 'center'
        }}
      >
        {/* Animated Pill Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.15) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: 'var(--accent-cyan)',
            fontSize: '0.825rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '1.5rem',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)'
          }}
          className="animate-float"
        >
          <Sparkles size={15} />
          <span>SMART CITY GIS & COMPUTER VISION PLATFORM</span>
        </div>

        {/* Cinematic Main Heading */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            marginBottom: '1.25rem',
            fontFamily: 'var(--font-heading)'
          }}
        >
          See Every Road.{' '}
          <span className="text-gradient">Detect Every Problem.</span>
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            marginBottom: '2.5rem',
            maxWidth: '680px',
            margin: '0 auto 2.5rem auto'
          }}
        >
          AI-powered road damage detection that transforms images into intelligent infrastructure insights.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '3rem'
          }}
        >
          <button
            className="btn btn-primary btn-glow"
            onClick={() => {
              sounds.playLaserScan();
              onStartDetection();
            }}
            style={{
              padding: '0.9rem 2.2rem',
              fontSize: '1.05rem',
              gap: '0.75rem'
            }}
          >
            <Zap size={20} />
            <span>Start Detection</span>
            <ArrowRight size={18} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              sounds.playBeep(750, 0.04);
              onExploreDashboard();
            }}
            style={{
              padding: '0.9rem 2rem',
              fontSize: '1.05rem',
              gap: '0.65rem'
            }}
          >
            <Activity size={18} />
            <span>Explore Dashboard</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              sounds.playBeep(800, 0.04);
              onExploreMap();
            }}
            style={{
              padding: '0.9rem 1.6rem',
              fontSize: '0.95rem',
              gap: '0.5rem',
              background: 'rgba(56, 189, 248, 0.08)',
              borderColor: 'rgba(56, 189, 248, 0.25)'
            }}
          >
            <Layers size={17} />
            <span>GIS Digital Twin Map</span>
          </button>
        </div>
      </div>

      {/* Floating Statistics Grid */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto'
        }}
      >
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'transform 0.25s ease, border-color 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'var(--border-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-glass)';
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: `rgba(6, 182, 212, 0.12)`,
                  border: `1px solid ${stat.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                  boxShadow: `0 0 16px ${stat.color}33`,
                  flexShrink: 0
                }}
              >
                <Icon size={22} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.55rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: stat.color, marginTop: '0.15rem' }}>
                  {stat.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
