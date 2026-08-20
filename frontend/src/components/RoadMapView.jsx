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
import { GIS_DAMAGE_POINTS, SIMULATED_SURVEY_ROUTE } from './SampleRoadsData';
import { sounds } from './SoundEffects';

// Custom sleek dark styling for Google Maps Digital Twin
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#1a1f2c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1f2c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#748297" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#748297" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b0f19" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] }
];

export default function RoadMapView({ onInspectItem }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const surveyVehicleMarkerRef = useRef(null);
  const surveyPolylineRef = useRef(null);

  const [selectedDamage, setSelectedDamage] = useState(GIS_DAMAGE_POINTS[0]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [damageTypeFilter, setDamageTypeFilter] = useState('ALL');
  const [isSurveyRunning, setIsSurveyRunning] = useState(false);
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [surveyLog, setSurveyLog] = useState([]);
  const surveyTimerRef = useRef(null);

  // Load Google Maps API tag dynamically
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initGoogleMap = () => {
      if (mapInstanceRef.current) return;
      
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: 14.8000, lng: 75.9000 }, // Karnataka State Center
        zoom: 7,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });

      mapInstanceRef.current = map;
      renderMarkers(map, GIS_DAMAGE_POINTS);
    };

    if (window.google && window.google.maps) {
      initGoogleMap();
    } else {
      const scriptId = 'google-maps-api-script';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://maps.googleapis.com/maps/api/js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', initGoogleMap);
    }

    return () => {
      // Clean up map references on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers on Filter Change
  const renderMarkers = (map, points) => {
    if (!window.google || !map) return;
    
    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

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

      // SVG styled circle marker matching Leaflet look
      const marker = new window.google.maps.Marker({
        position: { lat: pt.coordinates[0], lng: pt.coordinates[1] },
        map: map,
        title: pt.type,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          scale: 9,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        sounds.playLockOn();
        setSelectedDamage(pt);
        map.panTo({ lat: pt.coordinates[0], lng: pt.coordinates[1] });
      });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderMarkers(mapInstanceRef.current, GIS_DAMAGE_POINTS);
    }
  }, [severityFilter, damageTypeFilter]);

  // Autonomous Road Survey Simulator Loop
  const startAutonomousSurvey = () => {
    if (!window.google) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isSurveyRunning) {
      if (surveyTimerRef.current) clearInterval(surveyTimerRef.current);
      setIsSurveyRunning(false);
      
      if (surveyVehicleMarkerRef.current) {
        surveyVehicleMarkerRef.current.setMap(null);
        surveyVehicleMarkerRef.current = null;
      }
      if (surveyPolylineRef.current) {
        surveyPolylineRef.current.setMap(null);
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
    const routeCoordinates = SIMULATED_SURVEY_ROUTE.map((r) => ({ lat: r.lat, lng: r.lng }));
    if (surveyPolylineRef.current) {
      surveyPolylineRef.current.setMap(null);
    }
    
    surveyPolylineRef.current = new window.google.maps.Polyline({
      path: routeCoordinates,
      geodesic: true,
      strokeColor: '#06b6d4',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: map
    });

    // Custom arrow icon for vehicle
    if (surveyVehicleMarkerRef.current) {
      surveyVehicleMarkerRef.current.setMap(null);
    }

    surveyVehicleMarkerRef.current = new window.google.maps.Marker({
      position: routeCoordinates[0],
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#06b6d4',
        fillOpacity: 1.0,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

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
          surveyVehicleMarkerRef.current.setMap(null);
          surveyVehicleMarkerRef.current = null;
        }
        if (surveyPolylineRef.current) {
          surveyPolylineRef.current.setMap(null);
          surveyPolylineRef.current = null;
        }
        return;
      }

      setSurveyIndex(currentIdx);
      const wp = SIMULATED_SURVEY_ROUTE[currentIdx];
      const nextPos = { lat: wp.lat, lng: wp.lng };
      
      if (surveyVehicleMarkerRef.current) {
        surveyVehicleMarkerRef.current.setPosition(nextPos);
      }
      map.panTo(nextPos);
      sounds.playBeep(800 + currentIdx * 80, 0.04);

      setSurveyLog((prev) => [
        `[${new Date().toLocaleTimeString()}] ${wp.street} → ${wp.event}`,
        ...prev
      ]);
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (surveyTimerRef.current) clearInterval(surveyTimerRef.current);
    };
  }, []);


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
              background: 'var(--bg-canvas)'
            }}
          />

          {/* Map Compass & HUD Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 500,
              background: 'var(--bg-glass-strong)',
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
