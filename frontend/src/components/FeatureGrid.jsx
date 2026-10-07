import React, { useState } from 'react';
import {
  Scan,
  ShieldCheck,
  Zap,
  BarChart3,
  MapPin,
  FileSpreadsheet,
  ArrowUpRight,
  Cpu,
  Layers
} from 'lucide-react';
import { sounds } from './SoundEffects';

function TiltCard({ feature, onSelect }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -10;
    const rY = ((x - centerX) / centerX) * 10;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const Icon = feature.icon;

  return (
    <div
      className="tilt-card"
      style={{
        perspective: '1000px',
        cursor: 'pointer'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        setIsHovered(true);
        sounds.playBeep(900, 0.02);
      }}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect(feature.targetTab)}
    >
      <div
        className="glass-panel"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovered ? 1.02 : 1})`,
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out, border-color 0.3s ease',
          padding: '2rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: isHovered ? `1px solid ${feature.glowColor}` : '1px solid var(--border-glass)',
          boxShadow: isHovered ? `0 16px 40px ${feature.glowColor}25, 0 0 20px ${feature.glowColor}30` : 'var(--shadow-glass)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Accent Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-20%',
            width: '180px',
            height: '180px',
            background: feature.glowColor,
            filter: 'blur(80px)',
            opacity: isHovered ? 0.25 : 0.08,
            borderRadius: '50%',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none'
          }}
        />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: `rgba(6, 182, 212, 0.12)`,
                border: `1px solid ${feature.glowColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: feature.glowColor,
                boxShadow: `0 0 16px ${feature.glowColor}33`
              }}
            >
              <Icon size={24} />
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isHovered ? feature.glowColor : 'var(--text-tertiary)',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowUpRight size={16} />
            </div>
          </div>

          <h3
            style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              marginBottom: '0.65rem',
              color: 'var(--text-primary)'
            }}
          >
            {feature.title}
          </h3>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem'
            }}
          >
            {feature.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <span className="mono-tag" style={{ color: feature.glowColor, fontSize: '0.72rem' }}>
            {feature.metric}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FeatureGrid({ onNavigate }) {
  const features = [
    {
      title: 'AI Detection',
      description: 'Automatically detect potholes, alligator cracks, longitudinal joints, and road distress with millimeter accuracy.',
      icon: Scan,
      glowColor: '#06b6d4',
      metric: 'AUTOMATED YOLOv10 INFERENCE',
      targetTab: 'detection'
    },
    {
      title: 'High Accuracy',
      description: 'Advanced dual-architecture computer vision models trained on extensive real-world road inspection datasets.',
      icon: ShieldCheck,
      glowColor: '#38bdf8',
      metric: '98.7% VALIDATION PRECISION',
      targetTab: 'about'
    },
    {
      title: 'Real-Time Analysis',
      description: 'Ultra-low latency processing capable of analyzing 4K dashcam video streams and live surveyor mobile feeds at 60 FPS.',
      icon: Zap,
      glowColor: '#6366f1',
      metric: '<14ms FRAME INFERENCE',
      targetTab: 'detection'
    },
    {
      title: 'Smart Analytics',
      description: 'Comprehensive telemetry dashboards and Pavement Condition Index (PCI) calculations to optimize maintenance capital.',
      icon: BarChart3,
      glowColor: '#8b5cf6',
      metric: 'DOT STANDARD PCI METRICS',
      targetTab: 'dashboard'
    },
    {
      title: 'Interactive Map',
      description: 'Geographically map every detected road distress with GIS coordinates, severity heatmaps, and autonomous survey simulation.',
      icon: MapPin,
      glowColor: '#f59e0b',
      metric: 'SPATIAL GIS DIGITAL TWIN',
      targetTab: 'roadmap'
    },
    {
      title: 'Automated Reports',
      description: 'Generate municipality and DOT-grade road inspection audit reports with instant PDF print exports and CSV dispatch files.',
      icon: FileSpreadsheet,
      glowColor: '#10b981',
      metric: 'ONE-CLICK PDF / CSV EXPORT',
      targetTab: 'reports'
    }
  ];

  return (
    <section
      style={{
        maxWidth: '1200px',
        margin: '0 auto 5rem auto',
        padding: '0 1.5rem'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>
          <Layers size={13} /> PLATFORM CAPABILITIES
        </div>
        <h2 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
          Engineered for <span className="text-gradient">Modern Smart Cities</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto' }}>
          Comprehensive infrastructure monitoring suite engineered for municipal departments of transportation, road contractors, and autonomous vehicle fleets.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {features.map((feature, idx) => (
          <TiltCard key={idx} feature={feature} onSelect={onNavigate} />
        ))}
      </div>
    </section>
  );
}
