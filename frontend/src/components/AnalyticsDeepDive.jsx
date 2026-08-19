import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calculator,
  ShieldAlert,
  Clock,
  Layers,
  ArrowRight,
  IndianRupee
} from 'lucide-react';
import { sounds } from './SoundEffects';

export default function AnalyticsDeepDive() {
  const [milesToAudit, setMilesToAudit] = useState(250);
  const [potholeFrequency, setPotholeFrequency] = useState(14); // potholes per km/mile

  // ROI Calculations in Indian Rupees (INR)
  const standardManualCostPerUnit = 150000; // Traditional manual survey team cost per segment (₹1.5L)
  const aiSurveyCostPerUnit = 20000;       // Automated AI computer vision survey cost (₹20k)
  const estimatedSavings = milesToAudit * (standardManualCostPerUnit - aiSurveyCostPerUnit) / 10;
  const earlyInterventionSavings = Math.round(milesToAudit * potholeFrequency * 26500); // Preventive crack sealing vs full depth failure in ₹

  // Format currency in Lakhs/Crores or ₹
  const formatRupees = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lakh`;
    } else {
      return `₹${(amount / 1000).toFixed(1)}k`;
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="badge badge-purple" style={{ marginBottom: '0.5rem' }}>
          <BarChart3 size={13} /> INFRASTRUCTURE DEEP-DIVE
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>
          Pavement Life-Cycle & <span className="text-gradient">ROI Telemetry</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Predictive pavement degradation modelling, capital allocation optimization, and preventive maintenance ROI calculator.
        </p>
      </div>

      {/* Interactive ROI Calculator Card */}
      <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-glass-strong)', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--severity-clear)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Municipal Capital Savings & ROI Simulator</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Compare automated AI computer vision survey costs vs traditional manual inspection crews (in Indian Rupees ₹)</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>Total Corridor Network Distance to Audit:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>{milesToAudit} km / Miles</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={milesToAudit}
                onChange={(e) => {
                  sounds.playBeep(600 + parseInt(e.target.value) / 4, 0.01);
                  setMilesToAudit(parseInt(e.target.value));
                }}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>Estimated Distress Frequency:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', fontWeight: 700 }}>{potholeFrequency} per km</span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                step="1"
                value={potholeFrequency}
                onChange={(e) => {
                  sounds.playBeep(700 + parseInt(e.target.value) * 10, 0.01);
                  setPotholeFrequency(parseInt(e.target.value));
                }}
                style={{ width: '100%', accentColor: 'var(--accent-purple)' }}
              />
            </div>
          </div>

          {/* Results Summary Box */}
          <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-canvas)', border: '1px solid var(--border-glass)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>DIRECT SURVEY SAVINGS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--severity-clear)', marginTop: '0.2rem' }}>
                {formatRupees(estimatedSavings)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>87% cheaper than manual surveyor teams</div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>EARLY INTERVENTION SAVINGS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.2rem' }}>
                {formatRupees(earlyInterventionSavings)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>By patching P2/P3 distresses before full pavement failure</div>
            </div>
          </div>
        </div>
      </div>

      {/* Degradation Matrix by Corridor Hierarchy */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Pavement Distress Distribution by Roadway Classification</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>ROADWAY CLASS</th>
                <th style={{ padding: '0.75rem 1rem' }}>INSPECTED DISTANCE</th>
                <th style={{ padding: '0.75rem 1rem' }}>AVG PCI</th>
                <th style={{ padding: '0.75rem 1rem' }}>PRIMARY DISTRESS</th>
                <th style={{ padding: '0.75rem 1rem' }}>URGENT P1 CASES</th>
                <th style={{ padding: '0.75rem 1rem' }}>RECOMMENDED ACTION</th>
              </tr>
            </thead>
            <tbody>
              {[
                { class: 'National Highways & Expressways', miles: '340 km', pci: '82.4', distress: 'Transverse Thermal Cracks', p1: '48', action: 'Rubberized Joint Crack Sealing' },
                { class: 'State Highways & Principal Arterials', miles: '520 km', pci: '68.1', distress: 'Fatigue Alligator Cracking', p1: '215', action: '2-inch Mill & Overlay' },
                { class: 'Major District Roads (MDR)', miles: '410 km', pci: '61.5', distress: 'Pothole Clusters (D40)', p1: '380', action: 'Full-Depth Asphalt Patching' },
                { class: 'Urban & Municipal Streets', miles: '780 km', pci: '58.0', distress: 'Surface Ravelling / Rutting', p1: '520', action: 'Slurry Seal Micro-surfacing' }
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.class}</td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)' }}>{row.miles}</td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: parseFloat(row.pci) > 70 ? 'var(--severity-clear)' : 'var(--severity-medium)' }}>{row.pci}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{row.distress}</td>
                  <td style={{ padding: '1rem', color: 'var(--severity-critical)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{row.p1}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
