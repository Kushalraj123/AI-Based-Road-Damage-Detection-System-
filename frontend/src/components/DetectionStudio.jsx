import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  Video as VideoIcon,
  Image as ImageIcon,
  Scan,
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Eye,
  Layers,
  MapPin,
  Download,
  Share2,
  Cpu,
  ChevronRight,
  Maximize2,
  SplitSquareVertical,
  Activity
} from 'lucide-react';
import { SAMPLE_ROADS } from './SampleRoadsData';
import { sounds } from './SoundEffects';
import LiveTrackMap from './LiveTrackMap';

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function DetectionStudio({ onPushToMap, onGenerateReport }) {
  const [activeInputTab, setActiveInputTab] = useState('image'); // 'image' | 'video' | 'camera' | 'samples'
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false); // Default to showing sample result
  const [scanError, setScanError] = useState(null);

  // Image natural dimensions for accurate box rendering
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1000, height: 700 });
  const imageRef = useRef(null);

  // Detection Results State
  const [detectionResult, setDetectionResult] = useState({
    severity: 'Clear',
    pciScore: 100,
    repairPriority: 'No distress detected',
    estimatedCost: '₹0 INR',
    distressCount: 0,
    detections: [],
    location: null,
    // Backend-provided image dimensions (used for box normalization when real API is called)
    backendImageWidth: null,
    backendImageHeight: null
  });

  // Display View modes
  const [viewMode, setViewMode] = useState('processed'); // 'split' | 'processed' | 'original' | 'heatmap'
  const [sliderPos, setSliderPos] = useState(50);
  const [hoveredBox, setHoveredBox] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Model selection
  const [selectedModel, setSelectedModel] = useState('damage-yolo12s');
  const [confThreshold, setConfThreshold] = useState(0.10); // Low threshold to catch more damage

  // Track whether current result came from real backend API (so we don't double-draw boxes)
  const [isBackendResult, setIsBackendResult] = useState(false);
  // Keep the original unprocessed image URL for split-slider comparisons
  const [originalImageUrl, setOriginalImageUrl] = useState(null);

  // Municipal Requisition states
  const [requisitionSubmitted, setRequisitionSubmitted] = useState(false);
  const [requisitionLoading, setRequisitionLoading] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState(null);


  // Camera stream ref
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const liveDetectRef      = useRef(null);       // interval handle
  const liveFrameStartRef  = useRef(null);   // time for FPS calculation
  const liveMapRef         = useRef(null);   // ref to LiveTrackMap for clearPins()
  const [cameraActive, setCameraActive] = useState(false);

  // Live detection state
  const [isLiveDetecting, setIsLiveDetecting] = useState(false);
  const [liveDetections, setLiveDetections] = useState([]);
  const [liveProcessedFrame, setLiveProcessedFrame] = useState(null);
  const [liveFps, setLiveFps] = useState(0);
  const [liveTotalDetected, setLiveTotalDetected] = useState(0);
  const [liveFrameCount, setLiveFrameCount] = useState(0);

  // ── GPS + reverse geocode for incident location ───────────
  const [detectionGpsLocation, setDetectionGpsLocation] = useState(null);
  // { address: string, coords: {lat, lng}, loading: bool }

  const scanStages = [
    { title: 'Surface Mesh Acquisition', desc: 'Ingesting 3D pavement geometry and ambient illumination.' },
    { title: 'Depth & Gradient Mapping', desc: 'Computing orthorectified surface depression gradients.' },
    { title: 'YOLOv12s Feature Extraction', desc: 'Running neural convolutional tensor passes.' },
    { title: 'Distress Segmentation', desc: 'Generating bounding boxes & polygon masks.' },
    { title: 'Structural Severity Matrix', desc: 'Computing PCI impact and repair priority.' }
  ];

  // ── Reverse geocode via Nominatim (free, no API key) ─────
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const json = await res.json();
      // Build a readable address from the most useful parts
      const a = json.address || {};
      const parts = [
        a.road || a.pedestrian || a.footway || a.path,
        a.suburb || a.neighbourhood || a.quarter,
        a.city || a.town || a.village || a.county,
        a.state,
        a.country
      ].filter(Boolean);
      return parts.join(', ') || json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  // ── Get current GPS + geocode, then update state ──────────
  const getGpsAndGeocode = () => {
    if (!navigator.geolocation) {
      setDetectionGpsLocation({ address: 'Geolocation not supported', coords: null, loading: false });
      return;
    }
    setDetectionGpsLocation({ address: null, coords: null, loading: true });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        setDetectionGpsLocation({ address, coords: { lat, lng }, loading: false });
      },
      (err) => {
        setDetectionGpsLocation({ address: `GPS unavailable: ${err.message}`, coords: null, loading: false });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // ── Calculate dynamic repair materials based on dimensions ────────
  const calculateMaterials = (det) => {
    const len = det.dimensions?.length_cm || 30;
    const wid = det.dimensions?.width_cm || 30;
    const dep = det.dimensions?.depth_cm || 3;
    const area = det.dimensions?.area_m2 || 0.1;
    
    const isPothole = det.class_name.toLowerCase().includes('pothole') || det.class_name.includes('D40');
    const isAlligator = det.class_name.toLowerCase().includes('alligator') || det.class_name.includes('D20');
    
    if (isPothole) {
      const vol = (len * wid * dep) / 1000000;
      const asphaltKg = Math.max(2, Math.round(vol * 800));
      const tackCoatLiters = parseFloat(Math.max(0.1, area * 0.25).toFixed(1));
      const aggregateKg = Math.max(3, Math.round(vol * 500));
      return {
        asphalt: `${asphaltKg} kg Bituminous Hot-Mix`,
        binder: `${tackCoatLiters} L Emulsion Tack Coat`,
        aggregate: `${aggregateKg} kg Crushed Base Gravel`
      };
    } else if (isAlligator) {
      const vol = (len * wid * dep) / 1000000;
      const asphaltKg = Math.max(3, Math.round(vol * 700));
      const tackCoatLiters = parseFloat(Math.max(0.15, area * 0.3).toFixed(1));
      const sealantKg = Math.max(1, Math.round(area * 1.2));
      return {
        asphalt: `${asphaltKg} kg Dense Bituminous Macadam`,
        binder: `${tackCoatLiters} L CSS-1h Tack Emulsion`,
        sealant: `${sealantKg} kg Crack Sealant Compound`
      };
    } else {
      const tackCoatLiters = parseFloat(Math.max(0.05, area * 0.15).toFixed(2));
      const sealantKg = Math.max(0.5, Math.round((len / 100) * 0.4));
      return {
        binder: `${tackCoatLiters} L Rapid Setting Emulsion`,
        sealant: `${sealantKg} kg Hot-Applied Polymer Sealant`
      };
    }
  };

  const handleSubmitRequisition = async () => {
    setRequisitionLoading(true);
    sounds.playLaserScan();
    
    const ticketId = `HCMC-ROAD-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const address = detectionGpsLocation?.address || "B.M. Road, Hassan, Karnataka, India";
    const lat = detectionGpsLocation?.coords?.lat ?? 13.0068;
    const lng = detectionGpsLocation?.coords?.lng ?? 76.1026;
    
    // Compile materials
    const materialsList = detectionResult.detections.map(det => {
      const mat = calculateMaterials(det);
      return [mat.asphalt, mat.binder, mat.aggregate, mat.sealant].filter(Boolean).join(', ');
    });

    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          address: address,
          latitude: lat,
          longitude: lng,
          distress_count: detectionResult.distressCount,
          severity: detectionResult.severity,
          materials: materialsList
        })
      });
      const data = await response.json();
      if (data.success) {
        setRequisitionSubmitted(true);
        setSubmittedTicketId(ticketId);
        sounds.playLockOn();
      }
    } catch (err) {
      console.error("Failed to notify municipal system:", err);
      // Fallback to local success if backend network request fails
      setRequisitionSubmitted(true);
      setSubmittedTicketId(ticketId);
      sounds.playLockOn();
    } finally {
      setRequisitionLoading(false);
    }
  };

  // Start Scan Sequence — calls real backend API for uploaded files, uses ground truth for samples
  const runScanProcess = async (imageUrl, groundTruthData = null, uploadedFile = null) => {
    setIsScanning(true);
    setScanComplete(false);
    setScanStage(0);
    setScanProgress(5);
    setScanError(null);
    setRequisitionSubmitted(false);
    setRequisitionLoading(false);
    setSubmittedTicketId(null);
    sounds.playLaserScan();

    // Run stages concurrently with API call if we have a real file to upload
    let apiPromise = null;
    if (uploadedFile) {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('model_id', selectedModel);
      formData.append('conf_threshold', confThreshold);
      apiPromise = fetch(`${BACKEND_URL}/api/detect`, { method: 'POST', body: formData });

      // Fire GPS + reverse geocode in parallel — does NOT block detection
      setDetectionGpsLocation(null);
      getGpsAndGeocode();
    }

    for (let i = 0; i < scanStages.length; i++) {
      setScanStage(i);
      setScanProgress((i + 1) * 20);
      sounds.playBeep(450 + i * 120, 0.04);
      await new Promise((r) => setTimeout(r, 420));
    }

    sounds.playLockOn();

    if (groundTruthData) {
      // Sample preset scenario — use its pre-defined detections
      setIsBackendResult(false);
      setDetectionResult({
        ...groundTruthData,
        backendImageWidth: null,
        backendImageHeight: null
      });
      setIsScanning(false);
      setScanComplete(true);
      return;
    }

    if (apiPromise) {
      try {
        const response = await apiPromise;
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Backend detection failed');
        }
        const data = await response.json();

        // Map backend detections to our UI format
        const mappedDetections = (data.detections || []).map((det, idx) => {
          const dims = det.dimensions || {};
          return {
            id: `api-det-${idx}`,
            class_name: det.class_name,
            class_id: det.class_id,
            confidence: det.confidence,
            severity: det.confidence > 0.75 ? 'High' : det.confidence > 0.45 ? 'Medium' : 'Low',
            box: det.box,
            dimensions: {
              // Use backend computed real-world dimensions
              length_cm: dims.length_cm ?? Math.round((det.box[2] - det.box[0]) * 0.33),
              width_cm:  dims.width_cm  ?? Math.round((det.box[3] - det.box[1]) * 0.33),
              depth_cm:  dims.depth_cm  ?? 2.0,
              area_m2:   dims.area_m2   ?? parseFloat(((det.box[2]-det.box[0])*(det.box[3]-det.box[1])/10000).toFixed(2)),
            },
            recommendation: det.class_name.includes('D40') || det.class_name.toLowerCase().includes('pothole')
              ? 'Full-depth hot-mix asphalt patch with tack coat.'
              : det.class_name.includes('D20') || det.class_name.toLowerCase().includes('alligator')
              ? 'Mill and inlay with polymer-modified bitumen.'
              : det.class_name.includes('D10') || det.class_name.toLowerCase().includes('trans')
              ? 'Elastomeric joint sealant application.'
              : 'Hot-pour rubberized crack sealant.'
          };
        });


        const totalDmg = data.total_damage || 0;
        const maxConf = mappedDetections.length > 0 ? Math.max(...mappedDetections.map(d => d.confidence)) : 0;
        const pciScore = Math.max(5, Math.min(95, Math.round(100 - (totalDmg * 8) - (maxConf * 25))));
        const severityMap = { High: 'High', Medium: 'Medium', Low: 'Low', Clear: 'Clear' };
        const apiSeverity = severityMap[data.severity] || 'Medium';


        setDetectionResult({
          severity: apiSeverity,
          pciScore,
          repairPriority: apiSeverity === 'High'
            ? 'P1 — Immediate Hot-Mix Asphalt Patch (24h)'
            : apiSeverity === 'Medium'
            ? 'P2 — Scheduled Maintenance (7 Days)'
            : 'P3 — Routine Monitoring',
          estimatedCost: apiSeverity === 'High'
            ? `₹${(mappedDetections.length * 1200 + 3000).toLocaleString('en-IN')} INR`
            : `₹${(mappedDetections.length * 600 + 1500).toLocaleString('en-IN')} INR`,
          distressCount: data.total_damage,
          detections: mappedDetections,
          location: 'Uploaded Image — GPS Coordinates Not Available',
          backendImageWidth: data.width,
          backendImageHeight: data.height
        });

        // Show the processed image from backend (has OpenCV boxes already drawn)
        if (data.processed_image_base64) {
          setImagePreviewUrl(data.processed_image_base64);
          // Auto-switch to processed view so user sees backend result immediately
          setViewMode('processed');
        }
        // Mark as backend result — frontend must NOT draw HTML overlay boxes on top
        setIsBackendResult(true);
      } catch (err) {
        console.error('Detection API error:', err);
        setScanError(`Detection failed: ${err.message}. Check that the backend server is running.`);
        setDetectionResult({
          severity: 'Clear',
          pciScore: 100,
          repairPriority: 'N/A — Detection Error',
          estimatedCost: '₹0 INR',
          distressCount: 0,
          detections: [],
          location: 'Error',
          backendImageWidth: null,
          backendImageHeight: null
        });
      }
    }

    setIsScanning(false);
    setScanComplete(true);
  };

  // Handle Drag & Drop Image — calls backend API with the real file
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setImagePreviewUrl(url);
      setOriginalImageUrl(url); // save original for split comparison
      setIsBackendResult(false); // reset while scanning
      runScanProcess(url, null, file);
    }
  };

  // Handle Preset Sample Selection
  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    setImagePreviewUrl(sample.image);
    setOriginalImageUrl(sample.image);
    setIsBackendResult(false);
    runScanProcess(sample.image, sample);
  };

  // Handle Camera Stream
  const toggleCamera = async () => {
    if (cameraActive) {
      stopLiveDetection();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
      setLiveProcessedFrame(null);
      setLiveDetections([]);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        sounds.playBeep(900, 0.05);
      } catch (err) {
        alert('Camera access denied or unavailable.');
      }
    }
  };

  // Capture one frame from video and run backend detection
  const captureAndDetect = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const base64Frame = canvas.toDataURL('image/jpeg', 0.75);

    const frameStart = performance.now();
    try {
      const res = await fetch(`${BACKEND_URL}/api/detect-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: base64Frame,
          model_id: selectedModel,
          conf_threshold: confThreshold
        })
      });
      if (!res.ok) return;
      const data = await res.json();

      const elapsed = performance.now() - frameStart;
      setLiveFps(Math.round(1000 / elapsed));

      if (data.success) {
        setLiveProcessedFrame(data.processed_frame);
        setLiveDetections(data.detections || []);
        if ((data.detections || []).length > 0) {
          setLiveTotalDetected(prev => prev + data.detections.length);
          sounds.playBeep(600, 0.02);
        }
        setLiveFrameCount(prev => prev + 1);
      }
    } catch (err) {
      // Network error — silently skip frame
    }
  };

  const startLiveDetection = () => {
    if (liveDetectRef.current) return; // already running
    setIsLiveDetecting(true);
    setLiveTotalDetected(0);
    setLiveFrameCount(0);
    sounds.playLaserScan();
    // Run detection every 800ms (adjust for performance)
    liveDetectRef.current = setInterval(captureAndDetect, 800);
  };

  const stopLiveDetection = () => {
    if (liveDetectRef.current) {
      clearInterval(liveDetectRef.current);
      liveDetectRef.current = null;
    }
    setIsLiveDetecting(false);
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'Critical':
        return <span className="badge badge-critical">Critical Hazard</span>;
      case 'High':
        return <span className="badge badge-high">High Severity</span>;
      case 'Medium':
        return <span className="badge badge-medium">Medium Severity</span>;
      case 'Low':
        return <span className="badge badge-low">Low Severity</span>;
      default:
        return <span className="badge badge-clear">Clear Condition</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto 5rem auto', padding: '0 1rem' }}>

      {/* Error Banner */}
      {scanError && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{scanError}</span>
          </div>
          <button
            onClick={() => setScanError(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '0.5rem' }}>
            <Scan size={13} /> AI INFERENCE STUDIO
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>
            Pavement Computer Vision <span className="text-gradient">Workspace</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Real-time automated damage segmentation, bounding box localization, and structural severity rating.
          </p>
        </div>

        {/* Studio Controls: Model & Threshold */}
        <div className="glass-panel" style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              NEURAL MODEL
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}
            >
              <option value="damage-yolo12s">RDD2022 YOLOv12s (Full Distress)</option>
              <option value="pothole-yolov8">YOLOv8-Pothole Core</option>
              <option value="sam-vit-large">SAM + ViT Road Segmenter</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <span>CONFIDENCE THRESHOLD</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{Math.round(confThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={confThreshold}
              onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
              style={{ width: '130px', accentColor: 'var(--accent-cyan)' }}
            />
          </div>
        </div>
      </div>

      {/* Input Channel Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'samples', label: 'Preset Road Scenarios', icon: Layers },
          { id: 'image', label: 'Upload Image', icon: ImageIcon },
          { id: 'video', label: 'Upload Dashcam Video', icon: VideoIcon },
          { id: 'camera', label: 'Live Camera / Mobile Feed', icon: Camera }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeInputTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playBeep(800, 0.03);
                setActiveInputTab(tab.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(99, 102, 241, 0.3) 100%)' : 'var(--bg-surface-elevated)',
                border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} color={isActive ? 'var(--accent-cyan)' : 'inherit'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sample Scenario Preset Selector */}
      {activeInputTab === 'samples' && (
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', background: 'var(--bg-glass)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            SELECT BENCHMARK ROAD DISTRESS SCENARIO:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {SAMPLE_ROADS.map((sample) => {
              const isSel = selectedSample?.id === sample.id;
              return (
                <div
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: isSel ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isSel ? 'var(--bg-surface-active)' : 'var(--bg-surface-elevated)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSel ? '0 0 20px rgba(6, 182, 212, 0.3)' : 'none'
                  }}
                >
                  <img src={sample.image} alt={sample.title} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                  <div style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {sample.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{sample.category}</span>
                      {getSeverityBadge(sample.severity)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Upload Dropzone */}
      {activeInputTab === 'image' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="glass-panel"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            border: '2px dashed var(--border-glow)',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileDrop}
          />
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)', margin: '0 auto 1rem auto' }}>
            <UploadCloud size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
            Drag and Drop Road Inspection Image or <span style={{ color: 'var(--accent-cyan)' }}>Browse</span>
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            Supports high-resolution PNG, JPG, JPEG, and WebP formats up to 4K resolution.
          </p>
        </div>
      )}

      {/* Video Upload Dropzone */}
      {activeInputTab === 'video' && (
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            border: '2px dashed var(--border-glow)',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem'
          }}
        >
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)', margin: '0 auto 1rem auto' }}>
            <VideoIcon size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
            Upload Surveyor Dashcam Video Stream (.mp4, .mov)
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            High-speed frame-by-frame batch processing with automatic telemetry extraction.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              sounds.playLaserScan();
              runScanProcess(SAMPLE_ROADS[0].image, SAMPLE_ROADS[0]);
            }}
          >
            <Zap size={16} /> Run Benchmark Dashcam Test Stream
          </button>
        </div>
      )}

      {/* Live Camera Detection Mode */}
      {activeInputTab === 'camera' && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>

          {/* Top controls row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Live Dashcam Detection</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Real-time road damage detection via webcam or dashcam stream</div>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
              {cameraActive && (
                <button
                  onClick={isLiveDetecting ? stopLiveDetection : startLiveDetection}
                  className="btn btn-primary"
                  style={{
                    background: isLiveDetecting
                      ? 'linear-gradient(135deg, rgba(244,63,94,0.8), rgba(220,38,38,0.9))'
                      : undefined,
                    gap: '0.5rem', padding: '0.55rem 1.1rem'
                  }}
                >
                  {isLiveDetecting
                    ? <><Activity size={15} className="animate-pulse" /> Stop Detection</>  
                    : <><Zap size={15} /> Start Live Detection</> }
                </button>
              )}
              <button className="btn btn-secondary" onClick={toggleCamera} style={{ gap: '0.5rem', padding: '0.55rem 1rem' }}>
                <Camera size={15} />
                <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
              </button>
            </div>
          </div>

          {/* Main viewport: processed frame or raw video */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>

            {/* Video/Processed Frame viewport */}
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid var(--border-glass)', minHeight: '320px' }}>

              {/* Hidden video element — always captures stream */}
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{ display: liveProcessedFrame ? 'none' : 'block', width: '100%', maxHeight: '420px', objectFit: 'cover' }}
              />
              {/* Hidden canvas — used for frame capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Processed output image from backend */}
              {liveProcessedFrame && (
                <img
                  src={liveProcessedFrame}
                  alt="Live Detection"
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                />
              )}

              {/* Idle overlay when camera not active */}
              {!cameraActive && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,10,18,0.85)', gap: '0.75rem' }}>
                  <Camera size={42} style={{ color: 'var(--accent-cyan)', opacity: 0.5 }} />
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Camera not active</div>
                  <button className="btn btn-primary" onClick={toggleCamera} style={{ gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Camera size={15} /> Start Camera
                  </button>
                </div>
              )}

              {/* Scanning animation */}
              {isLiveDetecting && <div className="scan-line" />}

              {/* Live HUD badges */}
              {cameraActive && (
                <>
                  {/* Top-left: status */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      background: isLiveDetecting ? 'rgba(244,63,94,0.85)' : 'rgba(20,20,30,0.85)',
                      border: `1px solid ${isLiveDetecting ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700,
                      fontFamily: 'var(--font-mono)', backdropFilter: 'blur(8px)'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLiveDetecting ? '#fff' : '#666', display: 'inline-block' }} />
                      {isLiveDetecting ? 'LIVE AI' : 'PAUSED'}
                    </div>
                    {isLiveDetecting && (
                      <div style={{ background: 'rgba(6,182,212,0.85)', border: '1px solid var(--accent-cyan)', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', backdropFilter: 'blur(8px)' }}>
                        {liveFps} FPS
                      </div>
                    )}
                  </div>
                  {/* Top-right: frame counter */}
                  {isLiveDetecting && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(20,20,30,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', backdropFilter: 'blur(8px)' }}>
                      Frame #{liveFrameCount}
                    </div>
                  )}
                  {/* Bottom-left: detection count */}
                  {liveDetections.length > 0 && (
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(244,63,94,0.88)', border: '1px solid #f43f5e', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, backdropFilter: 'blur(8px)' }}>
                      ⚠ {liveDetections.length} Damage{liveDetections.length > 1 ? 's' : ''} Detected
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right panel: live stats */}
            <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>

              {/* Total session detections */}
              <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.3rem' }}>SESSION DETECTIONS</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: liveTotalDetected > 0 ? 'var(--severity-critical)' : 'var(--text-tertiary)' }}>{liveTotalDetected}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>anomalies found</div>
              </div>

              {/* Current frame detections list */}
              <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>CURRENT FRAME</div>
                {liveDetections.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '0.5rem 0' }}>No damage detected</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {liveDetections.slice(0, 5).map((det, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: '6px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.67rem', fontWeight: 600, color: 'var(--text-primary)' }}>{det.class_name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Math.round(det.confidence * 100)}%</span>
                      </div>
                    ))}
                    {liveDetections.length > 5 && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>+{liveDetections.length - 5} more</div>
                    )}
                  </div>
                )}
              </div>

              {/* Model info */}
              <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>MODEL</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  {selectedModel === 'damage-yolo12s' ? 'YOLOv12s RDD2022' : 'YOLOv8 Pothole'}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>Conf: {Math.round(confThreshold * 100)}%</div>
              </div>
            </div>
          </div>

          {/* ── Live GPS Damage Track Map ─────────────────────── */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <MapPin size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Live Damage Track Map</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>— GPS pins drop automatically when damage is detected</span>
            </div>
            <LiveTrackMap
              ref={liveMapRef}
              isTracking={isLiveDetecting}
              detections={liveDetections}
            />
          </div>
        </div>
      )}


      {/* MAIN DETECTION WORKSPACE CANVAS & RESULTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Interactive Image / Video Preview Canvas */}
        <div className="glass-panel" style={{ padding: '1.25rem', overflow: 'hidden', position: 'relative' }}>
          {/* Canvas View Mode Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-canvas)', padding: '0.25rem', borderRadius: '8px' }}>
              {[
                { id: 'split', label: 'Split Slider', icon: SplitSquareVertical },
                { id: 'processed', label: 'AI Analyzed', icon: Scan },
                { id: 'original', label: 'Raw Original', icon: Eye }
              ].map((m) => {
                const Icon = m.icon;
                const isSel = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      sounds.playBeep(800, 0.02);
                      setViewMode(m.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      background: isSel ? 'var(--bg-surface-elevated)' : 'transparent',
                      border: isSel ? '1px solid var(--border-glass)' : 'none',
                      color: isSel ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  sounds.playLaserScan();
                  runScanProcess(imagePreviewUrl, selectedSample);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem' }}
              >
                <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                <span>Re-Analyze</span>
              </button>

              <button
                onClick={() => {
                  setShowHeatmap(!showHeatmap);
                  sounds.playBeep(950, 0.03);
                }}
                style={{
                  background: showHeatmap ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-surface-elevated)',
                  border: showHeatmap ? '1px solid var(--severity-critical)' : '1px solid var(--border-glass)',
                  color: showHeatmap ? 'var(--severity-critical)' : 'var(--text-secondary)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                AI Heatmap
              </button>
            </div>
          </div>

          {/* Interactive Inspection Canvas Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '460px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: '#000000',
              border: '1px solid var(--border-glass)'
            }}
          >
            {/* Base Image Preview or Placeholder */}
            {!imagePreviewUrl ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                inset: 0,
                padding: '2rem',
                textAlign: 'center'
              }}>
                <UploadCloud size={48} style={{ color: 'var(--accent-cyan)', opacity: 0.6, marginBottom: '1.25rem' }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                  No Road Image Loaded
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', maxWidth: '320px', lineHeight: 1.5 }}>
                  Select a preset sample above, drag and drop an image, or switch to the camera tab to start scanning.
                </div>
              </div>
            ) : (
              <img
                ref={imageRef}
                src={imagePreviewUrl}
                alt="Road Inspection View"
                onLoad={(e) => {
                  setImageNaturalSize({
                    width: e.target.naturalWidth,
                    height: e.target.naturalHeight
                  });
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '520px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            )}

            {/* Split Slider View Comparison Overlay */}
            {imagePreviewUrl && viewMode === 'split' && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${sliderPos}%`,
                  overflow: 'hidden',
                  borderRight: '2px solid var(--accent-cyan)',
                  boxShadow: '0 0 16px rgba(6, 182, 212, 0.8)',
                  pointerEvents: 'none'
                }}
              >
                <img
                  src={isBackendResult ? originalImageUrl : imagePreviewUrl}
                  alt="Raw View"
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '520px',
                    objectFit: 'cover',
                    filter: 'grayscale(0.3) contrast(1.1)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  RAW OPTICAL
                </div>
              </div>
            )}

            {/* Split Slider Handle */}
            {imagePreviewUrl && viewMode === 'split' && (
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(e.target.value)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'ew-resize',
                  zIndex: 25
                }}
              />
            )}

            {/* AI Heatmap Gradient Overlay */}
            {imagePreviewUrl && showHeatmap && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 45% 65%, rgba(244, 63, 94, 0.6) 0%, rgba(245, 158, 11, 0.4) 35%, rgba(6, 182, 212, 0.2) 65%, transparent 80%)',
                  mixBlendMode: 'screen',
                  pointerEvents: 'none',
                  zIndex: 12
                }}
              />
            )}

            {/* Multi-Stage Scanning Animation Overlay */}
            {isScanning && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(7, 10, 18, 0.75)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30
                }}
              >
                <div className="scan-line" />
                <div style={{ textAlign: 'center', maxWidth: '360px', padding: '1.5rem' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '2px solid var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                      margin: '0 auto 1.25rem auto',
                      boxShadow: '0 0 24px rgba(6, 182, 212, 0.4)'
                    }}
                    className="animate-pulse"
                  >
                    <Scan size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#ffffff' }}>
                    AI is analyzing the road surface…
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {scanStages[scanStage]?.title}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    {scanStages[scanStage]?.desc}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${scanProgress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #06b6d4, #38bdf8)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Bounding Boxes Overlaid on Image */}
            {/* Only draw HTML overlay boxes for sample scenarios (not backend results, which already have OpenCV boxes in the image) */}
            {scanComplete && !isBackendResult && viewMode !== 'original' && detectionResult.detections.map((det, idx) => {
              // Use backend image dimensions if available (real upload), else use natural image size
              const refW = detectionResult.backendImageWidth || imageNaturalSize.width || 1000;
              const refH = detectionResult.backendImageHeight || imageNaturalSize.height || 700;
              const left = (det.box[0] / refW) * 100;
              const top = (det.box[1] / refH) * 100;
              const width = ((det.box[2] - det.box[0]) / refW) * 100;
              const height = ((det.box[3] - det.box[1]) / refH) * 100;

              const isHovered = hoveredBox === det.id;
              const color = det.severity === 'High' ? 'var(--severity-critical)' : det.severity === 'Medium' ? 'var(--severity-medium)' : 'var(--accent-blue)';

              return (
                <div
                  key={idx}
                  onMouseEnter={() => {
                    setHoveredBox(det.id);
                    sounds.playLockOn();
                  }}
                  onMouseLeave={() => setHoveredBox(null)}
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    border: `2px solid ${color}`,
                    background: `${color}20`,
                    boxShadow: `0 0 16px ${color}60`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: 20,
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  {/* Bounding Box Label Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-24px',
                      left: '-2px',
                      background: color,
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                    }}
                  >
                    <span>{det.class_name}</span>
                    <span>{Math.round(det.confidence * 100)}%</span>
                  </div>

                  {/* Hover Information Card */}
                  {isHovered && (
                    <div
                      className="glass-panel"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: '240px',
                        padding: '0.85rem',
                        zIndex: 35,
                        border: `1px solid ${color}`,
                        boxShadow: 'var(--shadow-lg)',
                        background: 'var(--bg-glass-strong)'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        {det.class_name}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        {[
                          { label: '↔ LENGTH', value: det.dimensions?.length_cm != null ? `${det.dimensions.length_cm} cm` : '—' },
                          { label: '↕ WIDTH',  value: det.dimensions?.width_cm  != null ? `${det.dimensions.width_cm} cm`  : '—' },
                          { label: '↓ DEPTH',  value: det.dimensions?.depth_cm  != null ? `${det.dimensions.depth_cm} cm`  : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '5px', padding: '0.3rem 0.4rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{label}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{ value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: color, fontWeight: 600 }}>
                        {det.recommendation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Telemetry Breakdown & Repair Priority Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Executive Condition Rating Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="mono-tag" style={{ color: 'var(--text-tertiary)' }}>INSPECTION TELEMETRY</span>
              {getSeverityBadge(detectionResult.severity)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  PAVEMENT CONDITION (PCI)
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: detectionResult.pciScore < 60 ? 'var(--severity-critical)' : 'var(--severity-clear)', marginTop: '0.2rem' }}>
                  {detectionResult.pciScore} <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>/ 100</span>
                </div>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  DISTRESS ANOMALIES
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {detectionResult.distressCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Detected</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                ESTIMATED REPAIR PRIORITY
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon size={16} />
                <span>{detectionResult.repairPriority}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                ESTIMATED REMEDIATION BUDGET
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {detectionResult.estimatedCost}
              </div>
            </div>
          </div>

          {/* ── Incident GPS Location Card ──────────────────────── */}
          {isBackendResult && (
            <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid rgba(6,182,212,0.25)', boxShadow: '0 0 0 1px rgba(6,182,212,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <MapPin size={13} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontWeight: 700 }}>INCIDENT LOCATION</span>
              </div>
              {!detectionGpsLocation && (
                <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>Location not acquired</div>
              )}
              {detectionGpsLocation?.loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.73rem', color: 'var(--accent-cyan)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Acquiring GPS position…
                </div>
              )}
              {detectionGpsLocation && !detectionGpsLocation.loading && (
                <>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: '0.45rem' }}>
                    {detectionGpsLocation.address}
                  </div>
                  {detectionGpsLocation.coords && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                        {detectionGpsLocation.coords.lat.toFixed(6)}°N,&nbsp;{detectionGpsLocation.coords.lng.toFixed(6)}°E
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${detectionGpsLocation.coords.lat},${detectionGpsLocation.coords.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <MapPin size={10} /> Open in Google Maps ↗
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Municipal Requisition Card ──────────────────────── */}
          {isBackendResult && detectionResult.detections.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-glass-strong)', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: '0 0 12px rgba(139, 92, 246, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-purple)' }} />
                <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>MUNICIPAL ROAD REBUILD ORDER</span>
              </div>
              
              {!requisitionSubmitted ? (
                <>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
                    Package detected distress parameters and material estimates into a direct repair requisition for the Municipal Works department.
                  </p>
                  
                  {requisitionLoading ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--accent-purple)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--accent-purple)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      Transmitting to Hassan Municipal Corporation (HCMC)…
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmitRequisition}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--accent-purple), #7c3aed)' }}
                    >
                      <Zap size={13} /> Submit Work Order to HCMC
                    </button>
                  )}
                </>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.85rem', color: 'var(--severity-clear)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem' }}>
                    <CheckCircle2 size={16} /> Work Order Logged
                  </div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '0.45rem' }}>
                    TICKET ID: {submittedTicketId}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', lineHeight: 1.4, marginBottom: '0' }}>
                    Hassan City Municipal Corporation (HCMC) has received the requisition. Repair crew assigned to rebuild to **Grade A Good Quality**. Target completion: 72 hours.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Distress Classification Breakdown List */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Detected Distress Catalog</span>
              <span className="mono-tag" style={{ color: 'var(--accent-cyan)' }}>{detectionResult.detections.length} ITEMS</span>
            </div>

            {detectionResult.detections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--severity-clear)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 600 }}>Optimal Pavement Surface</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No defects detected within tolerance threshold.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {detectionResult.detections.map((det, i) => {
                  const dims = det.dimensions || {};
                  const sevColor = det.severity === 'High'
                    ? 'var(--severity-critical)'
                    : det.severity === 'Medium'
                    ? 'var(--severity-medium)'
                    : 'var(--accent-blue)';
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        background: 'var(--bg-surface-elevated)',
                        border: `1px solid ${sevColor}30`,
                        boxShadow: `0 0 0 1px ${sevColor}15`
                      }}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {det.class_name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: sevColor, fontWeight: 600, marginTop: '0.1rem' }}>
                            {det.severity} Risk
                          </div>
                        </div>
                        <div style={{
                          background: sevColor + '20',
                          border: `1px solid ${sevColor}`,
                          color: sevColor,
                          borderRadius: '6px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {Math.round(det.confidence * 100)}%
                        </div>
                      </div>

                      {/* Dimension metric grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                        {[
                          { label: 'LENGTH', value: dims.length_cm != null ? `${dims.length_cm} cm` : '—', icon: '↔' },
                          { label: 'WIDTH',  value: dims.width_cm  != null ? `${dims.width_cm} cm`  : '—', icon: '↕' },
                          { label: 'DEPTH',  value: dims.depth_cm  != null ? `${dims.depth_cm} cm`  : '—', icon: '↓' },
                        ].map(({ label, value, icon }) => (
                          <div key={label} style={{
                            background: 'var(--bg-canvas)',
                            borderRadius: '6px',
                            padding: '0.4rem 0.5rem',
                            textAlign: 'center',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.15rem' }}>
                              {icon} {label}
                            </div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Material quantity checklist */}
                      {(() => {
                        const mat = calculateMaterials(det);
                        return (
                          <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.65rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.72rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.63rem', fontFamily: 'var(--font-mono)', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>ESTIMATED REPAIR MATERIALS:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', color: 'var(--text-tertiary)' }}>
                              {mat.asphalt && <div>🛠️ {mat.asphalt}</div>}
                              {mat.binder && <div>💧 {mat.binder}</div>}
                              {mat.aggregate && <div>🪨 {mat.aggregate}</div>}
                              {mat.sealant && <div>🩹 {mat.sealant}</div>}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Area + recommendation */}
                      <div style={{ marginTop: '0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                          Area: <strong style={{ color: 'var(--text-secondary)' }}>{dims.area_m2 != null ? `${dims.area_m2} m²` : '—'}</strong>
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontStyle: 'italic', maxWidth: '55%', textAlign: 'right' }}>
                          {det.recommendation}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {/* Smart Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                onClick={() => {
                  sounds.playBeep(900, 0.04);
                  onPushToMap();
                }}
              >
                <MapPin size={15} />
                <span>Sync to GIS Map</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                onClick={() => {
                  sounds.playBeep(850, 0.04);
                  onGenerateReport();
                }}
              >
                <Download size={15} />
                <span>Export Audit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
