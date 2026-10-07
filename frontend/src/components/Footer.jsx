import React from 'react';
import { Scan, Globe, Share2, Mail, ExternalLink, ShieldCheck, Radio, Sparkles } from 'lucide-react';
import { sounds } from './SoundEffects';

export default function Footer({ onNavigate }) {
  return (
    <footer
      className="glass-panel"
      style={{
        margin: '3rem 1rem 1.5rem 1rem',
        padding: '3.5rem 2rem 2rem 2rem',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-glass-strong)'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2.5rem',
          marginBottom: '2rem'
        }}
      >
        {/* Brand & Mission */}
        <div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}
            onClick={() => onNavigate('home')}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Scan size={20} />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem' }}>
              RoadVision AI
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Transforming roadway visual streams and sensor feeds into automated smart-city infrastructure intelligence, reducing maintenance costs and eliminating road hazards.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[
              { icon: Globe, href: 'https://github.com' },
              { icon: Share2, href: 'https://twitter.com' },
              { icon: Mail, href: 'mailto:contact@roadvision.ai' }
            ].map((soc, i) => {
              const Icon = soc.icon;
              return (
                <a
                  key={i}
                  href={soc.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent-cyan)';
                    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                  }}
                >
                  <Icon size={16} />
                </a>
              );
            })}
          </div>
        </div>

        {/* Navigation Column */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            PLATFORM MODULES
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            {[
              { id: 'detection', label: 'AI Detection Studio' },
              { id: 'dashboard', label: 'Analytics Command Center' },
              { id: 'roadmap', label: 'GIS Digital Twin Map' },
              { id: 'analytics', label: 'Pavement Life-Cycle ROI' },
              { id: 'reports', label: 'Municipal Audit Generator' }
            ].map((link) => (
              <li key={link.id}>
                <button
                  onClick={() => {
                    sounds.playBeep(750, 0.02);
                    onNavigate(link.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Deep Tech Column */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            AI ARCHITECTURE
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>YOLOv12s Core Backbone</li>
            <li>Segment Anything Model (SAM)</li>
            <li>Vision Transformer (ViT)</li>
            <li>RDD2022 Dataset Standards</li>
            <li>TensorRT Edge Acceleration</li>
          </ul>
        </div>

        {/* Smart-City DOT Support */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            ENTERPRISE & DOT
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            Deploy custom AI road inspection models across municipal vehicle fleets and GIS asset management pipelines.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--severity-clear)', fontSize: '0.78rem', fontWeight: 600 }}>
            <ShieldCheck size={16} />
            <span>DOT Federal Highway Compliant</span>
          </div>
        </div>
      </div>

      {/* Footer Bottom Line */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
        <div>
          &copy; {new Date().getFullYear()} RoadVision AI Inc. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'var(--font-mono)' }}>
          <span>PRIVACY POLICY</span>
          <span>TERMS OF SERVICE</span>
          <span>API SPECIFICATION</span>
        </div>
      </div>
    </footer>
  );
}
