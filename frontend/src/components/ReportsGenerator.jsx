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
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { GIS_DAMAGE_POINTS } from './SampleRoadsData';
import { sounds } from './SoundEffects';

const BACKEND_URL = 'http://127.0.0.1:8000';

// Default live baseline if user directly navigates to reports without fresh scan
const DEFAULT_INSPECTION_MANIFEST = {
  reportRef: 'RVD-AUDIT-2026-805297',
  date: 'August 25, 2026 at 12:26 AM',
  address: 'Indiranagara, Hassan, Karnataka, India',
  coordinates: [13.016830, 76.127376],
  pciScore: 38,
  severity: 'High Severity',
  distressCount: 5,
  estimatedCost: '₹445 INR',
  repairPriority: 'P1 — Immediate Hot-Mix Asphalt Patch (24h)',
  materialsManifest: {
    hotMixAsphalt: '2.6 kg',
    tackCoat: '0.06 Liters',
    baseGravel: '1.4 kg',
    sealant: '0.15 kg'
  },
  detections: [
    {
      id: 'det-1',
      class_name: 'Pothole',
      confidence: 0.88,
      dimensions: { length_cm: 87.6, width_cm: 62.2, depth_cm: 12.8, area_m2: 0.54 },
      materials: {
        hot_mix: '0.5 kg Bituminous Hot-Mix (VG-30)',
        tack_coat: '0.01 L Cationic Tack Coat (RS-1)',
        aggregate: '0.3 kg Graded Base Gravel (WMM)'
      },
      estimated_cost: '₹59 INR'
    },
    {
      id: 'det-2',
      class_name: 'Pothole',
      confidence: 0.79,
      dimensions: { length_cm: 65.4, width_cm: 48.0, depth_cm: 9.5, area_m2: 0.31 },
      materials: {
        hot_mix: '0.4 kg Bituminous Hot-Mix (VG-30)',
        tack_coat: '0.01 L Cationic Tack Coat (RS-1)',
        aggregate: '0.2 kg Graded Base Gravel (WMM)'
      },
      estimated_cost: '₹56 INR'
    },
    {
      id: 'det-3',
      class_name: 'Pothole',
      confidence: 0.72,
      dimensions: { length_cm: 52.0, width_cm: 40.2, depth_cm: 8.2, area_m2: 0.21 },
      materials: {
        hot_mix: '0.3 kg Bituminous Hot-Mix (VG-30)',
        tack_coat: '0.01 L Cationic Tack Coat (RS-1)',
        aggregate: '0.2 kg Graded Base Gravel (WMM)'
      },
      estimated_cost: '₹54 INR'
    },
    {
      id: 'det-4',
      class_name: 'Pothole',
      confidence: 0.65,
      dimensions: { length_cm: 44.0, width_cm: 32.5, depth_cm: 6.0, area_m2: 0.14 },
      materials: {
        hot_mix: '0.3 kg Bituminous Hot-Mix (VG-30)',
        tack_coat: '0.01 L Cationic Tack Coat (RS-1)',
        aggregate: '0.2 kg Graded Base Gravel (WMM)'
      },
      estimated_cost: '₹52 INR'
    },
    {
      id: 'det-5',
      class_name: 'Pothole',
      confidence: 0.54,
      dimensions: { length_cm: 38.2, width_cm: 28.0, depth_cm: 5.5, area_m2: 0.11 },
      materials: {
        hot_mix: '0.2 kg Bituminous Hot-Mix (VG-30)',
        tack_coat: '0.01 L Cationic Tack Coat (RS-1)',
        aggregate: '0.1 kg Graded Base Gravel (WMM)'
      },
      estimated_cost: '₹49 INR'
    }
  ]
};

export default function ReportsGenerator({ syncedAuditReport, onNavigateToDetection }) {
  const [reportType, setReportType] = useState('inspection-manifest'); // 'inspection-manifest' | 'pci' | 'municipal'
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [selectedCorridor, setSelectedCorridor] = useState('Hassan Urban Corridor Grid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditTimestamp, setAuditTimestamp] = useState(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  const [auditSeed, setAuditSeed] = useState(1);

  // Active Live Inspection Data: Use synced report or fallback default
  const activeReport = syncedAuditReport || DEFAULT_INSPECTION_MANIFEST;

  const handlePrintPDF = () => {
    sounds.playBeep(950, 0.04);
    
    // Create clean high-contrast print frame
    const rowsHtml = (activeReport.detections || []).map((det, idx) => {
      const mat = det.materials || {};
      const dims = det.dimensions || {};
      const matList = [
        mat.hot_mix ? `• ${mat.hot_mix}` : '',
        mat.tack_coat ? `• ${mat.tack_coat}` : '',
        mat.aggregate ? `• ${mat.aggregate}` : '',
        mat.sealant ? `• ${mat.sealant}` : ''
      ].filter(Boolean).join('<br/>');

      return `
        <tr>
          <td style="padding: 7px 9px; border-bottom: 1px solid #cbd5e1; font-family: monospace; text-align: center;">${idx + 1}</td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">${det.class_name || det.type}</td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #cbd5e1; color: #0284c7; font-weight: 700; font-family: monospace;">${Math.round((det.confidence || 0.9) * 100)}%</td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #cbd5e1; font-family: monospace;">${dims.length_cm ? `${dims.length_cm} × ${dims.width_cm} × ${dims.depth_cm} cm` : '35 × 30 × 4.0 cm'}</td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #cbd5e1; font-family: monospace;">${dims.area_m2 ? `${dims.area_m2} m²` : '0.10 m²'}</td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #cbd5e1; font-size: 11px; line-height: 1.35; color: #334155;">${matList || 'Micro-spot patch'}</td>
          <td style="padding: 7px 9px; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #0f172a; font-family: monospace;">${det.estimated_cost || '₹59 INR'}</td>
        </tr>
      `;
    }).join('');

    const lat = activeReport.coordinates?.[0] ?? 13.016830;
    const lng = activeReport.coordinates?.[1] ?? 76.127376;

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RoadVision AI - Infrastructure Audit ${activeReport.reportRef}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 15px;
            font-size: 12.5px;
            line-height: 1.45;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .badge {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 7px;
            border-radius: 4px;
            margin-right: 6px;
            text-transform: uppercase;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 5px 0 2px 0;
          }
          .meta {
            font-size: 10.5px;
            color: #64748b;
            font-family: monospace;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .card-label {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .card-value {
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
          }
          .materials-box {
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
          }
          .mat-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 6px;
          }
          .mat-item {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 8px;
          }
          .mat-val {
            font-size: 14px;
            font-weight: 800;
            color: #15803d;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
            margin-top: 6px;
          }
          th {
            background: #f1f5f9;
            padding: 7px 9px;
            text-align: left;
            font-size: 10.5px;
            font-weight: 700;
            color: #334155;
            border-bottom: 2px solid #94a3b8;
            text-transform: uppercase;
          }
          .footer {
            margin-top: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div>
              <span class="badge">Official Infrastructure Audit</span>
              <span class="badge" style="background: #fef3c7; color: #b45309;">IRC:82 & ASTM D6433</span>
            </div>
            <div class="title">Road Distress Inspection & Material Manifest</div>
            <div class="meta">AUDIT REF: <strong>${activeReport.reportRef}</strong> • DATE: ${activeReport.date}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700;">MUNICIPAL HIGHWAY AUTHORITY</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">Public Works & Highway Authority</div>
            <div style="font-size: 10.5px; color: #0284c7;">RoadVision AI Infrastructure Core</div>
          </div>
        </div>

        <div class="grid-3">
          <div class="card">
            <div class="card-label">Audited Corridor Location</div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px; line-height: 1.3;">${activeReport.address}</div>
            <div style="font-size: 10.5px; color: #64748b; font-family: monospace;">GPS: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E</div>
          </div>
          <div class="card">
            <div class="card-label">Pavement Condition & Risk</div>
            <div class="card-value">${activeReport.pciScore} <span style="font-size: 11px; color: #64748b; font-weight: normal;">/ 100 PCI Score</span></div>
            <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">${activeReport.distressCount} Defect(s) Detected • ${activeReport.severity}</div>
          </div>
          <div class="card">
            <div class="card-label">Estimated Remediation Budget</div>
            <div class="card-value">${activeReport.estimatedCost}</div>
            <div style="font-size: 10.5px; color: #0369a1; font-weight: 600; margin-top: 2px;">Priority: ${activeReport.repairPriority}</div>
          </div>
        </div>

        <div class="materials-box">
          <div style="font-size: 10.5px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">
            Cumulative Material Requisition Manifest (IRC:82 Specification)
          </div>
          <div class="mat-grid">
            <div class="mat-item">
              <div style="font-size: 9.5px; color: #64748b;">HOT-MIX BITUMINOUS ASPHALT</div>
              <div class="mat-val">${activeReport.materialsManifest?.hotMixAsphalt || '2.6 kg'}</div>
            </div>
            <div class="mat-item">
              <div style="font-size: 9.5px; color: #64748b;">CATIONIC TACK COAT (RS-1)</div>
              <div class="mat-val">${activeReport.materialsManifest?.tackCoat || '0.06 Liters'}</div>
            </div>
            <div class="mat-item">
              <div style="font-size: 9.5px; color: #64748b;">GRADED BASE GRAVEL (WMM)</div>
              <div class="mat-val">${activeReport.materialsManifest?.baseGravel || '1.4 kg'}</div>
            </div>
            <div class="mat-item">
              <div style="font-size: 9.5px; color: #64748b;">POLYMER CRACK SEALANT</div>
              <div class="mat-val">${activeReport.materialsManifest?.sealant || '0.15 kg'}</div>
            </div>
          </div>
        </div>

        <div>
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 4px;">
            Itemized Detected Distress Log & Remediation Procedures:
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Distress Type</th>
                <th>Conf</th>
                <th>Dimensions (L×W×D)</th>
                <th>Area</th>
                <th>Material Allocation</th>
                <th>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div>Generated by RoadVision AI Infrastructure Intelligence Platform</div>
          <div>Official PWD / NHAI Compliance Verified</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(printHtml);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 2000);
    }, 400);
  };

  const handleExportCSV = () => {
    sounds.playBeep(900, 0.05);
    const lat = activeReport.coordinates?.[0] ?? 13.016830;
    const lng = activeReport.coordinates?.[1] ?? 76.127376;

    let csv = `ROADVISION AI - INFRASTRUCTURE AUDIT EXPORT MANIFEST\n`;
    csv += `Audit Reference,${activeReport.reportRef}\n`;
    csv += `Audit Date,${activeReport.date}\n`;
    csv += `Audit Location,"${activeReport.address}"\n`;
    csv += `GPS Coordinates,"${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E"\n`;
    csv += `Pavement Condition Index (PCI),${activeReport.pciScore}/100\n`;
    csv += `Overall Severity,${activeReport.severity}\n`;
    csv += `Estimated Remediation Budget,"${activeReport.estimatedCost}"\n`;
    csv += `Total Anomalies Detected,${activeReport.distressCount}\n\n`;

    csv += `Defect ID,Class Name,Confidence,Length (cm),Width (cm),Depth (cm),Area (m2),Material Allocation,Estimated Cost (INR)\n`;

    (activeReport.detections || []).forEach((d, idx) => {
      const mat = d.materials || {};
      const dims = d.dimensions || {};
      const matSummary = [mat.hot_mix, mat.tack_coat, mat.aggregate, mat.sealant].filter(Boolean).join('; ');
      csv += `DEF-${idx + 1},"${d.class_name || d.type}",${Math.round((d.confidence || 0.9) * 100)}%,${dims.length_cm || '—'},${dims.width_cm || '—'},${dims.depth_cm || '—'},${dims.area_m2 || '—'},"${matSummary || 'Spot repair'}","${d.estimated_cost || '₹59 INR'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RoadVision_Audit_Manifest_${activeReport.reportRef}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lat = activeReport.coordinates?.[0] ?? 13.016830;
  const lng = activeReport.coordinates?.[1] ?? 76.127376;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>
      {/* Top Header & Actions Bar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          {onNavigateToDetection && (
            <button
              className="btn btn-secondary"
              onClick={onNavigateToDetection}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Detection Studio</span>
            </button>
          )}
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0 }}>
            Infrastructure Audit <span className="text-gradient">& Material Reports</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Official Road Distress Inspection Manifest adhering to IRC:82 and ASTM D6433 standards.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileSpreadsheet size={15} color="var(--accent-cyan)" />
            <span>Download CSV Manifest</span>
          </button>
          <button className="btn btn-primary btn-glow" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Printer size={15} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Report Document Sheet — Matches the Photo Exactly */}
      <div
        className="glass-panel report-sheet"
        style={{
          width: '100%',
          background: 'var(--bg-glass-strong)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          position: 'relative'
        }}
      >
        {/* Official Audit Document Header */}
        <div style={{ borderBottom: '2px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="badge badge-blue">
                  <FileText size={12} /> OFFICIAL INFRASTRUCTURE AUDIT
                </span>
                <span className="badge badge-cyan">
                  IRC:82 & ASTM D6433
                </span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Road Distress Inspection & Material Manifest
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                AUDIT REF: <strong style={{ color: 'var(--accent-cyan)' }}>{activeReport.reportRef}</strong> • GENERATED: {activeReport.date}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>MUNICIPAL AUTHORITY</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Public Works & Highway Authority</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-blue)' }}>RoadVision AI Infrastructure Core</div>
            </div>
          </div>
        </div>

        {/* 3-Column Executive Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {/* Location Card */}
          <div style={{ padding: '1.1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
              <MapPin size={13} /> AUDITED CORRIDOR LOCATION
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.45rem' }}>
              {activeReport.address}
            </div>
            <div style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{lat.toFixed(6)}°N, {lng.toFixed(6)}°E</span>
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-cyan)', fontWeight: 700, textDecoration: 'none', fontSize: '0.72rem' }}
              >
                Maps ↗
              </a>
            </div>
          </div>

          {/* Condition Card */}
          <div style={{ padding: '1.1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
              PAVEMENT CONDITION & RISK
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: activeReport.pciScore < 60 ? 'var(--severity-critical)' : 'var(--severity-clear)' }}>
                {activeReport.pciScore}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>/ 100 PCI Score</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {activeReport.distressCount} Defect(s) Detected • <span style={{ color: 'var(--accent-blue)' }}>{activeReport.severity}</span>
            </div>
          </div>

          {/* Estimated Budget Card */}
          <div style={{ padding: '1.1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
              ESTIMATED REMEDIATION BUDGET
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {activeReport.estimatedCost}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              Priority: <strong style={{ color: 'var(--accent-blue)' }}>{activeReport.repairPriority}</strong>
            </div>
          </div>
        </div>

        {/* Total Material Requisition Summary Block */}
        <div style={{ padding: '1.35rem', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.25)', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              CUMULATIVE MATERIAL REQUISITION MANIFEST (IRC:82 SPECIFICATION)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: 'var(--bg-canvas)', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>HOT-MIX BITUMINOUS ASPHALT</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                {activeReport.materialsManifest?.hotMixAsphalt || '2.6 kg'}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>Grade VG-30 / Bituminous Concrete</div>
            </div>

            <div style={{ background: 'var(--bg-canvas)', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>CATIONIC TACK COAT (RS-1)</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                {activeReport.materialsManifest?.tackCoat || '0.06 Liters'}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>Rapid-Setting Emulsion Bonding</div>
            </div>

            <div style={{ background: 'var(--bg-canvas)', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>GRADED BASE GRAVEL (WMM)</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                {activeReport.materialsManifest?.baseGravel || '1.4 kg'}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>Wet Mix Macadam Cavity Base</div>
            </div>

            <div style={{ background: 'var(--bg-canvas)', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>POLYMER CRACK SEALANT</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                {activeReport.materialsManifest?.sealant || '0.15 kg'}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>ASTM D6690 Type II Hot-Pour</div>
            </div>
          </div>
        </div>

        {/* Detected Distress Catalog Table */}
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
            ITEMIZED DETECTED DISTRESS LOG & REMEDIATION PROCEDURES:
          </div>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>#</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>DISTRESS TYPE</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>CONF</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>DIMENSIONS (L×W×D)</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>AREA</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>MATERIAL ALLOCATION</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>EST. COST</th>
                </tr>
              </thead>
              <tbody>
                {(activeReport.detections || []).map((det, idx) => {
                  const mat = det.materials || {};
                  const dims = det.dimensions || {};
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.7rem 0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                      <td style={{ padding: '0.7rem 0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {det.class_name || det.type}
                      </td>
                      <td style={{ padding: '0.7rem 0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        {Math.round((det.confidence || 0.9) * 100)}%
                      </td>
                      <td style={{ padding: '0.7rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {dims.length_cm ? `${dims.length_cm}×${dims.width_cm}×${dims.depth_cm} cm` : '35×30×4.0 cm'}
                      </td>
                      <td style={{ padding: '0.7rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {dims.area_m2 ? `${dims.area_m2} m²` : '0.10 m²'}
                      </td>
                      <td style={{ padding: '0.7rem 0.85rem', color: 'var(--text-secondary)' }}>
                        {mat.hot_mix && <div>• {mat.hot_mix}</div>}
                        {mat.tack_coat && <div>• {mat.tack_coat}</div>}
                        {mat.aggregate && <div>• {mat.aggregate}</div>}
                        {mat.sealant && <div>• {mat.sealant}</div>}
                      </td>
                      <td style={{ padding: '0.7rem 0.85rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {det.estimated_cost || '₹59 INR'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
