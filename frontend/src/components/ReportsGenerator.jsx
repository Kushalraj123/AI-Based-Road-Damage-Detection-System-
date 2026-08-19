import React, { useState } from 'react';
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
  Building2
} from 'lucide-react';
import { SAMPLE_ROADS, GIS_DAMAGE_POINTS } from './SampleRoadsData';
import { sounds } from './SoundEffects';

export default function ReportsGenerator() {
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severities');
  const [selectedCorridor, setSelectedCorridor] = useState('San Francisco Metropolitan Grid');
  const [reportGenerated, setReportGenerated] = useState(true);

  const handleExportCSV = () => {
    sounds.playBeep(900, 0.05);
    const headers = 'ID,DistressType,Location,Severity,Confidence,Date,InspectorUnit,Status\n';
    const rows = GIS_DAMAGE_POINTS.map(
      (p) =>
        `"${p.id}","${p.type}","${p.street}","${p.severity}","${p.confidence}","${p.date}","${p.inspectorUnit}","${p.status}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RoadVision_AI_Inspection_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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
          gap: '1rem',
          alignItems: 'center'
        }}
      >
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>
            DATE INTERVAL
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Current Fiscal Quarter</option>
            <option>Full Year 2026</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>
            DISTRESS SEVERITY
          </label>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option>All Severities</option>
            <option>Critical P1 Only</option>
            <option>High & Critical</option>
            <option>Medium P2 Scheduled</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>
            SURVEY CORRIDOR DISTRICT
          </label>
          <select
            value={selectedCorridor}
            onChange={(e) => setSelectedCorridor(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option>San Francisco Metropolitan Grid</option>
            <option>District 4 — Highway 101 Corridor</option>
            <option>District 7 — Bay Bridge & I-80 Approach</option>
            <option>Oakland Arterial Network</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.55rem 1rem' }}
            onClick={() => {
              sounds.playLaserScan();
              setReportGenerated(true);
            }}
          >
            <Sparkles size={16} /> Re-Generate Audit
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
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
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Municipal Department of Transportation Infrastructure Audit
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            <div>AUDIT ID: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>RVA-2026-0819-SF</span></div>
            <div>DATE: <span style={{ color: 'var(--text-primary)' }}>August 19, 2026</span></div>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>842.5 mi</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>TOTAL DEFECTS LOGGED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.2rem' }}>1,420</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>CRITICAL P1 HAZARDS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--severity-critical)', marginTop: '0.2rem' }}>218</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>NETWORK PCI SCORE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--severity-clear)', marginTop: '0.2rem' }}>74.2 / 100</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>EST. REMEDIATION COST</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '0.2rem' }}>₹40,25,000</div>
            </div>
          </div>
        </div>

        {/* Detailed Defect Inventory Table */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            2. Geo-Referenced Distress Inventory
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
                {GIS_DAMAGE_POINTS.map((pt, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{pt.id}</td>
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
            Immediate prioritization is allocated to 218 P1 pothole anomalies to prevent vehicular rim and tire damage claims. Micro-surfacing and slurry sealing recommended for arterial corridors in Q4 2026 to arrest progressive alligator cracking.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-glass)', paddingTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            <div>CERTIFIED BY: <strong style={{ color: 'var(--text-primary)' }}>RoadVision Automated AI Neural Inspector V4.2</strong></div>
            <div>VERIFIED BY: <strong style={{ color: 'var(--text-primary)' }}>Chief Municipal Pavement Engineer</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
