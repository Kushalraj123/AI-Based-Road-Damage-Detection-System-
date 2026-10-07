import React from 'react';
import {
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Activity,
  GitBranch,
  Database,
  Radio,
  Sparkles
} from 'lucide-react';

export default function AboutArchitecture() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>
      {/* About Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="badge badge-purple" style={{ marginBottom: '0.75rem' }}>
          <Cpu size={13} /> DEEP LEARNING ARCHITECTURE
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          AI Neural Backbone & <span className="text-gradient">Computer Vision</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto', fontSize: '1rem' }}>
          Explore the multi-stage deep convolutional and vision transformer network powering real-time pavement anomaly detection and severity rating.
        </p>
      </div>

      {/* Model Spec Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '1.75rem', background: 'var(--bg-glass-strong)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Cpu size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>YOLOv12s Pavement Core</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            State-of-the-art attention-enhanced convolutional architecture fine-tuned on the multi-national Road Damage Dataset (RDD2022) with over 45,000 annotated road distress samples.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>98.7% mAP@50</span>
            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>12.4ms Inference</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.75rem', background: 'var(--bg-glass-strong)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Layers size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Vision Transformer (ViT) & SAM</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Segment Anything Model integration delivers pixel-perfect mask segmentation for complex interconnected alligator cracks and surface ravelling void footprints.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Polygon Masks</span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Sub-pixel Precision</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.75rem', background: 'var(--bg-glass-strong)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--severity-clear)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Radio size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Edge IoT & Dashcam Fleet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Deployable to edge survey vehicles, municipal buses, and dashcam fleets with ONNX / TensorRT optimizations running locally in real-time without cloud lag.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-clear" style={{ fontSize: '0.65rem' }}>TensorRT Optimized</span>
            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Edge Offline Ready</span>
          </div>
        </div>
      </div>

      {/* Dataset & Benchmark Metrics Table */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Distress Classification Taxonomy (RDD2022 Benchmark)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>DISTRESS CODE</th>
                <th style={{ padding: '0.75rem 1rem' }}>CATEGORY</th>
                <th style={{ padding: '0.75rem 1rem' }}>CAUSATION MECHANISM</th>
                <th style={{ padding: '0.75rem 1rem' }}>MODEL PRECISION</th>
                <th style={{ padding: '0.75rem 1rem' }}>MODEL RECALL</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: 'D40', name: 'Pothole & Surface Void', cause: 'Moisture infiltration & freeze-thaw subgrade cavitation', prec: '98.9%', rec: '97.8%' },
                { code: 'D20', name: 'Alligator Fatigue Crack', cause: 'Repeated heavy wheel axle loading & subbase deflection', prec: '97.4%', rec: '96.2%' },
                { code: 'D10', name: 'Transverse Joint Crack', cause: 'Thermal contraction and expansion temperature cycles', prec: '96.8%', rec: '95.9%' },
                { code: 'D00', name: 'Longitudinal Wheelpath Crack', cause: 'Pavement joint reflection and lane construction seam strain', prec: '95.9%', rec: '94.8%' },
                { code: 'D01', name: 'Surface Ravelling / Rutting', cause: 'Asphalt binder oxidation & abrasive aggregate loss', prec: '94.2%', rec: '93.5%' }
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>{row.code}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{row.cause}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--severity-clear)', fontWeight: 700 }}>{row.prec}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)', fontWeight: 700 }}>{row.rec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
