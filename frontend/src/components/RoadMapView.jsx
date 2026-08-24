import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Layers,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Play,
  Square,
  Zap,
  Navigation,
  Crosshair,
  Compass,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GIS_DAMAGE_POINTS, SIMULATED_SURVEY_ROUTE } from './SampleRoadsData';
import { sounds } from './SoundEffects';

export default function RoadMapView({ onInspectItem, syncedIncident }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const surveyVehicleMarkerRef = useRef(null);
  const surveyPolylineRef = useRef(null);

  const [pointsList, setPointsList] = useState(GIS_DAMAGE_POINTS);
  const [selectedDamage, setSelectedDamage] = useState(syncedIncident || GIS_DAMAGE_POINTS[0]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [damageTypeFilter, setDamageTypeFilter] = useState('ALL');
  const [isSurveyRunning, setIsSurveyRunning] = useState(false);
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [surveyLog, setSurveyLog] = useState([]);
  const surveyTimerRef = useRef(null);

  // Sync incident handling when received from Detection Studio
  useEffect(() => {
    if (syncedIncident && syncedIncident.coordinates) {
      setPointsList(prev => {
        const exists = prev.some(p => p.id === syncedIncident.id || (p.coordinates[0] === syncedIncident.coordinates[0] && p.coordinates[1] === syncedIncident.coordinates[1]));
        if (exists) {
          return prev.map(p => p.id === syncedIncident.id ? syncedIncident : p);
        }
        return [syncedIncident, ...prev];
      });

      setSelectedDamage(syncedIncident);

      // Pan/Fly map directly to synced incident location
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current.flyTo(
            [syncedIncident.coordinates[0], syncedIncident.coordinates[1]],
            13,
            { animate: true, duration: 1.2 }
          );
        }, 200);
      }
    }
  }, [syncedIncident]);

  // Initialize Leaflet Map with Google Maps Light Mode tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = syncedIncident?.coordinates || [13.2000, 76.5000];
    const initialZoom = syncedIncident?.coordinates ? 13 : 8;

    // Create Leaflet Map centered on target
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: false
    });

    // Google Maps Light Mode Roadmap Basemap
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: 20
    }).addTo(map);

    // Layer group for distress markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Render initial markers
    const initialList = syncedIncident
      ? [syncedIncident, ...GIS_DAMAGE_POINTS.filter(p => p.id !== syncedIncident.id)]
      : GIS_DAMAGE_POINTS;

    renderMarkers(markersLayer, initialList);

    // Invalidate size on load to guarantee proper canvas dimensions
    setTimeout(() => {
      map.invalidateSize();
      if (syncedIncident?.coordinates) {
        map.flyTo([syncedIncident.coordinates[0], syncedIncident.coordinates[1]], 13, { animate: true, duration: 1.0 });
      }
    }, 200);

    return () => {
      if (surveyTimerRef.current) clearInterval(surveyTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Re-render markers whenever filters or pointsList change
  useEffect(() => {
    if (markersLayerRef.current) {
      renderMarkers(markersLayerRef.current, pointsList);
    }
  }, [pointsList, severityFilter, damageTypeFilter]);

  // Update Markers on Filter or Points Change
  const renderMarkers = (layerGroup, points) => {
    if (!layerGroup || !mapInstanceRef.current) return;
    
    // Clear old markers
    layerGroup.clearLayers();

    const filtered = points.filter((p) => {
      const matchSev = severityFilter === 'ALL' || p.severity.toUpperCase() === severityFilter;
      const matchType = damageTypeFilter === 'ALL' || p.type.includes(damageTypeFilter);
      return matchSev && matchType;
    });

    filtered.forEach((pt) => {
      const isSynced = syncedIncident && (pt.id === syncedIncident.id || (pt.coordinates[0] === syncedIncident.coordinates[0] && pt.coordinates[1] === syncedIncident.coordinates[1]));
      
      const color =
        pt.severity === 'Critical'
          ? '#f43f5e'
          : pt.severity === 'High'
          ? '#ef4444'
          : pt.severity === 'Medium'
          ? '#f59e0b'
          : pt.severity === 'Low'
          ? '#38bdf8'
          : '#10b981';

      // Custom Glowing DivIcon with special beacon for synced incident
      const customIcon = L.divIcon({
        className: 'custom-gis-pin',
        html: isSynced ? `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: #06b6d4;
              opacity: 0.5;
              animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #06b6d4;
              border: 3px solid #ffffff;
              box-shadow: 0 0 16px #06b6d4;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 10px;
              font-weight: 900;
            ">★</div>
          </div>
        ` : `
          <div style="
            position: relative;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: ${color};
              opacity: 0.35;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: ${color};
              border: 2px solid #ffffff;
              box-shadow: 0 0 10px ${color};
            "></div>
          </div>
        `,
        iconSize: isSynced ? [32, 32] : [22, 22],
        iconAnchor: isSynced ? [16, 16] : [11, 11],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([pt.coordinates[0], pt.coordinates[1]], { icon: customIcon });

      // Click behavior
      marker.on('click', () => {
        sounds.playLockOn();
        setSelectedDamage(pt);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([pt.coordinates[0], pt.coordinates[1]], { animate: true, duration: 0.6 });
        }
      });

      // Bind rich popup
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 2px;">
            ${isSynced ? '★ ' : ''}${pt.type}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            ${pt.street}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            <span>Conf: <strong>${pt.confidence}</strong></span>
            <span>Sev: <strong style="color: ${color}">${pt.severity}</strong></span>
          </div>
        </div>
      `);

      layerGroup.addLayer(marker);
    });
  };

  // Autonomous Road Survey Simulator Loop
  const startAutonomousSurvey = () => {
    if (isSurveyRunning) {
      // Stop survey
      clearInterval(surveyTimerRef.current);
      setIsSurveyRunning(false);
      sounds.playBeep(400, 0.05);

      if (surveyVehicleMarkerRef.current && markersLayerRef.current) {
        markersLayerRef.current.removeLayer(surveyVehicleMarkerRef.current);
      }
      if (surveyPolylineRef.current && markersLayerRef.current) {
        markersLayerRef.current.removeLayer(surveyPolylineRef.current);
      }
      return;
    }

    // Start survey
    sounds.playLaserScan();
    setIsSurveyRunning(true);
    let idx = 0;

    const route = SIMULATED_SURVEY_ROUTE;
    const traveledPoints = [];

    // Vehicle custom DivIcon
    const vehicleIcon = L.divIcon({
      className: 'survey-vehicle-icon',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #06b6d4;
          border: 2px solid #ffffff;
          box-shadow: 0 0 15px #06b6d4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: bold;
          font-size: 12px;
        ">
          🚗
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    surveyTimerRef.current = setInterval(() => {
      if (idx >= route.length) {
        clearInterval(surveyTimerRef.current);
        setIsSurveyRunning(false);
        sounds.playLockOn();
        return;
      }

      const step = route[idx];
      setSurveyIndex(idx);
      traveledPoints.push([step.lat, step.lng]);

      // Add to event log
      const logEntry = `[${new Date().toLocaleTimeString()}] ${step.street} — ${step.event}`;
      setSurveyLog((prev) => [logEntry, ...prev.slice(0, 6)]);

      if (mapInstanceRef.current && markersLayerRef.current) {
        // Update/create vehicle marker
        if (surveyVehicleMarkerRef.current) {
          surveyVehicleMarkerRef.current.setLatLng([step.lat, step.lng]);
        } else {
          surveyVehicleMarkerRef.current = L.marker([step.lat, step.lng], { icon: vehicleIcon }).addTo(
            markersLayerRef.current
          );
        }

        // Draw polyline
        if (surveyPolylineRef.current) {
          surveyPolylineRef.current.setLatLngs(traveledPoints);
        } else {
          surveyPolylineRef.current = L.polyline(traveledPoints, {
            color: '#06b6d4',
            weight: 4,
            opacity: 0.8,
            dashArray: '6, 8'
          }).addTo(markersLayerRef.current);
        }

        // Smooth pan
        mapInstanceRef.current.panTo([step.lat, step.lng], { animate: true, duration: 0.4 });
      }

      idx++;
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '0.5rem', width: 'fit-content' }}>
            <MapPin size={13} /> SPATIAL GIS DIGITAL TWIN
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>
            Geospatial Road <span className="text-gradient">Damage Map</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Interactive geographical distribution of detected road distresses, severity clusters, and survey vehicle routes.
          </p>
        </div>

        {/* Autonomous Survey Trigger */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className={`btn ${isSurveyRunning ? 'btn-secondary' : 'btn-primary btn-glow'}`}
            onClick={startAutonomousSurvey}
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
          >
            {isSurveyRunning ? <Square size={16} color="var(--severity-critical)" /> : <Play size={16} />}
            <span>{isSurveyRunning ? 'Halt Survey Simulator' : 'Start Autonomous Road Survey'}</span>
          </button>
        </div>
      </div>

      {/* ── Active Synced Incident Notification Banner ──────────── */}
      {syncedIncident && (
        <div
          className="glass-panel"
          style={{
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderRadius: '10px',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 10px var(--accent-cyan)', animation: 'ping 1.5s infinite' }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span>LIVE INCIDENT SYNCED FROM STUDIO</span>
                <span className="mono-tag" style={{ color: 'var(--accent-cyan)' }}>FOCUSED ON MAP</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {syncedIncident.type} • {syncedIncident.street} • Coordinates: {syncedIncident.coordinates[0].toFixed(5)}°N, {syncedIncident.coordinates[1].toFixed(5)}°E
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              sounds.playLockOn();
              setSelectedDamage(syncedIncident);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([syncedIncident.coordinates[0], syncedIncident.coordinates[1]], 14, { animate: true, duration: 1.0 });
              }
            }}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', gap: '0.35rem' }}
          >
            <Crosshair size={13} /> Focus Incident Pin
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Severity Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            SEVERITY:
          </span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAR'].map((sev) => (
            <button
              key={sev}
              onClick={() => {
                sounds.playBeep(750, 0.02);
                setSeverityFilter(sev);
              }}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: 'none',
                background: severityFilter === sev ? 'var(--accent-blue)' : 'var(--bg-surface-elevated)',
                color: severityFilter === sev ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Damage Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            DISTRESS TYPE:
          </span>
          <select
            value={damageTypeFilter}
            onChange={(e) => setDamageTypeFilter(e.target.value)}
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem'
            }}
          >
            <option value="ALL">All Distress Classes</option>
            <option value="Pothole">Potholes (D40)</option>
            <option value="Alligator">Alligator Cracks (D20)</option>
            <option value="Transverse">Transverse Cracks (D10)</option>
            <option value="Ravelling">Surface Ravelling</option>
          </select>
        </div>
      </div>

      {/* Main Map + Details Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Leaflet Map Container */}
        <div
          className="glass-panel"
          style={{
            padding: '0.5rem',
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}
        >
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '560px',
              borderRadius: 'calc(var(--radius-lg) - 4px)',
              background: '#090d16',
              zIndex: 1
            }}
          />

          {/* Map Compass & HUD Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 500,
              background: 'rgba(10, 15, 29, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <Compass size={16} />
            <span>GIS KARNATAKA STATE GRID</span>
          </div>
        </div>

        {/* Selected Marker Distress Detail Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {selectedDamage ? (
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-glass-strong)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="mono-tag" style={{ color: 'var(--accent-cyan)' }}>
                  {selectedDamage.id?.startsWith('gis-sync') ? '★ SYNCED INCIDENT' : 'GIS INSPECTION PIN'}
                </span>
                <span
                  className={`badge ${
                    selectedDamage.severity === 'Critical'
                      ? 'badge-critical'
                      : selectedDamage.severity === 'High'
                      ? 'badge-high'
                      : selectedDamage.severity === 'Medium'
                      ? 'badge-medium'
                      : 'badge-low'
                  }`}
                >
                  {selectedDamage.severity} Severity
                </span>
              </div>

              {/* Photo Preview */}
              <div style={{ width: '100%', height: '160px', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                <img
                  src={selectedDamage.image}
                  alt={selectedDamage.type}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.65rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  📍 {selectedDamage.coordinates[0].toFixed(5)}°N, {selectedDamage.coordinates[1].toFixed(5)}°E
                </div>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {selectedDamage.type}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                <MapPin size={14} color="var(--accent-blue)" />
                <span>{selectedDamage.street}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.78rem' }}>
                <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ color: 'var(--text-tertiary)' }}>Confidence</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedDamage.confidence}</div>
                </div>
                <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ color: 'var(--text-tertiary)' }}>Detection Date</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{selectedDamage.date}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>Surveyor Unit</div>
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{selectedDamage.inspectorUnit}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Status: {selectedDamage.status}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    sounds.playLockOn();
                    alert(`Work Order dispatched for ${selectedDamage.street}`);
                  }}
                >
                  <Zap size={14} /> Dispatch Crew
                </button>
                <a
                  href={`https://www.google.com/maps?q=${selectedDamage.coordinates[0]},${selectedDamage.coordinates[1]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 0.85rem', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ExternalLink size={14} /> Open Maps
                </a>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Click any pin on the GIS map to inspect details.
            </div>
          )}

          {/* Live Survey Vehicle Telemetry Stream Log */}
          {isSurveyRunning && (
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-canvas)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <span>// SURVEY VEHICLE DASHCAM STREAM</span>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>RECORDING</span>
              </div>
              <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {surveyLog.map((log, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.2rem' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
