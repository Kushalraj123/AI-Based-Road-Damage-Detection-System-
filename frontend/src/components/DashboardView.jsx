import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Activity,
  Calendar,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Clock,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';
import { sounds } from './SoundEffects';

export default function DashboardView({ onNavigateToDetection, onNavigateToMap }) {
  const [timeRange, setTimeRange] = useState('month'); // 'week' | 'month' | 'quarter' | 'year'
  const [selectedChartFilter, setSelectedChartFilter] = useState('all');

  // KPI Metrics Data Mapping based on selected timeRange filter
  const metricsData = {
    week: {
      roads: '215', roadsChange: '+5.2% vs last wk',
      damage: '620', damageChange: '+3.1% AI scan rate',
      high: '140', highChange: '91% dispatched',
      medium: '260', mediumChange: '55% scheduled',
      low: '220', lowChange: 'Monitored',
      accuracy: '98.9%', accuracyChange: 'YOLOv12s engine',
      trendPoints: '0,170 50,165 100,140 150,145 200,120 250,110 300,125 350,90 400,95 450,75 500,80 550,50 600,60 650,30 700,35',
      trendPolyPoints: '0,170 50,165 100,140 150,145 200,120 250,110 300,125 350,90 400,95 450,75 500,80 550,50 600,60 650,30 700,35 700,190 0,190',
      trendMarkers: [
        [150, 145, '3 Cases'],
        [350, 90, '8 Cases'],
        [550, 50, '12 Cases'],
        [700, 35, '15 Cases']
      ],
      trendLabels: ["AUG 14", "AUG 16", "AUG 18", "AUG 20"],
      trendTitle: 'Damage Detection Velocity',
      trendSubtitle: 'Daily identified distress cases across city road corridors',
      trendChange: '+8.2% vs Prev Period',
      pci: '76.5',
      pciStatus: 'GOOD / SATISFACTORY',
      pciOffset: 59
    },
    month: {
      roads: '940', roadsChange: '+18.4% vs last mo',
      damage: '2,810', damageChange: '+4.2% AI scan rate',
      high: '640', highChange: '85% dispatched',
      medium: '1,180', mediumChange: '42% scheduled',
      low: '990', lowChange: 'Monitored',
      accuracy: '98.7%', accuracyChange: 'YOLOv12s engine',
      trendPoints: '0,180 50,150 100,165 150,110 200,125 250,85 300,95 350,60 400,75 450,45 500,65 550,30 600,40 650,20 700,25',
      trendPolyPoints: '0,180 50,150 100,165 150,110 200,125 250,85 300,95 350,60 400,75 450,45 500,65 550,30 600,40 650,20 700,25 700,190 0,190',
      trendMarkers: [
        [150, 110, '14 Cases'],
        [350, 60, '22 Cases'],
        [550, 30, '31 Cases'],
        [700, 25, '36 Cases']
      ],
      trendLabels: ["AUG 01", "AUG 05", "AUG 10", "AUG 15", "AUG 19 (TODAY)"],
      trendTitle: 'Damage Detection Velocity',
      trendSubtitle: 'Daily identified distress cases across city road corridors',
      trendChange: '+12.4% vs Prev Period',
      pci: '74.2',
      pciStatus: 'GOOD / SATISFACTORY',
      pciOffset: 65
    },
    quarter: {
      roads: '2,720', roadsChange: '+24.1% vs last qtr',
      damage: '8,450', damageChange: '+6.8% AI scan rate',
      high: '1,950', highChange: '89% dispatched',
      medium: '3,540', mediumChange: '48% scheduled',
      low: '2,960', lowChange: 'Monitored',
      accuracy: '98.5%', accuracyChange: 'YOLOv12s engine',
      trendPoints: '0,160 50,140 100,150 150,120 200,135 250,105 300,115 350,80 400,90 450,65 500,75 550,40 600,50 650,30 700,35',
      trendPolyPoints: '0,160 50,140 100,150 150,120 200,135 250,105 300,115 350,80 400,90 450,65 500,75 550,40 600,50 650,30 700,35 700,190 0,190',
      trendMarkers: [
        [150, 120, '48 Cases'],
        [350, 80, '82 Cases'],
        [550, 40, '120 Cases'],
        [700, 35, '150 Cases']
      ],
      trendLabels: ["JUN", "JUL", "AUG", "SEP", "OCT"],
      trendTitle: 'Monthly Damage Trend',
      trendSubtitle: 'Aggregated distress velocity over trailing 90 days',
      trendChange: '+15.7% vs Prev Period',
      pci: '71.8',
      pciStatus: 'GOOD / SATISFACTORY',
      pciOffset: 70
    },
    year: {
      roads: '10,800', roadsChange: '+35.6% YoY',
      damage: '32,450', damageChange: '+9.1% AI scan rate',
      high: '7,540', highChange: '92% dispatched',
      medium: '13,480', mediumChange: '51% scheduled',
      low: '11,430', lowChange: 'Monitored',
      accuracy: '98.3%', accuracyChange: 'YOLOv12s engine',
      trendPoints: '0,150 50,130 100,145 150,115 200,125 250,95 300,105 350,70 400,80 450,55 500,65 550,35 600,45 650,25 700,20',
      trendPolyPoints: '0,150 50,130 100,145 150,115 200,125 250,95 300,105 350,70 400,80 450,55 500,65 550,35 600,45 650,25 700,20 700,190 0,190',
      trendMarkers: [
        [150, 115, '180 Cases'],
        [350, 70, '340 Cases'],
        [550, 35, '510 Cases'],
        [700, 20, '680 Cases']
      ],
      trendLabels: ["Q1", "Q2", "Q3", "Q4"],
      trendTitle: 'Quarterly Road Anomaly Velocity',
      trendSubtitle: 'Annual cumulative inspected anomalies and road condition trend',
      trendChange: '+18.9% vs Prev Period',
      pci: '73.5',
      pciStatus: 'GOOD / SATISFACTORY',
      pciOffset: 66
    }
  };

  const active = metricsData[timeRange] || metricsData.month;

  const kpiMetrics = [
    { label: 'Total Roads Inspected', value: active.roads, unit: 'corridors', change: active.roadsChange, icon: Layers, color: 'var(--accent-cyan)' },
    { label: 'Total Damage Detected', value: active.damage, unit: 'anomalies', change: active.damageChange, icon: Activity, color: 'var(--accent-blue)' },
    { label: 'High Severity Issues', value: active.high, unit: 'P1 urgent', change: active.highChange, icon: AlertTriangle, color: 'var(--severity-critical)' },
    { label: 'Medium Severity Issues', value: active.medium, unit: 'P2 scheduled', change: active.mediumChange, icon: AlertTriangle, color: 'var(--severity-medium)' },
    { label: 'Low Severity Issues', value: active.low, unit: 'P3 monitor', change: active.lowChange, icon: AlertTriangle, color: 'var(--severity-low)' },
    { label: 'AI Detection Accuracy', value: active.accuracy, unit: 'mAP@50', change: active.accuracyChange, icon: ShieldCheck, color: 'var(--severity-clear)' }
  ];

  // Activity Timeline Events
  const activityStream = [
    { id: 1, type: 'Pothole (D40)', location: 'B.M. Road near Old Bus Stand, Hassan', time: '12 mins ago', severity: 'High', status: 'Work Order #4812 Dispatched', inspector: 'Fleet Dashcam #04' },
    { id: 2, type: 'Alligator Fatigue Crack', location: 'Salagame Road near MCE College, Hassan', time: '34 mins ago', severity: 'High', status: 'Pending Review', inspector: 'Mobile Surveyor Unit 02' },
    { id: 3, type: 'Transverse Thermal Crack', location: 'Gorur Road Bypass Link, Hassan', time: '1 hour ago', severity: 'Medium', status: 'Scheduled (14d)', inspector: 'Municipal Drone Survey' },
    { id: 4, type: 'Surface Rutting', location: 'Belur Road Industrial Zone, Hassan', time: '2.5 hours ago', severity: 'Low', status: 'Logged to GIS', inspector: 'Citizen Mobile App' },
    { id: 5, type: 'Full-Depth Pothole Remediated', location: 'Race Course Road Corridor, Hassan', time: '4 hours ago', severity: 'Clear', status: 'Repaired & Verified', inspector: 'Audit Verification AI' }
  ];

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div className="badge badge-blue" style={{ marginBottom: '0.5rem' }}>
            <BarChart3 size={13} /> SMART-CITY INFRASTRUCTURE INTELLIGENCE
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>
            Municipal Road <span className="text-gradient">Analytics Command Center</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Real-time pavement degradation telemetry, distress velocity, and automated maintenance dispatch tracking.
          </p>
        </div>

        {/* Time Period Filter Pills */}
        <div className="glass-panel" style={{ padding: '0.35rem', display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'week', label: '7 Days' },
            { id: 'month', label: '30 Days' },
            { id: 'quarter', label: 'Quarter' },
            { id: 'year', label: '1 Year' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playBeep(800, 0.02);
                setTimeRange(tab.id);
              }}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: timeRange === tab.id ? 'var(--accent-blue)' : 'transparent',
                color: timeRange === tab.id ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        {kpiMetrics.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {kpi.label}
                </span>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                  <Icon size={16} />
                </div>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {kpi.value}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{kpi.unit}</span>
                <span style={{ color: kpi.color, fontWeight: 600 }}>{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Analytics Row: Line Chart + Pavement Condition Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Distress Detection Trend Velocity (Interactive SVG Line Chart) */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-glass-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{active.trendTitle}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{active.trendSubtitle}</p>
            </div>
            <div className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
              <TrendingUp size={13} /> {active.trendChange}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div style={{ width: '100%', height: '220px', position: 'relative' }}>
            <svg viewBox="0 0 700 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="700" y2="40" stroke="var(--border-subtle)" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="700" y2="90" stroke="var(--border-subtle)" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="700" y2="140" stroke="var(--border-subtle)" strokeDasharray="4 4" />
              <line x1="0" y1="190" x2="700" y2="190" stroke="var(--border-subtle)" />

              {/* Area Fill */}
              <polygon
                points={active.trendPolyPoints}
                fill="url(#chartGradient)"
              />

              {/* Glowing Line */}
              <polyline
                points={active.trendPoints}
                fill="none"
                stroke="url(#strokeGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Point Glowing Markers */}
              {active.trendMarkers.map(([cx, cy, label], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                  <circle cx={cx} cy={cy} r="12" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
                </g>
              ))}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
            {active.trendLabels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>

        {/* Road Condition Score Index (PCI Gauge) */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-glass-strong)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>Overall Network Quality</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Pavement Condition Index (PCI) Score</p>
          </div>

          {/* Circular Gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '1rem 0' }}>
            <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-surface-elevated)" strokeWidth="10" />
                {/* Value Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#strokeGradient)"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={active.pciOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {active.pci}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--severity-clear)', fontWeight: 700, marginTop: '0.2rem' }}>
                  {active.pciStatus}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <strong>DOT Benchmark:</strong> Network target &gt; 70.0 PCI maintained across 92% of designated arterials.
          </div>
        </div>
      </div>

      {/* Secondary Analytics Row: Damage Types Breakdown + Severity Donut + Inspection Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Damage Type Distribution Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>Distress Classification Breakdown</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '1.25rem' }}>Distribution of distress types cataloged by AI</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { type: 'Pothole (D40)', count: '14,240', pct: 39, color: 'var(--severity-critical)' },
              { type: 'Alligator Fatigue (D20)', count: '11,320', pct: 31, color: 'var(--severity-medium)' },
              { type: 'Transverse Joint (D10)', count: '6,450', pct: 18, color: 'var(--accent-blue)' },
              { type: 'Longitudinal Crack (D00)', count: '3,110', pct: 8, color: 'var(--accent-cyan)' },
              { type: 'Surface Ravelling / Rutting', count: '1,160', pct: 4, color: 'var(--accent-purple)' }
            ].map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{item.count} ({item.pct}%)</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: 'var(--bg-surface-elevated)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '9999px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Severity Distribution Donut */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>Distress Severity Tiers</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '1.25rem' }}>Risk priority allocation for maintenance crews</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '1rem 0' }}>
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Critical */}
                <circle cx="50" cy="50" r="35" fill="none" stroke="var(--severity-critical)" strokeWidth="14" strokeDasharray="50 170" strokeDashoffset="0" />
                {/* High */}
                <circle cx="50" cy="50" r="35" fill="none" stroke="var(--severity-high)" strokeWidth="14" strokeDasharray="55 165" strokeDashoffset="-50" />
                {/* Medium */}
                <circle cx="50" cy="50" r="35" fill="none" stroke="var(--severity-medium)" strokeWidth="14" strokeDasharray="75 145" strokeDashoffset="-105" />
                {/* Low */}
                <circle cx="50" cy="50" r="35" fill="none" stroke="var(--severity-low)" strokeWidth="14" strokeDasharray="40 180" strokeDashoffset="-180" />
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--severity-critical)' }} />
                <span>Critical P1 (23%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--severity-medium)' }} />
                <span>Medium P2 (42%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--severity-low)' }} />
                <span>Low P3 (35%)</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              onClick={onNavigateToMap}
            >
              <MapPin size={14} />
              <span>Locate on GIS Map</span>
            </button>
          </div>
        </div>

        {/* Monthly Road Inspection Volume Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>Monthly Inspection Volume</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '1.25rem' }}>Kilometers of lane surveyed by automated units</p>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', padding: '0 0.5rem' }}>
            {[
              { month: 'APR', height: '60%', km: '520km' },
              { month: 'MAY', height: '75%', km: '680km' },
              { month: 'JUN', height: '85%', km: '810km' },
              { month: 'JUL', height: '70%', km: '640km' },
              { month: 'AUG', height: '95%', km: '940km', active: true }
            ].map((bar, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{bar.km}</span>
                <div
                  style={{
                    width: '36px',
                    height: bar.height,
                    borderRadius: '6px 6px 0 0',
                    background: bar.active ? 'linear-gradient(180deg, #06b6d4 0%, #6366f1 100%)' : 'var(--bg-surface-elevated)',
                    boxShadow: bar.active ? '0 0 16px rgba(6, 182, 212, 0.4)' : 'none'
                  }}
                />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: bar.active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>{bar.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detection Activity Live Stream Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Live Detection Activity Stream</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Incoming telemetry from city survey vehicles, dashcams, and mobile units</p>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', gap: '0.4rem' }}
            onClick={onNavigateToDetection}
          >
            <Zap size={14} />
            <span>Launch New Scan</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>DISTRESS TYPE</th>
                <th style={{ padding: '0.75rem 1rem' }}>LOCATION / CORRIDOR</th>
                <th style={{ padding: '0.75rem 1rem' }}>TIME</th>
                <th style={{ padding: '0.75rem 1rem' }}>SEVERITY</th>
                <th style={{ padding: '0.75rem 1rem' }}>INSPECTOR UNIT</th>
                <th style={{ padding: '0.75rem 1rem' }}>WORK ORDER STATUS</th>
              </tr>
            </thead>
            <tbody>
              {activityStream.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.type}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={13} color="var(--accent-blue)" />
                      <span>{item.location}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {item.time}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {item.severity === 'High' ? (
                      <span className="badge badge-high">High</span>
                    ) : item.severity === 'Medium' ? (
                      <span className="badge badge-medium">Medium</span>
                    ) : item.severity === 'Low' ? (
                      <span className="badge badge-low">Low</span>
                    ) : (
                      <span className="badge badge-clear">Repaired</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {item.inspector}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: item.status.includes('Dispatched') ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
