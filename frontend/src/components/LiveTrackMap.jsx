import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Navigation, Trash2, MapPin, RefreshCw, Crosshair, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * LiveTrackMap — Real-time GPS damage tracking map using Leaflet with Dark Matter tiles
 * Props:
 *   isTracking  {boolean}  — Continuous GPS tracking active
 *   detections  {Array}    — Current detections (from image, video, or camera)
 */
const LiveTrackMap = forwardRef(function LiveTrackMap({ isTracking = false, detections = [] }, ref) {
  const mapDivRef     = useRef(null);
  const mapRef        = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const pathPointsRef = useRef([]);
  const pathLineRef   = useRef(null);
  const damageLayerRef= useRef(null);
  const damagePinsRef = useRef([]);
  const prevDetRef    = useRef(null);
  const watchIdRef    = useRef(null);

  const [userPos,   setUserPos]   = useState(null);
  const [pinCount,  setPinCount]  = useState(0);
  const [gpsStatus, setGpsStatus] = useState('Locating…');
  const [gpsError,  setGpsError]  = useState(null);
  const [accuracy,  setAccuracy]  = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userAddress, setUserAddress] = useState('Acquiring location…');

  /* Expose clearPins() and pinDetections() to parent */
  useImperativeHandle(ref, () => ({
    clearPins() {
      clearAllPins();
    },
    pinDetections(dets) {
      dropPinsForDetections(dets || detections);
    },
    locateMe() {
      acquireUserPosition(true);
    }
  }));

  // Helper to acquire user position via HTML5 Geolocation with IP fallback
  const acquireUserPosition = (panTo = false) => {
    setIsLocating(true);
    setGpsStatus('Acquiring GPS…');
    setGpsError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
          const newPos = { lat, lng };
          setUserPos(newPos);
          setAccuracy(Math.round(acc));
          setGpsStatus(`LOCKED ±${Math.round(acc)}m`);
          setIsLocating(false);

          updateUserMarkerOnMap(newPos, acc, panTo);
          reverseGeocode(lat, lng);
        },
        async (err) => {
          console.warn('HTML5 Geolocation warning:', err.message);
          // Fallback to IP-based Geolocation
          try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data && data.latitude && data.longitude) {
              const newPos = { lat: data.latitude, lng: data.longitude };
              setUserPos(newPos);
              setAccuracy(1000);
              setGpsStatus(`IP-BASED (${data.city || 'India'})`);
              setIsLocating(false);
              setUserAddress(`${data.city || ''}, ${data.region || ''}, ${data.country_name || 'India'}`);
              updateUserMarkerOnMap(newPos, 1000, panTo);
            } else {
              throw new Error('IP geolocation unavailable');
            }
          } catch (ipErr) {
            setGpsStatus('DEFAULT (Bengaluru)');
            setGpsError('GPS permission not granted; defaulting to regional hub.');
            setIsLocating(false);
            const fallbackPos = { lat: 12.9716, lng: 77.5946 };
            setUserPos(fallbackPos);
            updateUserMarkerOnMap(fallbackPos, 500, panTo);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setGpsError('Geolocation is not supported by your browser.');
      setIsLocating(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`, {
        headers: { 'Accept-Language': 'en' }
      });
      const json = await res.json();
      const a = json.address || {};
      const parts = [
        a.road || a.pedestrian || a.suburb,
        a.city || a.town || a.county || a.state_district,
        a.state
      ].filter(Boolean);
      const addr = parts.join(', ') || json.display_name || `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
      setUserAddress(addr);
    } catch {
      setUserAddress(`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
    }
  };

  const updateUserMarkerOnMap = (pos, acc = 50, panTo = false) => {
    const map = mapRef.current;
    if (!map) return;

    const latlng = [pos.lat, pos.lng];

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:#06b6d4; opacity:0.4; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:14px; height:14px; border-radius:50%; background:#06b6d4; border:2.5px solid #ffffff; box-shadow:0 0 12px #06b6d4;"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latlng, { icon: userIcon }).addTo(map);
      userMarkerRef.current.bindPopup(`
        <div style="font-family:monospace;font-size:12px;color:#0f172a;padding:4px;">
          <div style="font-weight:700;color:#06b6d4;margin-bottom:4px;">📍 Your Live Location</div>
          <div style="font-size:11px;color:#334155;">${userAddress}</div>
          <div style="font-size:10px;color:#64748b;margin-top:4px;">Lat: ${pos.lat.toFixed(5)}°, Lng: ${pos.lng.toFixed(5)}°</div>
        </div>
      `);
    } else {
      userMarkerRef.current.setLatLng(latlng);
    }

    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(latlng, {
        radius: Math.min(acc, 500),
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 0.08,
        weight: 1
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(latlng);
      accuracyCircleRef.current.setRadius(Math.min(acc, 500));
    }

    if (panTo) {
      map.setView(latlng, 16, { animate: true });
    }
  };

  /* ── Init Map ── */
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [12.9716, 77.5946], // Default: South India Hub
      zoom: 12,
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
    }, 200);

    acquireUserPosition(true);

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

  /* ── Continuous GPS Watch when tracking ── */
  useEffect(() => {
    if (isTracking && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
          const nextPos = { lat, lng };
          setUserPos(nextPos);
          setAccuracy(Math.round(acc));
          setGpsStatus(`TRACKING ±${Math.round(acc)}m`);
          updateUserMarkerOnMap(nextPos, acc, false);

          pathPointsRef.current.push([lat, lng]);
          if (pathLineRef.current) {
            pathLineRef.current.setLatLngs(pathPointsRef.current);
          } else if (pathPointsRef.current.length > 1 && mapRef.current) {
            pathLineRef.current = L.polyline(pathPointsRef.current, {
              color: '#06b6d4',
              weight: 3,
              opacity: 0.8
            }).addTo(mapRef.current);
          }
        },
        (err) => setGpsError(`GPS Watch: ${err.message}`),
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 8000 }
      );
    } else if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, [isTracking]);

  /* ── Drop Damage Pins for Detections ── */
  const dropPinsForDetections = (items) => {
    if (!items || items.length === 0) return;
    const basePos = userPos || { lat: 12.9716, lng: 77.5946 };
    const damageLayer = damageLayerRef.current;
    const map = mapRef.current;
    if (!damageLayer || !map) return;

    items.forEach((det, idx) => {
      const conf = det.confidence ?? 0.85;
      const clsName = det.class_name || 'Pothole';
      const severity = conf > 0.60 ? 'High' : conf > 0.30 ? 'Medium' : 'Low';
      const color = clsName.toLowerCase().includes('pothole')
        ? '#f43f5e'
        : clsName.toLowerCase().includes('alligator')
        ? '#f59e0b'
        : '#06b6d4';

      // Spread pins slightly along the road trajectory
      const offsetLat = (idx * 0.00018) + ((Math.random() - 0.5) * 0.00008);
      const offsetLng = (idx * 0.00012) + ((Math.random() - 0.5) * 0.00008);
      const pinLat = basePos.lat + offsetLat;
      const pinLng = basePos.lng + offsetLng;
      const pinPos = [pinLat, pinLng];

      const pinIcon = L.divIcon({
        className: 'custom-damage-pin',
        html: `
          <div style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px ${color}, 0 0 4px #000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            animation: bounce 0.6s ease;
          ">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker(pinPos, { icon: pinIcon });
      
      const dims = det.dimensions || {};
      const dimText = dims.length_cm ? `${dims.length_cm} × ${dims.width_cm} cm (depth ${dims.depth_cm}cm)` : 'Standard survey estimate';

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; min-width: 220px; color: #0f172a; padding: 4px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:${color}; font-size:13px;">⚠ ${clsName}</strong>
            <span style="background:${color}20; color:${color}; border:1px solid ${color}; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">${Math.round(conf * 100)}% Conf</span>
          </div>
          <div style="font-size:11px; color:#475569; margin-bottom:4px;"><strong>Dimensions:</strong> ${dimText}</div>
          <div style="font-size:11px; color:#475569; margin-bottom:4px;"><strong>Severity:</strong> <span style="color:${color}; font-weight:700;">${severity} Risk</span></div>
          <div style="margin-top:6px; border-top:1px solid #e2e8f0; padding-top:6px; font-size:10px; color:#64748b;">
            📍 ${pinLat.toFixed(6)}°N, ${pinLng.toFixed(6)}°E
          </div>
          <div style="margin-top:6px; text-align:center;">
            <a href="https://www.google.com/maps?q=${pinLat},${pinLng}" target="_blank" rel="noreferrer" style="display:inline-block; font-size:10px; color:#06b6d4; text-decoration:none; font-weight:700;">
              Open in Google Maps ↗
            </a>
          </div>
        </div>
      `);

      damageLayer.addLayer(marker);
      damagePinsRef.current.push(marker);
    });

    setPinCount(damagePinsRef.current.length);

    // Auto-fit map to encompass user location and new damage pins
    if (damagePinsRef.current.length > 0) {
      const allPoints = [[basePos.lat, basePos.lng], ...damagePinsRef.current.map(m => m.getLatLng())];
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
    }
  };

  /* Auto-drop pins when detections change */
  useEffect(() => {
    if (detections && detections.length > 0 && detections !== prevDetRef.current) {
      prevDetRef.current = detections;
      // Clear previous pins and drop new ones
      if (damageLayerRef.current) {
        damageLayerRef.current.clearLayers();
        damagePinsRef.current = [];
      }
      dropPinsForDetections(detections);
    }
  }, [detections, userPos]);

  const clearAllPins = () => {
    if (damageLayerRef.current) {
      damageLayerRef.current.clearLayers();
    }
    damagePinsRef.current = [];
    setPinCount(0);
    prevDetRef.current = null;
  };

  const centerOnUser = () => {
    if (userPos && mapRef.current) {
      mapRef.current.setView([userPos.lat, userPos.lng], 16, { animate: true });
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    } else {
      acquireUserPosition(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* GIS Header & Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* GPS Status Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.28rem 0.75rem',
            borderRadius: '6px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
            background: userPos ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${userPos ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.12)'}`,
            color: userPos ? 'var(--accent-cyan)' : 'var(--text-tertiary)'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: userPos ? '#22d3ee' : '#eab308', display: 'inline-block', boxShadow: userPos ? '0 0 8px #22d3ee' : 'none' }} />
            {gpsStatus}
          </div>

          {/* Damage Pins Count Badge */}
          <div style={{
            padding: '0.28rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)', fontWeight: 700,
            background: pinCount > 0 ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${pinCount > 0 ? '#f43f5e55' : 'rgba(255,255,255,0.12)'}`,
            color: pinCount > 0 ? '#f87171' : 'var(--text-tertiary)'
          }}>
            <MapPin size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {pinCount} DETECTED ROAD PIN{pinCount !== 1 ? 'S' : ''}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => acquireUserPosition(true)}
            disabled={isLocating}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '7px',
              padding: '0.32rem 0.7rem',
              cursor: 'pointer',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 600
            }}
          >
            <Crosshair size={12} className={isLocating ? 'animate-spin' : ''} />
            <span>{isLocating ? 'Locating…' : 'Locate Me'}</span>
          </button>

          {detections && detections.length > 0 && (
            <button
              onClick={() => dropPinsForDetections(detections)}
              style={{
                background: 'rgba(6, 182, 212, 0.2)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: '7px',
                padding: '0.32rem 0.7rem',
                cursor: 'pointer',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              <MapPin size={12} /> Pin Detections
            </button>
          )}

          {pinCount > 0 && (
            <button
              onClick={clearAllPins}
              style={{
                background: 'rgba(244,63,94,0.12)',
                border: '1px solid rgba(244,63,94,0.4)',
                borderRadius: '7px',
                padding: '0.32rem 0.7rem',
                cursor: 'pointer',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem'
              }}
            >
              <Trash2 size={12} /> Clear Pins
            </button>
          )}
        </div>
      </div>

      {gpsError && (
        <div style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.35)', color: '#f87171', fontSize: '0.72rem' }}>
          ⚠ {gpsError}
        </div>
      )}

      {/* Street Address / Position Banner */}
      {userPos && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>📍</span>
            <span>{userAddress}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '0.5rem' }}>
            {userPos.lat.toFixed(6)}°N, {userPos.lng.toFixed(6)}°E
          </span>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div
        ref={mapDivRef}
        style={{
          width: '100%',
          height: '340px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-glass)',
          background: '#090d16',
          zIndex: 1,
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
        }}
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          {[
            { color: '#06b6d4', label: 'Your Position (Live GPS)' },
            { color: '#f43f5e', label: 'Potholes' },
            { color: '#f59e0b', label: 'Alligator / Base Failure' },
            { color: '#38bdf8', label: 'Cracks' }
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
              {label}
            </div>
          ))}
        </div>
        {userPos && (
          <a
            href={`https://www.google.com/maps?q=${userPos.lat},${userPos.lng}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
          >
            Google Maps <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
});

export default LiveTrackMap;

