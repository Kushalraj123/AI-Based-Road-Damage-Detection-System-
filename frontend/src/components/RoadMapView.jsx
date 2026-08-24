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
  Sparkles
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GIS_DAMAGE_POINTS, SIMULATED_SURVEY_ROUTE } from './SampleRoadsData';
import { sounds } from './SoundEffects';

export default function RoadMapView({ onInspectItem }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const surveyVehicleMarkerRef = useRef(null);
  const surveyPolylineRef = useRef(null);

  const [selectedDamage, setSelectedDamage] = useState(GIS_DAMAGE_POINTS[0]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [damageTypeFilter, setDamageTypeFilter] = useState('ALL');
  const [isSurveyRunning, setIsSurveyRunning] = useState(false);
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [surveyLog, setSurveyLog] = useState([]);
  const surveyTimerRef = useRef(null);

  // Initialize Leaflet Map with Google Maps Light Mode tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Leaflet Map centered on Karnataka State
    const map = L.map(mapContainerRef.current, {
      center: [14.8000, 75.9000],
      zoom: 7,
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
    renderMarkers(markersLayer, GIS_DAMAGE_POINTS);

    // Invalidate size on load to guarantee proper canvas dimensions
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (surveyTimerRef.current) clearInterval(surveyTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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

      // Custom Glowing DivIcon
      const customIcon = L.divIcon({
        className: 'custom-gis-pin',
        html: `
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
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11]
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

      // Tooltip
      marker.bindTooltip(`<b>${pt.type}</b><br/><span style="font-size:0.75rem; color:${color}">${pt.severity} Severity</span>`, {
        className: 'glass-tooltip',
        direction: 'top',
        offset: [0, -8]
      });

      layerGroup.addLayer(marker);
    });
  };

  useEffect(() => {
    if (markersLayerRef.current) {
      renderMarkers(markersLayerRef.current, GIS_DAMAGE_POINTS);
    }
  }, [severityFilter, damageTypeFilter]);

  // Autonomous Road Survey Simulator Loop
  const startAutonomousSurvey = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isSurveyRunning) {
      if (surveyTimerRef.current) clearInterval(surveyTimerRef.current);
      setIsSurveyRunning(false);
      
      if (surveyVehicleMarkerRef.current) {
        map.removeLayer(surveyVehicleMarkerRef.current);
        surveyVehicleMarkerRef.current = null;
      }
      if (surveyPolylineRef.current) {
        map.removeLayer(surveyPolylineRef.current);
        surveyPolylineRef.current = null;
      }
      return;
    }

    setIsSurveyRunning(true);
    sounds.playLaserScan();
    let currentIdx = 0;
    setSurveyIndex(0);
    setSurveyLog([`[${new Date().toLocaleTimeString()}] Autonomous Survey Vehicle Alpha launched.`]);

    // Draw route path
    const routeCoordinates = SIMULATED_SURVEY_ROUTE.map((r) => [r.lat, r.lng]);
    if (surveyPolylineRef.current) {
      map.removeLayer(surveyPolylineRef.current);
    }
    
    surveyPolylineRef.current = L.polyline(routeCoordinates, {
      color: '#06b6d4',
      weight: 4,
      opacity: 0.85,
      dashArray: '6, 8'
    }).addTo(map);

    // Custom Vehicle Icon
    const vehicleIcon = L.divIcon({
      className: 'custom-survey-vehicle',
      html: `
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
            opacity: 0.4;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #0f172a;
            border: 2px solid #06b6d4;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 14px #06b6d4;
          ">
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 8px solid #38bdf8;"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (surveyVehicleMarkerRef.current) {
      map.removeLayer(surveyVehicleMarkerRef.current);
    }

    surveyVehicleMarkerRef.current = L.marker(routeCoordinates[0], { icon: vehicleIcon }).addTo(map);
    map.setView(routeCoordinates[0], 12);

    surveyTimerRef.current = setInterval(() => {
      currentIdx++;
      if (currentIdx >= SIMULATED_SURVEY_ROUTE.length) {
        clearInterval(surveyTimerRef.current);
        setIsSurveyRunning(false);
        setSurveyLog((prev) => [
          `[${new Date().toLocaleTimeString()}] Survey complete. 6 road segments scanned.`,
          ...prev
        ]);
        sounds.playLockOn();
        
        if (surveyVehicleMarkerRef.current) {
          map.removeLayer(surveyVehicleMarkerRef.current);
          surveyVehicleMarkerRef.current = null;
        }
        if (surveyPolylineRef.current) {
          map.removeLayer(surveyPolylineRef.current);
          surveyPolylineRef.current = null;
        }
        return;
      }

      setSurveyIndex(currentIdx);
      const wp = SIMULATED_SURVEY_ROUTE[currentIdx];
      const nextPos = [wp.lat, wp.lng];
      
      if (surveyVehicleMarkerRef.current) {
        surveyVehicleMarkerRef.current.setLatLng(nextPos);
      }
      map.panTo(nextPos, { animate: true, duration: 0.8 });
      sounds.playBeep(800 + currentIdx * 80, 0.04);

      setSurveyLog((prev) => [
        `[${new Date().toLocaleTimeString()}] ${wp.street} → ${wp.event}`,
        ...prev
      ]);
    }, 2800);
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>
      {/* Map Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '0.5rem' }}>
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
                <span className="mono-tag" style={{ color: 'var(--accent-cyan)' }}>GIS INSPECTION PIN</span>
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
              <div style={{ width: '100%', height: '160px', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                <img
                  src={selectedDamage.image}
                  alt={selectedDamage.type}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
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
                  onClick={() => alert(`Work Order dispatched for ${selectedDamage.street}`)}
                >
                  <Zap size={14} /> Dispatch Crew
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}
                  onClick={() => alert('Marked repaired & scheduled for verification scan.')}
                >
                  <CheckCircle2 size={14} color="var(--severity-clear)" /> Mark Repaired
                </button>
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
