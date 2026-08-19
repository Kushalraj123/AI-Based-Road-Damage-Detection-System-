import React, { useState } from 'react';
import {
  Eye,
  Sliders,
  Scan,
  Tag,
  AlertTriangle,
  FileCheck2,
  ChevronRight,
  Cpu,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { sounds } from './SoundEffects';

export default function TechPipeline() {
  const [selectedStep, setSelectedStep] = useState(2); // Default to Object Detection

  const steps = [
    {
      id: 0,
      title: 'Computer Vision',
      subtitle: 'Raw Stream Acquisition',
      icon: Eye,
      color: 'var(--accent-blue)',
      description: 'High-definition video feeds, dashcam streams, and mobile camera frames are ingested at up to 60 FPS with adaptive exposure and motion deblur filters.',
      metrics: ['4K/1080p Resolution', '60 FPS Ingestion', 'Sensor Metadata Sync']
    },
    {
      id: 1,
      title: 'Image Processing',
      subtitle: 'Surface Normalization',
      icon: Sliders,
      color: 'var(--accent-cyan)',
      description: 'Dynamic range enhancement, shadow suppression, and perspective bird’s-eye orthorectification map the pavement geometry into metric space.',
      metrics: ['Adaptive CLAHE Filter', 'Shadow Inpainting', 'Bird’s-Eye Warp']
    },
    {
      id: 2,
      title: 'Object Detection',
      subtitle: 'Tensor Neural Inference',
      icon: Scan,
      color: 'var(--accent-indigo)',
      description: 'Dual YOLOv8/v12s and Segment Anything Model (SAM) neural backbones pinpoint spatial distress boundaries with millimeter-scale precision.',
      metrics: ['YOLOv12s Core', '12.4ms Latency', '0.98 mAP@50']
    },
    {
      id: 3,
      title: 'Damage Classification',
      subtitle: 'Distress Taxonomy',
      icon: Tag,
      color: 'var(--accent-purple)',
      description: 'Distress categorizer distinguishes Potholes (D40), Alligator Fatigue Cracks (D20), Transverse Cracks (D10), Longitudinal Cracks (D00), and Rutting.',
      metrics: ['RDD2022 Compliant', '5 Core Classes', '98.7% Accuracy']
    },
    {
      id: 4,
      title: 'Severity Analysis',
      subtitle: 'Structural Risk Matrix',
      icon: AlertTriangle,
      color: 'var(--severity-high)',
      description: 'Calculates distress depth, surface area footprint, vehicular hazard index, and Pavement Condition Index (PCI) deduction points.',
      metrics: ['PCI Metric Index', 'Depth Volumetrics', 'P1-P3 Priority Rating']
    },
    {
      id: 5,
      title: 'Smart Report',
      subtitle: 'Automated Dispatch & GIS',
      icon: FileCheck2,
      color: 'var(--severity-clear)',
      description: 'Instant PDF/CSV municipal audit generation, automated work order dispatch, and live GIS map synchronization for maintenance crews.',
      metrics: ['GIS Geo-Tagging', 'PDF Audit Export', 'ERP/Work Order API']
    }
  ];

  return (
    <section
      style={{
        maxWidth: '1200px',
        margin: '0 auto 4rem auto',
        padding: '0 1.5rem'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div className="badge badge-cyan" style={{ marginBottom: '0.75rem' }}>
          <Cpu size={13} /> NEURAL PROCESSING PIPELINE
        </div>
        <h2 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
          How <span className="text-gradient">RoadVision AI</span> Operates
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto' }}>
          End-to-end automated computer vision pipeline converting raw pavement imagery into actionable smart-city infrastructure intelligence.
        </p>
      </div>

      {/* Interactive Horizontal Pipeline Nodes */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem 1.5rem',
          border: '1px solid var(--border-glass)',
          background: 'var(--bg-glass)',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem'
          }}
        >
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = selectedStep === step.id;
            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => {
                    sounds.playBeep(600 + step.id * 100, 0.04);
                    setSelectedStep(step.id);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    minWidth: '130px',
                    padding: '1rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                    border: isSelected ? `1px solid ${step.color}` : '1px solid transparent',
                    boxShadow: isSelected ? `0 0 20px ${step.color}40` : 'none',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: isSelected
                        ? step.color
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `2px solid ${step.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#ffffff' : step.color,
                      boxShadow: isSelected ? `0 0 24px ${step.color}` : 'none',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {step.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        color: isSelected ? step.color : 'var(--text-tertiary)'
                      }}
                    >
                      Step 0{step.id + 1}
                    </div>
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: selectedStep > idx ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    <ChevronRight size={20} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Step Deep Dive Card */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          border: `1px solid ${steps[selectedStep].color}55`,
          background: 'var(--bg-glass-strong)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
          boxShadow: `0 8px 32px 0 ${steps[selectedStep].color}20`
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span
              className="mono-tag"
              style={{
                color: steps[selectedStep].color,
                background: `${steps[selectedStep].color}15`,
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                border: `1px solid ${steps[selectedStep].color}33`
              }}
            >
              PIPELINE STAGE 0{steps[selectedStep].id + 1}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {steps[selectedStep].subtitle}
            </span>
          </div>

          <h3 style={{ fontSize: '1.65rem', marginBottom: '0.85rem', color: 'var(--text-primary)' }}>
            {steps[selectedStep].title}
          </h3>

          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {steps[selectedStep].description}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            {steps[selectedStep].metrics.map((metric, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-glass)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <Zap size={12} color={steps[selectedStep].color} />
                {metric}
              </span>
            ))}
          </div>
        </div>

        {/* Visual Diagram HUD for the Stage */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            border: '1px solid var(--border-glass)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <span>// TENSOR PIPELINE TRACE</span>
            <span style={{ color: 'var(--status-active)' }}>ACTIVE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', color: 'var(--text-secondary)' }}>
            <div><span style={{ color: 'var(--accent-blue)' }}>const</span> stage = <span style={{ color: '#ffffff' }}>"{steps[selectedStep].title}"</span>;</div>
            <div><span style={{ color: 'var(--accent-blue)' }}>const</span> status = <span style={{ color: 'var(--status-active)' }}>"OPTIMAL_INFERENCE"</span>;</div>
            <div><span style={{ color: 'var(--accent-blue)' }}>const</span> frameLatency = <span style={{ color: 'var(--accent-cyan)' }}>12.4ms</span>;</div>
            <div><span style={{ color: 'var(--accent-blue)' }}>const</span> precisionRecall = <span style={{ color: 'var(--accent-purple)' }}>0.987</span>;</div>
            <div style={{ color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>// Neural weights loaded into CUDA memory</div>
          </div>
        </div>
      </div>
    </section>
  );
}
