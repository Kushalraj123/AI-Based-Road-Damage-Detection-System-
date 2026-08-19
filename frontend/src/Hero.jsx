import React from 'react';
import { ArrowRight, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function Hero({ onStartScan }) {
  return (
    <div className="glass-panel hero-section animate-fade-in" style={{
      position: 'relative',
      padding: '3rem 2.5rem',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 60%), var(--bg-surface)',
      overflow: 'hidden',
      marginBottom: '2.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      {/* Decorative Blur Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '300px',
        height: '300px',
        background: 'var(--accent-secondary)',
        filter: 'blur(120px)',
        opacity: 0.15,
        pointerEvents: 'none',
        borderRadius: '50%'
      }}></div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '20px',
          color: 'var(--accent-primary)',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginBottom: '1.25rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }} className="animate-float">
          <Zap size={14} /> Next-Gen Road Infrastructure Analytics
        </div>

        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 800,
          lineHeight: 1.15,
          fontFamily: 'var(--font-heading)',
          background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, var(--accent-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          letterSpacing: '-0.03em'
        }}>
          Automated Real-Time Road Damage Assessment
        </h1>
        
        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: '2rem',
          maxWidth: '650px'
        }}>
          Powered by state-of-the-art computer vision models, RoadGuard AI automatically identifies, localizes, and catalogs road distresses like cracks, potholes, and rutting in real-time. Protect your fleet and optimize maintenance resources.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <button 
            className="btn btn-primary animate-pulse" 
            onClick={onStartScan}
            style={{
              padding: '0.85rem 1.75rem',
              fontSize: '1rem',
              gap: '0.75rem'
            }}
          >
            Start Inference Scan <ArrowRight size={18} />
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            paddingLeft: '1.5rem',
            borderLeft: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={16} className="text-secondary" style={{ color: 'var(--color-clear)' }} />
              <span>YOLOv8 Engine</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <AlertTriangle size={16} className="text-secondary" style={{ color: 'var(--color-medium)' }} />
              <span>Live Alerting</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
