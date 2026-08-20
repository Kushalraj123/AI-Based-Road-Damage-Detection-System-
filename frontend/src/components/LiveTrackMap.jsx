import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Navigation, Trash2, MapPin } from 'lucide-react';

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

/**
 * LiveTrackMap — Real-time GPS damage tracking map using Google Maps
 * Props:
 *   isTracking  {boolean}  — GPS watch active when true
 *   detections  {Array}    — current frame detections from backend
 */
const LiveTrackMap = forwardRef(function LiveTrackMap({ isTracking, detections }, ref) {
  const mapDivRef     = useRef(null);
  const mapRef        = useRef(null);
  const userMarkerRef = useRef(null);
  const pathPointsRef = useRef([]);
  const pathLineRef   = useRef(null);
  const damagePinsRef = useRef([]);
  const prevDetLenRef = useRef(0);
  const watchIdRef    = useRef(null);

  const [userPos,   setUserPos]   = useState(null);
  const [pinCount,  setPinCount]  = useState(0);
  const [gpsError,  setGpsError]  = useState(null);
  const [accuracy,  setAccuracy]  = useState(null);

  /* expose clearPins() to parent */
  useImperativeHandle(ref, () => ({
    clearPins() {
      damagePinsRef.current.forEach(m => m.setMap(null));
      damagePinsRef.current = [];
      setPinCount(0);
      prevDetLenRef.current = 0;
    }
  }));

  /* ── init map ── */
  useEffect(() => {
    if (!mapDivRef.current) return;

    const initMap = () => {
      if (mapRef.current) return;
      const map = new window.google.maps.Map(mapDivRef.current, {
        center: { lat: 20.5937, lng: 78.9629 }, // default: India center
        zoom: 5,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true
      });
      mapRef.current = map;
    };

    if (window.google && window.google.maps) {
      initMap();
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
      script.addEventListener('load', initMap);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, []);

  /* ── GPS watch ── */
  useEffect(() => {
    if (!window.google) return;
    
    if (isTracking) {
      if (!navigator.geolocation) { setGpsError('Geolocation not supported.'); return; }
      setGpsError(null);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
          const nextPos = { lat, lng };
          setUserPos(nextPos);
          setAccuracy(Math.round(acc));
          
          const map = mapRef.current;
          if (!map) return;

          if (!userMarkerRef.current) {
            userMarkerRef.current = new window.google.maps.Marker({
              position: nextPos,
              map: map,
              title: 'Your Location',
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#06b6d4',
                fillOpacity: 1.0,
                scale: 8,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }
            });
            map.setZoom(17);
            map.setCenter(nextPos);
          } else {
            userMarkerRef.current.setPosition(nextPos);
          }

          pathPointsRef.current.push(nextPos);
          if (pathLineRef.current) {
            pathLineRef.current.setMap(null);
          }
          if (pathPointsRef.current.length > 1) {
            pathLineRef.current = new window.google.maps.Polyline({
              path: pathPointsRef.current,
              geodesic: true,
              strokeColor: '#06b6d4',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              map: map
            });
          }
          map.panTo(nextPos);
        },
        (err) => setGpsError(`GPS: ${err.message}`),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    } else {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
      if (pathLineRef.current) { pathLineRef.current.setMap(null); pathLineRef.current = null; }
      pathPointsRef.current = [];
      setUserPos(null);
    }

    return () => { if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; } };
  }, [isTracking]);

  /* ── drop damage pins on new detections with async reverse geocoding ── */
  useEffect(() => {
    if (!window.google || !isTracking || !userPos || !detections || detections.length === 0) return;
    if (detections.length === prevDetLenRef.current) return;
    prevDetLenRef.current = detections.length;
    const map = mapRef.current;
    if (!map) return;

    detections.forEach(async (det) => {
      const conf = det.confidence ?? 0;
      const severity = conf > 0.75 ? 'High' : conf > 0.45 ? 'Medium' : 'Low';
      const color = severity === 'High' ? '#f43f5e' : severity === 'Medium' ? '#f59e0b' : '#38bdf8';
      const jitter = () => (Math.random() - 0.5) * 0.00005;
      const lat = userPos.lat + jitter();
      const lng = userPos.lng + jitter();
      const pinPos = { lat, lng };

      const marker = new window.google.maps.Marker({
        position: pinPos,
        map: map,
        title: det.class_name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          scale: 7,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family:monospace;font-size:12px;min-width:180px;color:#0f172a;padding:4px;">
            <div style="font-weight:700;color:${color};margin-bottom:4px;">⚠ ${det.class_name}</div>
            <div>Confidence: <strong>${Math.round(conf * 100)}%</strong></div>
            <div>Severity: <strong style="color:${color};">${severity}</strong></div>
            <div style="color:#64748b;font-size:10px;margin-top:4px;margin-bottom:4px;">Resolving location...</div>
            <div style="color:#64748b;font-size:9px;">${new Date().toLocaleTimeString()}</div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      damagePinsRef.current.push(marker);

      // Async fetch street address
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`, {
          headers: { 'Accept-Language': 'en' }
        });
        const json = await res.json();
        const a = json.address || {};
        const parts = [
          a.road || a.pedestrian || a.footway,
          a.suburb || a.neighbourhood,
          a.city || a.town || a.village
        ].filter(Boolean);
        const resolvedAddress = parts.join(', ') || json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        infoWindow.setContent(`
          <div style="font-family:monospace;font-size:12px;min-width:180px;color:#0f172a;padding:4px;">
            <div style="font-weight:700;color:${color};margin-bottom:4px;">⚠ ${det.class_name}</div>
            <div>Confidence: <strong>${Math.round(conf * 100)}%</strong></div>
            <div>Severity: <strong style="color:${color};">${severity}</strong></div>
            <div style="margin-top:6px;border-top:1px solid rgba(0,0,0,0.1);padding-top:4px;color:#334155;font-size:11px;line-height:1.3;">
              📍 ${resolvedAddress}
            </div>
            <div style="color:#64748b;font-size:9px;margin-top:4px;text-align:right;">${new Date().toLocaleTimeString()}</div>
          </div>
        `);
      } catch {
        infoWindow.setContent(`
          <div style="font-family:monospace;font-size:12px;min-width:180px;color:#0f172a;padding:4px;">
            <div style="font-weight:700;color:${color};margin-bottom:4px;">⚠ ${det.class_name}</div>
            <div>Confidence: <strong>${Math.round(conf * 100)}%</strong></div>
            <div>Severity: <strong style="color:${color};">${severity}</strong></div>
            <div style="margin-top:6px;border-top:1px solid rgba(0,0,0,0.1);padding-top:4px;color:#64748b;font-size:10px;">
              Coordinates: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°
            </div>
            <div style="color:#64748b;font-size:9px;margin-top:4px;text-align:right;">${new Date().toLocaleTimeString()}</div>
          </div>
        `);
      }
    });
    setPinCount(damagePinsRef.current.length);
  }, [detections, userPos, isTracking]);

  const clearAllPins = () => {
    damagePinsRef.current.forEach(m => m.setMap(null));
    damagePinsRef.current = [];
    setPinCount(0);
    prevDetLenRef.current = 0;
  };

  const centerOnUser = () => {
    if (userPos && mapRef.current) mapRef.current.setCenter(userPos);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.22rem 0.65rem',
            borderRadius: '6px', fontSize: '0.67rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
            background: isTracking && userPos ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isTracking && userPos ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.12)'}`,
            color: isTracking && userPos ? 'var(--accent-cyan)' : 'var(--text-tertiary)'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isTracking && userPos ? '#22d3ee' : '#555', display: 'inline-block' }} />
            {isTracking && userPos ? `GPS LOCKED  ±${accuracy}m` : isTracking ? 'Acquiring GPS…' : 'GPS IDLE'}
          </div>
          <div style={{
            padding: '0.22rem 0.65rem', borderRadius: '6px', fontSize: '0.67rem',
            fontFamily: 'var(--font-mono)', fontWeight: 700,
            background: pinCount > 0 ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${pinCount > 0 ? '#f43f5e44' : 'rgba(255,255,255,0.12)'}`,
            color: pinCount > 0 ? '#f87171' : 'var(--text-tertiary)'
          }}>
            <MapPin size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {pinCount} DAMAGE PIN{pinCount !== 1 ? 'S' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {userPos && (
            <button onClick={centerOnUser} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '7px', padding: '0.28rem 0.6rem', cursor: 'pointer', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem' }}>
              <Navigation size={11} /> Center
            </button>
          )}
          {pinCount > 0 && (
            <button onClick={clearAllPins} style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: '7px', padding: '0.28rem 0.6rem', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem' }}>
              <Trash2 size={11} /> Clear Pins
            </button>
          )}
        </div>
      </div>
      {gpsError && (
        <div style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.35)', color: '#f87171', fontSize: '0.72rem' }}>
          ⚠ {gpsError}
        </div>
      )}
      {/* Map */}
      <div ref={mapDivRef} style={{ width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)', background: '#0d1117' }} />
      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { color: '#06b6d4', label: 'Your Position' },
          { color: '#f43f5e', label: 'High Risk' },
          { color: '#f59e0b', label: 'Medium Risk' },
          { color: '#38bdf8', label: 'Low Risk' }
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.64rem', color: 'var(--text-tertiary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
});

export default LiveTrackMap;
