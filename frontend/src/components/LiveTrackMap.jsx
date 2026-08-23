import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Navigation, Trash2, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * LiveTrackMap — Real-time GPS damage tracking map using Leaflet with Dark Matter tiles
 * Props:
 *   isTracking  {boolean}  — GPS watch active when true
 *   detections  {Array}    — current frame detections from backend
 */
const LiveTrackMap = forwardRef(function LiveTrackMap({ isTracking, detections }, ref) {
  const mapDivRef     = useRef(null);
  const mapRef        = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const pathPointsRef = useRef([]);
  const pathLineRef   = useRef(null);
  const damageLayerRef= useRef(null);
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
      if (damageLayerRef.current) {
        damageLayerRef.current.clearLayers();
      }
      damagePinsRef.current = [];
      setPinCount(0);
      prevDetLenRef.current = 0;
    }
  }));

  /* ── init map + show user location immediately ── */
  useEffect(() => {
    if (!mapDivRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [20.5937, 78.9629], // default: India center
      zoom: 5,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const damageLayer = L.layerGroup().addTo(map);
    damageLayerRef.current = damageLayer;
    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Show current location on load even without live tracking
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
          const initPos = [lat, lng];
          setUserPos({ lat, lng });
          setAccuracy(Math.round(acc));

          // Place glowing blue user marker
          const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `
              <div style="position:relative; width:20px; height:20px; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:#06b6d4; opacity:0.4; animation:ping 1.5s infinite;"></div>
                <div style="width:12px; height:12px; border-radius:50%; background:#06b6d4; border:2px solid #ffffff; box-shadow:0 0 8px #06b6d4;"></div>
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }
          userMarkerRef.current = L.marker(initPos, { icon: userIcon }).addTo(map);

          if (accuracyCircleRef.current) {
            map.removeLayer(accuracyCircleRef.current);
          }
          accuracyCircleRef.current = L.circle(initPos, {
            radius: acc,
            color: '#06b6d4',
            fillColor: '#06b6d4',
            fillOpacity: 0.08,
            weight: 1
          }).addTo(map);

          map.setView(initPos, 15);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  /* ── GPS watch ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    if (isTracking) {
      if (!navigator.geolocation) { setGpsError('Geolocation not supported.'); return; }
      setGpsError(null);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
          const nextPos = [lat, lng];
          setUserPos({ lat, lng });
          setAccuracy(Math.round(acc));

          const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `
              <div style="position:relative; width:20px; height:20px; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:#06b6d4; opacity:0.4; animation:ping 1.5s infinite;"></div>
                <div style="width:12px; height:12px; border-radius:50%; background:#06b6d4; border:2px solid #ffffff; box-shadow:0 0 8px #06b6d4;"></div>
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker(nextPos, { icon: userIcon }).addTo(map);
            map.setView(nextPos, 17);
          } else {
            userMarkerRef.current.setLatLng(nextPos);
          }

          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng(nextPos);
            accuracyCircleRef.current.setRadius(acc);
          } else {
            accuracyCircleRef.current = L.circle(nextPos, {
              radius: acc,
              color: '#06b6d4',
              fillColor: '#06b6d4',
              fillOpacity: 0.08,
              weight: 1
            }).addTo(map);
          }

          pathPointsRef.current.push(nextPos);
          if (pathLineRef.current) {
            pathLineRef.current.setLatLngs(pathPointsRef.current);
          } else if (pathPointsRef.current.length > 1) {
            pathLineRef.current = L.polyline(pathPointsRef.current, {
              color: '#06b6d4',
              weight: 3,
              opacity: 0.8
            }).addTo(map);
          }
          map.panTo(nextPos, { animate: true, duration: 0.5 });
        },
        (err) => setGpsError(`GPS: ${err.message}`),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (pathLineRef.current && map) {
        map.removeLayer(pathLineRef.current);
        pathLineRef.current = null;
      }
      pathPointsRef.current = [];
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking]);

  /* ── drop damage pins on new detections with async reverse geocoding ── */
  useEffect(() => {
    if (!userPos || !detections || detections.length === 0) return;
    const damageLayer = damageLayerRef.current;
    if (!damageLayer) return;

    // Clear previous pins before dropping new set
    damageLayer.clearLayers();
    damagePinsRef.current = [];

    detections.forEach(async (det, idx) => {
      const conf = det.confidence ?? 0.85;
      const severity = conf > 0.60 ? 'High' : conf > 0.30 ? 'Medium' : 'Low';
      const color = severity === 'High' ? '#f43f5e' : severity === 'Medium' ? '#f59e0b' : '#38bdf8';
      
      // Calculate realistic spread along the road
      const offsetLat = (idx * 0.00015) + ((Math.random() - 0.5) * 0.00006);
      const offsetLng = (idx * 0.00010) + ((Math.random() - 0.5) * 0.00006);
      const lat = userPos.lat + offsetLat;
      const lng = userPos.lng + offsetLng;
      const pinPos = [lat, lng];

      const pinIcon = L.divIcon({
        className: 'custom-damage-pin',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px ${color}, 0 0 4px #000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(pinPos, { icon: pinIcon });
      const dims = det.dimensions || {};
      const dimText = dims.length_cm ? `${dims.length_cm} × ${dims.width_cm} cm (depth ${dims.depth_cm}cm)` : 'Survey metric';
      
      marker.bindPopup(`
        <div style="font-family:monospace;font-size:12px;min-width:190px;color:#0f172a;padding:4px;">
          <div style="font-weight:700;color:${color};margin-bottom:4px;font-size:13px;">⚠ ${det.class_name}</div>
          <div>Confidence: <strong>${Math.round(conf * 100)}%</strong></div>
          <div>Severity: <strong style="color:${color};">${severity} Risk</strong></div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">Dimensions: ${dimText}</div>
          <div style="color:#64748b;font-size:10px;margin-top:6px;border-top:1px solid rgba(0,0,0,0.1);padding-top:4px;">
            Coordinates: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E
          </div>
        </div>
      `);

      damageLayer.addLayer(marker);
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
        
        marker.setPopupContent(`
          <div style="font-family:monospace;font-size:12px;min-width:190px;color:#0f172a;padding:4px;">
            <div style="font-weight:700;color:${color};margin-bottom:4px;font-size:13px;">⚠ ${det.class_name}</div>
            <div>Confidence: <strong>${Math.round(conf * 100)}%</strong></div>
            <div>Severity: <strong style="color:${color};">${severity} Risk</strong></div>
            <div style="font-size:11px;color:#475569;margin-top:2px;">Dimensions: ${dimText}</div>
            <div style="margin-top:6px;border-top:1px solid rgba(0,0,0,0.1);padding-top:4px;color:#334155;font-size:11px;line-height:1.3;">
              📍 ${resolvedAddress}
            </div>
            <div style="color:#64748b;font-size:9px;margin-top:4px;text-align:right;">${new Date().toLocaleTimeString()}</div>
          </div>
        `);
      } catch {
        // keep fallback popup
      }
    });

    setPinCount(damagePinsRef.current.length);

    // Auto zoom map to show user position and all dropped damage pins
    if (damagePinsRef.current.length > 0 && mapRef.current) {
      const allPoints = [[userPos.lat, userPos.lng], ...damagePinsRef.current.map(m => m.getLatLng())];
      const bounds = L.latLngBounds(allPoints);
      mapRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 17, animate: true });
    }
  }, [detections, userPos]);

  const clearAllPins = () => {
    if (damageLayerRef.current) {
      damageLayerRef.current.clearLayers();
    }
    damagePinsRef.current = [];
    setPinCount(0);
    prevDetLenRef.current = 0;
  };

  const centerOnUser = () => {
    if (userPos && mapRef.current) {
      mapRef.current.panTo([userPos.lat, userPos.lng], { animate: true });
    }
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
      <div ref={mapDivRef} style={{ width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)', background: '#090d16', zIndex: 1 }} />
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
