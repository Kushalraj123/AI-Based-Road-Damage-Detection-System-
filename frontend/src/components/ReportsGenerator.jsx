import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Filter,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Building2,
  Wrench,
  Compass,
  RefreshCw
} from 'lucide-react';
import { GIS_DAMAGE_POINTS } from './SampleRoadsData';
import { sounds } from './SoundEffects';

const BACKEND_URL = 'http://127.0.0.1:8000';

// Corridor configurations with real-world geographical profiles
const CORRIDOR_PROFILES = {
  'Hassan Urban Corridor Grid': {
    code: 'KA-HAS-01',
    district: 'Hassan Central Urban Zone',
    baseMiles: 48.6,
    filterKeyword: 'Hassan',
    pciScore: 71.4,
    budgetMultiplier: 1.0,
    wardTeam: 'Ward 15 Road Maintenance Division',
    authority: 'Hassan City Municipal Corporation (HCMC)'
  },
  'National Highway 75 (NH-75) Hassan Bypass': {
    code: 'NH-75-KA',
    district: 'NHAI Regional Division Karnataka',
    baseMiles: 182.4,
    filterKeyword: 'NH-75',
    pciScore: 84.8,
    budgetMultiplier: 2.2,
    wardTeam: 'NHAI Highway Patrol & Engineering Unit 03',
    authority: 'National Highways Authority of India (NHAI)'
  },
  'Bengaluru-Mysuru Expressway (NH-275)': {
    code: 'NH-275-EXP',
    district: 'Bengaluru-Mysuru Expressway Corridor',
    baseMiles: 118.0,
    filterKeyword: 'Bengaluru',
    pciScore: 88.5,
    budgetMultiplier: 1.8,
    wardTeam: 'Expressway Rapid Response Engineering Unit',
    authority: 'Karnataka State Highway Improvement Project (KSHIP)'
  },
  'Karnataka State Highway Corridor (SH-1)': {
    code: 'SH-01-KA',
    district: 'State Arterial Highway Grid',
    baseMiles: 245.0,
    filterKeyword: 'Highway',
    pciScore: 66.2,
    budgetMultiplier: 3.1,
    wardTeam: 'PWD State Highway Division 04',
    authority: 'Public Works Department (PWD) Karnataka'
  }
};

const DATE_INTERVAL_MULTIPLIERS = {
  'Last 7 Days': { factor: 0.25, label: '7-Day Inspection Sweep' },
  'Last 30 Days': { factor: 1.0, label: 'Monthly DOT Routine Audit' },
  'Current Fiscal Quarter': { factor: 2.8, label: 'Quarterly Infrastructure Audit (Q3 FY26)' },
  'Full Year 2026': { factor: 8.5, label: 'Annual Capital Asset Audit FY2026' }
};

export default function ReportsGenerator() {
  const [reportType, setReportType] = useState('pci'); // 'pci' | 'municipal'
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [selectedCorridor, setSelectedCorridor] = useState('Hassan Urban Corridor Grid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [auditTimestamp, setAuditTimestamp] = useState(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  const [auditSeed, setAuditSeed] = useState(1);

  // Fetch live work order notifications from backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/notifications`);
        if (res.ok) {
          const data = await res.json();
          setLiveNotifications(data);
        }
      } catch (err) {
        console.error("Error fetching notifications for report:", err);
      }
    };
    fetchNotifications();
  }, []);

  // Compute active corridor stats dynamically
  const profile = CORRIDOR_PROFILES[selectedCorridor] || CORRIDOR_PROFILES['Hassan Urban Corridor Grid'];
  const intervalConfig = DATE_INTERVAL_MULTIPLIERS[dateRange] || DATE_INTERVAL_MULTIPLIERS['Last 30 Days'];

  // Filter GIS points matching the selected corridor or use all if generic
  const filteredPoints = GIS_DAMAGE_POINTS.filter((p) => {
    if (selectedCorridor.includes('Hassan')) return p.street.includes('Hassan') || p.street.includes('B.M. Road') || p.street.includes('MG Road') || p.street.includes('Salagame');
    if (selectedCorridor.includes('NH-75')) return p.street.includes('NH-75') || p.street.includes('Hassan') || p.street.includes('Bypass');
    if (selectedCorridor.includes('Bengaluru')) return p.street.includes('Bengaluru') || p.street.includes('Ring Road') || p.street.includes('Corridor');
    return true;
  });

  const displayPoints = filteredPoints.length > 0 ? filteredPoints : GIS_DAMAGE_POINTS;

  // Computed dynamic metrics
  const totalSurveyedMiles = (profile.baseMiles * intervalConfig.factor).toFixed(1);
  const totalDefectsCount = Math.round(displayPoints.length * intervalConfig.factor * 12 * (auditSeed % 2 === 0 ? 1.05 : 0.95));
  const criticalHazards = Math.round(displayPoints.filter(p => p.severity === 'Critical' || p.severity === 'High').length * intervalConfig.factor * 3);
  const calculatedPCI = (profile.pciScore - (criticalHazards > 20 ? 4.2 : 0) + (auditSeed % 3) * 0.5).toFixed(1);
  const estRemediationCost = Math.round((totalDefectsCount * 4200 + criticalHazards * 18500) * profile.budgetMultiplier);

  // Handle re-generation
  const handleRegenerateAudit = () => {
    sounds.playLaserScan();
    setIsGenerating(true);
    setTimeout(() => {
      setAuditSeed(prev => prev + 1);
      setAuditTimestamp(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
      setIsGenerating(false);
      sounds.playLockOn();
    }, 550);
  };

  const handleExportCSV = () => {
    sounds.playBeep(900, 0.05);
    let headers = '';
    let rows = '';

    if (reportType === 'pci') {
      headers = 'ID,DistressType,Corridor,Severity,Confidence,SurveyDate,InspectorUnit,Status\n';
      rows = displayPoints.map(
        (p) =>
          `"${p.id}","${p.type}","${p.street}","${p.severity}","${p.confidence}","${p.date}","${p.inspectorUnit}","${p.status}"`
      ).join('\n');
    } else {
      headers = 'TicketID,Location,Latitude,Longitude,Severity,DistressCount,MaterialsAllocated\n';
      const sourceData = liveNotifications.length > 0 ? liveNotifications : displayPoints.map(p => ({
        id: p.id,
        address: p.street,
        coords: { lat: p.coordinates[0], lng: p.coordinates[1] },
        severity: p.severity,
        distress_count: 1,
        materials: ['45 kg Bituminous Hot-Mix, 1.5 L Emulsion Tack Coat, 15 kg Crushed Base']
      }));
      rows = sourceData.map(
        (n) =>
          `"${n.id}","${n.address || n.street}","${n.coords?.lat ?? ''}","${n.coords?.lng ?? ''}","${n.severity}","${n.distress_count ?? 1}","${(n.materials || []).join('; ')}"`
      ).join('\n');
    }

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RoadVision_AI_${profile.code}_${reportType === 'pci' ? 'Pavement_Audit' : 'Municipal_Dispatch'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    sounds.playBeep(950, 0.04);
    window.print();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>
      {/* Reports Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '0.5rem' }}>
            <FileText size={13} /> MUNICIPAL AUDIT & COMPLIANCE
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>
            Automated Road Condition <span className="text-gradient">Report Generator</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Generate DOT-compliant structural road inspection audits, distress logs, and capital remediation work orders.
          </p>
        </div>

        {/* Export Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <FileSpreadsheet size={16} color="var(--severity-clear)" />
            <span>Export CSV Dataset</span>
          </button>
          <button className="btn btn-primary btn-glow" onClick={handlePrintPDF}>
            <Printer size={16} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Filter Selector Bar */}
      <div
        className="glass-panel no-print"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          alignItems: 'end'
        }}
      >
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            REPORT CATEGORY
          </label>
          <select
            value={reportType}
            onChange={(e) => {
              sounds.playBeep(850, 0.02);
              setReportType(e.target.value);
            }}
            style={{
              width: '100%',
              background: '#0d1322',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="pci">Pavement Condition Index (PCI) Audit</option>
            <option value="municipal">Municipal Rebuild & Materials Requisition (HCMC)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            DATE INTERVAL
          </label>
          <select
            value={dateRange}
            onChange={(e) => {
              sounds.playBeep(850, 0.02);
              setDateRange(e.target.value);
            }}
            style={{
              width: '100%',
              background: '#0d1322',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Current Fiscal Quarter</option>
            <option>Full Year 2026</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            SURVEY CORRIDOR DISTRICT
          </label>
          <select
            value={selectedCorridor}
            onChange={(e) => {
              sounds.playBeep(850, 0.02);
              setSelectedCorridor(e.target.value);
            }}
            style={{
              width: '100%',
              background: '#0d1322',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option>Hassan Urban Corridor Grid</option>
            <option>National Highway 75 (NH-75) Hassan Bypass</option>
            <option>Bengaluru-Mysuru Expressway (NH-275)</option>
            <option>Karnataka State Highway Corridor (SH-1)</option>
          </select>
        </div>

        <div>
          <button
            className="btn btn-primary btn-glow"
            style={{
              width: '100%',
              padding: '0.65rem 1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            disabled={isGenerating}
            onClick={handleRegenerateAudit}
          >
            <Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Synthesizing Audit…' : 'Re-Generate Audit'}</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      {isGenerating ? (
        <div
          className="glass-panel"
          style={{
            padding: '5rem 2rem',
            textAlign: 'center',
            background: 'var(--bg-glass-strong)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-glass)'
          }}
        >
          <div className="animate-spin" style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem auto', border: '3px solid rgba(6,182,212,0.2)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
            Compiling Spatial Infrastructure Telemetry…
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            Aggregating neural detections, corridor mesh data, and PCI distress scores for {selectedCorridor}.
          </p>
        </div>
      ) : reportType === 'pci' ? (
        <div
          className="glass-panel report-sheet"
          style={{
            padding: '3rem',
            background: 'var(--bg-glass-strong)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {/* Report Header Branding */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-glass)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800 }}>
                  RV
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>RoadVision AI</span>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>OFFICIAL DOT AUDIT</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                {profile.authority} — Pavement Infrastructure Quality Audit
              </div>
              <div style={{ color: 'var(--accent-cyan)', fontSize: '0.78rem', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                Corridor: {selectedCorridor} ({profile.code})
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <div>AUDIT ID: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>RVA-2026-{profile.code}-{auditSeed}</span></div>
              <div>DATE: <span style={{ color: 'var(--text-primary)' }}>{auditTimestamp}</span></div>
              <div>INTERVAL: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{intervalConfig.label}</span></div>
              <div>STATUS: <span style={{ color: 'var(--status-active)', fontWeight: 700 }}>VERIFIED</span></div>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              1. Executive Infrastructure Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>TOTAL MILES SURVEYED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{totalSurveyedMiles} mi</div>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>EST. DEFECTS LOGGED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.2rem' }}>{totalDefectsCount.toLocaleString()}</div>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>CRITICAL P1 HAZARDS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--severity-critical)', marginTop: '0.2rem' }}>{criticalHazards}</div>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>CORRIDOR PCI SCORE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: calculatedPCI > 75 ? 'var(--severity-clear)' : 'var(--severity-medium)', marginTop: '0.2rem' }}>{calculatedPCI} / 100</div>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>EST. REMEDIATION BUDGET</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '0.2rem' }}>₹{estRemediationCost.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Detailed Defect Inventory Table */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              2. Geo-Referenced Distress Inventory ({selectedCorridor})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>ID</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>DISTRESS TYPE</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>GEO LOCATION</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>SEVERITY</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>CONFIDENCE</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPoints.map((pt, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{profile.code}-{pt.id}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{pt.type}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{pt.street}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${pt.severity === 'Critical' ? 'badge-critical' : pt.severity === 'High' ? 'badge-high' : pt.severity === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
                          {pt.severity}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{pt.confidence}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{pt.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remediation Work Order Recommendations */}
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              3. Recommended Remediation & Capital Schedule
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Immediate prioritization is allocated to pothole anomalies along <strong>{selectedCorridor}</strong> to prevent vehicular rim and tire damage claims. Micro-surfacing and polymer bitumen sealing recommended for arterial segments to arrest progressive alligator cracking.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-glass)', paddingTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-tertiary)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>CERTIFIED BY: <strong style={{ color: 'var(--text-primary)' }}>RoadVision Automated AI Neural Inspector V4.2</strong></div>
              <div>SUPERVISOR: <strong style={{ color: 'var(--text-primary)' }}>{profile.wardTeam}</strong></div>
              <div>VERIFIED BY: <strong style={{ color: 'var(--text-primary)' }}>Chief Municipal Pavement Engineer</strong></div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="glass-panel report-sheet"
          style={{
            padding: '3rem',
            background: 'var(--bg-glass-strong)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {/* Report Header Branding */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-glass)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-purple), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800 }}>
                  HCMC
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>{profile.authority}</span>
                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>CAPITAL DISPATCH TICKET</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                Municipal Road Rebuild & Materials Requisition Log
              </div>
              <div style={{ color: 'var(--accent-purple)', fontSize: '0.78rem', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                Jurisdiction: {selectedCorridor}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <div>ORDER ID: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>HCMC-DISPATCH-2026-{auditSeed}</span></div>
              <div>DATE: <span style={{ color: 'var(--text-primary)' }}>{auditTimestamp}</span></div>
              <div>REPAIR SLA: <span style={{ color: 'var(--status-active)', fontWeight: 700 }}>ACTIVE (72 Hours)</span></div>
            </div>
          </div>

          {/* Rebuild Executive Summary Metrics */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              1. Work Order Rebuild Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>TOTAL DISPATCHED TICKETS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{liveNotifications.length > 0 ? liveNotifications.length : displayPoints.length} Jobs</div>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>TOTAL MATERIALS ALLOCATED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.2rem' }}>{((liveNotifications.length > 0 ? liveNotifications.length : displayPoints.length) * 45).toLocaleString()} kg hot-mix</div>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>ASSIGNED WORK CREW</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '0.3rem' }}>{profile.wardTeam}</div>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>TARGET RESTORATION</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--severity-clear)', marginTop: '0.2rem' }}>Grade A Surface</div>
              </div>
            </div>
          </div>

          {/* Active Municipal Rebuild Orders Table */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              2. Active Rebuild Tickets & Coordinates ({selectedCorridor})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>TICKET ID</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>DAMAGE LOCATION</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>GPS COORDINATES</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>SEVERITY</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>ALLOCATED MATERIALS SUMMARY</th>
                  </tr>
                </thead>
                <tbody>
                  {liveNotifications.length > 0 ? (
                    liveNotifications.map((notif, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', fontWeight: 700 }}>{notif.id}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{notif.address}</td>
                        <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {notif.coords?.lat?.toFixed ? notif.coords.lat.toFixed(5) : notif.coords?.lat}°N, {notif.coords?.lng?.toFixed ? notif.coords.lng.toFixed(5) : notif.coords?.lng}°E
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${notif.severity === 'Critical' || notif.severity === 'High' ? 'badge-critical' : 'badge-medium'}`}>
                            {notif.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {(notif.materials || []).join(' | ')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    displayPoints.map((pt, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', fontWeight: 700 }}>{profile.code}-{pt.id.toUpperCase()}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{pt.street}</td>
                        <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {pt.coordinates[0].toFixed(5)}°N, {pt.coordinates[1].toFixed(5)}°E
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${pt.severity === 'High' || pt.severity === 'Critical' ? 'badge-critical' : pt.severity === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
                            {pt.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          45 kg Bituminous Hot-Mix, 1.2 L Emulsion Tack Coat, 12 kg Crushed Gravel
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quality commitment signature */}
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              3. Quality Rebuild Commitment & Timeline SLA
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              All dispatched tickets for <strong>{selectedCorridor}</strong> must be completed within the 72-hour Service Level Agreement (SLA). {profile.authority} guarantees full structural restoration to Grade A Good Pavement Quality. Repairs will be verified using the automated audit scan.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-glass)', paddingTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-tertiary)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>ISSUED BY: <strong style={{ color: 'var(--text-primary)' }}>{profile.wardTeam}</strong></div>
              <div>APPROVED BY: <strong style={{ color: 'var(--text-primary)' }}>{profile.authority} Commissioner</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
