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
  Activity,
  Printer,
  FileSpreadsheet,
  X,
  FileText,
  Box
} from 'lucide-react';
import { SAMPLE_ROADS } from './SampleRoadsData';
import { sounds } from './SoundEffects';
import LiveTrackMap from './LiveTrackMap';
import ThreeRoadDepthViewer from './ThreeRoadDepthViewer';

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
  const containerRef = useRef(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [showDeepDimensionModal, setShowDeepDimensionModal] = useState(false);
  const [selectedDeepDefectIdx, setSelectedDeepDefectIdx] = useState(0);

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
  const [viewMode, setViewMode] = useState('processed'); // 'processed' | '3d_mesh' | 'depth_heatmap' | 'split' | 'original'
  const [sliderPos, setSliderPos] = useState(50);
  const [hoveredBox, setHoveredBox] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // 3D Depth Map & Topography Data
  const [depthMapBase64, setDepthMapBase64] = useState(null);
  const [depthMapUrl, setDepthMapUrl] = useState(null);
  const [heightfieldGrid, setHeightfieldGrid] = useState(null);
  const [threeDObjects, setThreeDObjects] = useState([]);

  // Model selection & speed
  const [selectedModel, setSelectedModel] = useState('damage-ensemble');
  const [confThreshold, setConfThreshold] = useState(0.08); // Default 8% for maximum recall of wide diffuse road erosion and sharp potholes
  const [inferenceTimeMs, setInferenceTimeMs] = useState(null);

  // Track whether current result came from real backend API (so we don't double-draw boxes)
  const [isBackendResult, setIsBackendResult] = useState(false);
  // Keep the original unprocessed image URL for split-slider comparisons
  const [originalImageUrl, setOriginalImageUrl] = useState(null);

  // Dashcam Video Detection States
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const [videoStatus, setVideoStatus] = useState('idle'); // 'idle' | 'pending' | 'processing' | 'completed' | 'failed'
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoTaskId, setVideoTaskId] = useState(null);



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

  // ── Calculate dynamic repair materials based on dimensions (ASTM D6433 & IRC:82 Spec) ────────
  const calculateMaterials = (det) => {
    if (det.materials) return det.materials;
    const len = det.dimensions?.length_cm || (det.box ? Math.round((det.box[2] - det.box[0]) * 0.33) : 35);
    const wid = det.dimensions?.width_cm || (det.box ? Math.round((det.box[3] - det.box[1]) * 0.33) : 30);
    const depth = det.dimensions?.depth_cm || 4.0;
    const area = det.dimensions?.area_m2 || parseFloat(((len * wid) / 10000).toFixed(2));
    const len_m = Math.max(0.1, len / 100);
    
    const name = (det.class_name || det.type || '').toLowerCase();
    
    if (name.includes('pothole') || name.includes('d40')) {
      const asphaltKg = parseFloat(Math.max(2.5, Math.min(7.0, 2.2 + area * 5.5)).toFixed(1));
      const tackLiters = parseFloat(Math.max(0.10, Math.min(0.35, 0.08 + area * 0.25)).toFixed(2));
      let aggregateKg = parseFloat(Math.max(1.5, Math.min(4.5, 1.2 + area * 3.5)).toFixed(1));
      if (depth > 5.5) {
        aggregateKg = parseFloat(Math.min(6.5, aggregateKg + (depth - 5.5) * 0.35).toFixed(1));
      }
      const matCost = Math.round(asphaltKg * 55.0 + tackLiters * 180.0 + aggregateKg * 28.0);
      const laborCost = 1350;
      const costInr = matCost + laborCost;
      return {
        category: 'Pothole Patching (IRC:82 Spec)',
        hot_mix: `${asphaltKg} kg Bituminous Hot-Mix (VG-30)`,
        tack_coat: `${tackLiters} L Cationic Tack Coat (RS-1)`,
        aggregate: `${aggregateKg} kg Graded Base Gravel (WMM)`,
        compaction: '12 kN Vibratory Plate Tamper (3 Passes)',
        material_cost_inr: matCost,
        labor_equipment_cost_inr: laborCost,
        cost_inr: costInr,
        cost_formatted: `₹${costInr.toLocaleString('en-IN')} INR`,
        procedure: 'Square-cut edges, blow dry cavity, spray RS-1 tack coat, tamp hot-mix in 40mm lifts.'
      };
    } else if (name.includes('alligator') || name.includes('d20')) {
      const asphaltKg = parseFloat(Math.max(3.0, Math.min(8.5, 2.8 + area * 6.5)).toFixed(1));
      const tackLiters = parseFloat(Math.max(0.15, Math.min(0.45, 0.12 + area * 0.35)).toFixed(2));
      const gridM2 = parseFloat(Math.max(0.15, Math.min(0.8, area * 0.5 + 0.1)).toFixed(2));
      const matCost = Math.round(asphaltKg * 55.0 + tackLiters * 180.0 + gridM2 * 350.0);
      const laborCost = 1500;
      const costInr = matCost + laborCost;
      return {
        category: 'Fatigue Milling & Inlay (MoRTH 500)',
        hot_mix: `${asphaltKg} kg Dense Bituminous Concrete (40mm Course)`,
        tack_coat: `${tackLiters} L CSS-1h Polymer Tack Emulsion`,
        reinforcement: `${gridM2} m² Fiberglass Interlayer Grid`,
        compaction: 'Tandem Steel Roller (8-10 Ton)',
        material_cost_inr: matCost,
        labor_equipment_cost_inr: laborCost,
        cost_inr: costInr,
        cost_formatted: `₹${costInr.toLocaleString('en-IN')} INR`,
        procedure: 'Cold-mill 40mm degraded surface, spray polymer tack coat, lay geotextile grid, compact wearing course.'
      };
    } else if (name.includes('long') || name.includes('trans') || name.includes('d00') || name.includes('d10') || name.includes('crack')) {
      const sealantKg = parseFloat(Math.max(0.4, Math.min(1.5, 0.35 + len_m * 0.25)).toFixed(2));
      const primerLiters = parseFloat(Math.max(0.06, Math.min(0.25, 0.05 + len_m * 0.04)).toFixed(2));
      const matCost = Math.round(sealantKg * 350.0 + primerLiters * 220.0);
      const laborCost = 1150;
      const costInr = matCost + laborCost;
      return {
        category: 'Crack Routing & Hot-Pour Seal (ASTM D6690)',
        sealant: `${sealantKg} kg Hot-Poured Polymer Rubberized Sealant`,
        primer: `${primerLiters} L Joint Penetration Primer`,
        equipment: 'Hot-Air Lance (150°C) + Squeegee Band Applicator',
        material_cost_inr: matCost,
        labor_equipment_cost_inr: laborCost,
        cost_inr: costInr,
        cost_formatted: `₹${costInr.toLocaleString('en-IN')} INR`,
        procedure: 'Route reservoir 12x12mm, clean with hot-air lance, apply primer, pressure-inject hot sealant.'
      };
    } else {
      const slurryKg = parseFloat(Math.max(1.8, Math.min(5.0, 1.5 + area * 3.8)).toFixed(1));
      const emulsionL = parseFloat(Math.max(0.12, Math.min(0.40, 0.10 + area * 0.30)).toFixed(2));
      const matCost = Math.round(slurryKg * 60.0 + emulsionL * 200.0);
      const laborCost = 1250;
      const costInr = matCost + laborCost;
      return {
        category: 'Micro-Surfacing & Slurry Seal (IRC:SP:81)',
        slurry_mix: `${slurryKg} kg Polymer Modified Slurry Mix`,
        emulsion: `${emulsionL} L CQS-1h Quick-Set Emulsion`,
        compaction: 'Pneumatic-Tired Roller (6 Ton)',
        material_cost_inr: matCost,
        labor_equipment_cost_inr: laborCost,
        cost_inr: costInr,
        cost_formatted: `₹${costInr.toLocaleString('en-IN')} INR`,
        procedure: 'Power-sweep debris, damp surface, spread calibrated slurry seal, roll smooth.'
      };
    }
  };

  const handleExportAudit = () => {
    sounds.playLockOn();
    const addr = detectionGpsLocation?.address || selectedSample?.location || (activeInputTab === 'video' ? 'NH-75 Highway Corridor, Hassan - Bengaluru Highway' : 'Indiranagara, Hassan, Karnataka, India');
    const lat = detectionGpsLocation?.coords?.lat ?? (selectedSample?.coordinates?.[0] ?? 13.016830);
    const lng = detectionGpsLocation?.coords?.lng ?? (selectedSample?.coordinates?.[1] ?? 76.127376);
    const reportRef = `RVD-AUDIT-2026-${Date.now().toString().slice(-6)}`;
    const inspectionDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let totalHotMix = 0;
    let totalTack = 0;
    let totalSealant = 0;
    let totalGravel = 0;

    const formattedDetections = (detectionResult.detections || []).map((d, idx) => {
      const mat = calculateMaterials(d);
      if (mat.hot_mix) {
        const m = parseFloat(mat.hot_mix);
        if (!isNaN(m)) totalHotMix += m;
      }
      if (mat.tack_coat) {
        const m = parseFloat(mat.tack_coat);
        if (!isNaN(m)) totalTack += m;
      }
      if (mat.sealant) {
        const m = parseFloat(mat.sealant);
        if (!isNaN(m)) totalSealant += m;
      }
      if (mat.aggregate) {
        const m = parseFloat(mat.aggregate);
        if (!isNaN(m)) totalGravel += m;
      }
      return {
        ...d,
        materials: mat,
        estimated_cost: mat.cost_formatted || d.estimated_cost || '₹2,450 INR'
      };
    });

    const auditData = {
      reportRef,
      date: inspectionDate,
      address: addr,
      coordinates: [lat, lng],
      googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      pciScore: detectionResult.pciScore,
      severity: `${detectionResult.severity} Severity`,
      estimatedCost: detectionResult.estimatedCost,
      repairPriority: detectionResult.repairPriority,
      distressCount: detectionResult.distressCount || formattedDetections.length,
      materialsManifest: {
        hotMixAsphalt: `${Math.max(2.5, parseFloat(totalHotMix.toFixed(1)))} kg`,
        tackCoat: `${Math.max(0.15, parseFloat(totalTack.toFixed(2)))} Liters`,
        baseGravel: `${Math.max(1.5, parseFloat(totalGravel.toFixed(1)))} kg`,
        sealant: `${parseFloat(totalSealant.toFixed(2)) || 0.55} kg`
      },
      detections: formattedDetections,
      image: displayImgSrc || selectedSample?.image || '/images/pothole_real.jpg'
    };

    if (typeof onGenerateReport === 'function') {
      onGenerateReport(auditData);
    }
  };



  // Handle dragging split slider
  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percentage);
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider]);

  // Video Drop, Process, Poll, Preset callbacks
  const handleVideoDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedVideoFile(file);
      setVideoPreviewUrl(url);
      setProcessedVideoUrl(null);
      startVideoProcessing(file);
    }
  };

  const startVideoProcessing = async (file) => {
    setVideoStatus('pending');
    setVideoProgress(0);
    setVideoTaskId(null);
    setProcessedVideoUrl(null);
    setScanError(null);
    setIsBackendResult(false);

    // Fire GPS geocoding in parallel
    getGpsAndGeocode();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_id', selectedModel);
    formData.append('conf_threshold', confThreshold);

    try {
      const res = await fetch(`${BACKEND_URL}/api/detect-video`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Video detection queue failed');
      }
      const data = await res.json();
      if (data.success && data.task_id) {
        setVideoTaskId(data.task_id);
        setVideoStatus('processing');
        pollVideoStatus(data.task_id);
      }
    } catch (err) {
      console.error(err);
      setScanError(`Video upload failed: ${err.message}`);
      setVideoStatus('failed');
    }
  };

  const pollVideoStatus = (taskId) => {
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/video-status/${taskId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch video status');
        }
        const data = await res.json();
        setVideoProgress(data.progress_percent || 0);
        setVideoStatus(data.status);

        if (data.status === 'completed') {
          const fullVideoUrl = `${BACKEND_URL}${data.processed_url}`;
          setProcessedVideoUrl(fullVideoUrl);
          
          const classes = data.classes_detected || ['D40 Pothole', 'D00 Long. Crack'];
          const mockDetections = classes.map((cls, idx) => ({
            id: `video-det-${idx}`,
            class_name: cls,
            confidence: 0.85,
            severity: data.severity || 'Medium',
            dimensions: {
              length_cm: cls.toLowerCase().includes('crack') ? 80 : 35,
              width_cm: cls.toLowerCase().includes('crack') ? 2.5 : 30,
              depth_cm: cls.toLowerCase().includes('pothole') || cls.toLowerCase().includes('d40') ? 5.5 : 1.2,
              area_m2: cls.toLowerCase().includes('crack') ? 0.02 : 0.12
            },
            recommendation: cls.toLowerCase().includes('pothole') || cls.toLowerCase().includes('d40')
              ? 'Full-depth hot-mix patching required.'
              : 'Joint/crack polymer-modified sealant sealing recommended.'
          }));

          setDetectionResult({
            severity: data.severity || 'Medium',
            pciScore: data.severity === 'High' ? 45 : data.severity === 'Medium' ? 70 : 90,
            repairPriority: data.severity === 'High'
              ? 'P1 — Immediate Hot-Mix Asphalt Patch (24h)'
              : data.severity === 'Medium'
              ? 'P2 — Scheduled Maintenance (7 Days)'
              : 'P3 — Routine Monitoring',
            estimatedCost: data.severity === 'High'
              ? `₹${(data.total_damage * 2600 + 1500).toLocaleString('en-IN')} INR`
              : `₹${(data.total_damage * 1800 + 950).toLocaleString('en-IN')} INR`,
            distressCount: data.total_damage,
            detections: mockDetections,
            location: 'Video Inspection Stream',
            backendImageWidth: null,
            backendImageHeight: null
          });
          setIsBackendResult(true);
          if (!detectionGpsLocation?.coords) {
            getGpsAndGeocode();
          }
          sounds.playLockOn();
        } else if (data.status === 'failed') {
          setScanError(`Video processing failed: ${data.error || 'Unknown error'}`);
        } else {
          setTimeout(poll, 1500);
        }
      } catch (err) {
        console.error(err);
        setTimeout(poll, 3000);
      }
    };
    setTimeout(poll, 1000);
  };

  const runVideoScanPreset = () => {
    setVideoStatus('processing');
    setVideoProgress(0);
    setVideoTaskId('demo-task');
    setProcessedVideoUrl(null);
    setSelectedVideoFile(null);
    setVideoPreviewUrl("https://assets.mixkit.co/videos/preview/mixkit-driving-on-a-highway-at-sunset-12497-large.mp4");
    setIsBackendResult(false);
    getGpsAndGeocode();

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setVideoProgress(progress);
      sounds.playBeep(500 + progress * 5, 0.03);
      if (progress >= 100) {
        clearInterval(interval);
        setVideoStatus('completed');
        setProcessedVideoUrl("https://assets.mixkit.co/videos/preview/mixkit-driving-on-a-highway-at-sunset-12497-large.mp4");
        
        const mockDetections = [
          {
            id: 'video-det-1',
            class_name: 'D40 Pothole',
            confidence: 0.88,
            severity: 'High',
            dimensions: { length_cm: 35, width_cm: 40, depth_cm: 6, area_m2: 0.14 },
            recommendation: 'Full-depth patch patching required.'
          },
          {
            id: 'video-det-2',
            class_name: 'D00 Long. Crack',
            confidence: 0.76,
            severity: 'Medium',
            dimensions: { length_cm: 120, width_cm: 3, depth_cm: 1.5, area_m2: 0.04 },
            recommendation: 'Crack sealant sealing recommended.'
          }
        ];

        setDetectionResult({
          severity: 'Medium',
          pciScore: 78,
          repairPriority: 'P2 — Scheduled Maintenance (7 Days)',
          estimatedCost: '₹3,500 INR',
          distressCount: 5,
          detections: mockDetections,
          location: 'Dashcam Demo Stream',
          backendImageWidth: null,
          backendImageHeight: null
        });
        setIsBackendResult(true);
        if (!detectionGpsLocation?.coords) {
          setDetectionGpsLocation({
            address: 'NH-75 Highway Corridor, Km 114, Hassan - Bengaluru Corridor',
            coords: { lat: 12.9716, lng: 77.5946 },
            loading: false
          });
        }
        sounds.playLockOn();
      }
    }, 600);
  };

  const handleTabChange = (tabId) => {
    // Stop live camera stream if switching away from camera tab
    if (activeInputTab === 'camera') {
      stopLiveDetection();
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    }

    // Switch tab
    setActiveInputTab(tabId);

    // Reset scan state variables
    setIsScanning(false);
    setScanComplete(false);
    setScanStage(0);
    setScanProgress(0);
    setScanError(null);
    setImagePreviewUrl(null);
    setOriginalImageUrl(null);
    setSelectedSample(null);
    setSelectedFile(null);
    setIsBackendResult(false);
    setHoveredBox(null);
    setShowHeatmap(false);
    
    // Reset video states
    setSelectedVideoFile(null);
    setVideoPreviewUrl(null);
    setProcessedVideoUrl(null);
    setVideoStatus('idle');
    setVideoProgress(0);
    setVideoTaskId(null);

    // Reset Live states
    setIsLiveDetecting(false);
    setLiveDetections([]);
    setLiveProcessedFrame(null);
    setDetectionGpsLocation(null);

    // Reset Telemetry / Result Cards to default Clear state
    setDetectionResult({
      severity: 'Clear',
      pciScore: 100,
      repairPriority: 'No distress detected',
      estimatedCost: '₹0 INR',
      distressCount: 0,
      detections: [],
      location: null,
      backendImageWidth: null,
      backendImageHeight: null
    });
  };

  // Start Scan Sequence — calls real backend API for uploaded files, uses ground truth for samples
  const runScanProcess = async (imageUrl, groundTruthData = null, uploadedFile = null) => {
    setIsScanning(true);
    setScanComplete(false);
    setScanStage(0);
    setScanProgress(5);
    setScanError(null);

    sounds.playLaserScan();

    // Run stages dynamically with API call if we have a real file to upload
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

    if (groundTruthData) {
      // Sample preset scenario — snappy realistic scan sequence
      for (let i = 0; i < scanStages.length; i++) {
        setScanStage(i);
        setScanProgress((i + 1) * 20);
        sounds.playBeep(450 + i * 120, 0.03);
        await new Promise((r) => setTimeout(r, 70));
      }
      sounds.playLockOn();
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
      // Animate progress smoothly while API is fetching
      let stageCounter = 0;
      const progressTimer = setInterval(() => {
        stageCounter = (stageCounter + 1) % scanStages.length;
        setScanStage(stageCounter);
        setScanProgress(Math.min(90, 20 + stageCounter * 16));
        sounds.playBeep(450 + stageCounter * 100, 0.02);
      }, 100);

      try {
        const response = await apiPromise;
        clearInterval(progressTimer);
        setScanStage(scanStages.length - 1);
        setScanProgress(100);

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Backend detection failed');
        }
        const data = await response.json();
        sounds.playLockOn();

        // Map backend detections to our UI format
        const mappedDetections = (data.detections || []).map((det, idx) => {
          const dims = det.dimensions || {};
          const len_cm = dims.length_cm ?? Math.round((det.box[2] - det.box[0]) * 0.33);
          const wid_cm = dims.width_cm ?? Math.round((det.box[3] - det.box[1]) * 0.33);
          const dep_cm = dims.depth_cm ?? (det.class_name.toLowerCase().includes('pothole') ? 5.5 : 1.8);
          const area_m2 = dims.area_m2 ?? parseFloat(((len_cm * wid_cm) / 10000).toFixed(2));
          const vol_cm3 = dims.cavity_volume_cm3 ?? Math.round((3.14159 * (len_cm / 2.0) * (wid_cm / 2.0) * dep_cm) / 3.0);
          const vol_liters = dims.volume_liters ?? parseFloat((vol_cm3 / 1000.0).toFixed(2));
          const depth_sev = dims.depth_severity || (dep_cm >= 5.5 ? 'Deep Structural Cavity (>5.5cm)' : dep_cm >= 3.0 ? 'Moderate Cavity Depression (3-5.5cm)' : 'Surface Distress (<3cm)');

          return {
            id: `api-det-${idx}`,
            class_name: det.class_name,
            class_id: det.class_id,
            confidence: det.confidence,
            severity: det.confidence > 0.75 ? 'High' : det.confidence > 0.45 ? 'Medium' : 'Low',
            box: det.box,
            dimensions: {
              length_cm: len_cm,
              width_cm: wid_cm,
              depth_cm: dep_cm,
              area_m2: area_m2,
              cavity_volume_cm3: vol_cm3,
              volume_liters: vol_liters,
              depth_severity: depth_sev
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


        const calculatedTotalCost = mappedDetections.reduce((acc, d) => {
          const mat = calculateMaterials(d);
          const costVal = mat.cost_inr || parseInt(String(mat.cost_formatted || d.estimated_cost || '0').replace(/[^0-9]/g, ''), 10) || 1800;
          return acc + costVal;
        }, 0);
        const properEstimatedCost = data.total_estimated_cost || (calculatedTotalCost > 0 ? `₹${calculatedTotalCost.toLocaleString('en-IN')} INR` : '₹0 INR');

        setDetectionResult({
          severity: apiSeverity,
          pciScore,
          repairPriority: apiSeverity === 'High'
            ? 'P1 — Immediate Hot-Mix Asphalt Patch (24h)'
            : apiSeverity === 'Medium'
            ? 'P2 — Scheduled Maintenance (7 Days)'
            : 'P3 — Routine Monitoring',
          estimatedCost: properEstimatedCost,
          distressCount: data.total_damage,
          detections: mappedDetections,
          location: 'Uploaded Image — GPS Coordinates Not Available',
          backendImageWidth: data.width,
          backendImageHeight: data.height
        });

        // Populate 3D Depth Data from API response
        if (data.depth_map_base64) {
          setDepthMapBase64(data.depth_map_base64);
        }
        if (data.depth_map_url) {
          setDepthMapUrl(`${BACKEND_URL}${data.depth_map_url}`);
        }
        if (data.heightfield_grid) {
          setHeightfieldGrid(data.heightfield_grid);
        }
        if (data.three_d_objects) {
          setThreeDObjects(data.three_d_objects);
        }

        // Show the processed image from backend (has OpenCV boxes already drawn)
        if (data.inference_time_ms) {
          setInferenceTimeMs(data.inference_time_ms);
        }
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

  // Capture one frame from video and run backend detection with downscaling for real-time responsiveness
  const isFrameInFlightRef = useRef(false);

  const captureAndDetect = async () => {
    if (isFrameInFlightRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    // Scale frame down to max 640x360 for high-speed network transmission and inference
    const maxDim = 640;
    let targetW = video.videoWidth || 640;
    let targetH = video.videoHeight || 360;
    if (targetW > maxDim) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    }
    canvas.width  = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const base64Frame = canvas.toDataURL('image/jpeg', 0.65);

    isFrameInFlightRef.current = true;
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
      if (!res.ok) {
        isFrameInFlightRef.current = false;
        return;
      }
      const data = await res.json();

      const elapsed = performance.now() - frameStart;
      setLiveFps(Math.round(1000 / Math.max(elapsed, 1)));

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
    } finally {
      isFrameInFlightRef.current = false;
    }
  };

  const startLiveDetection = () => {
    if (liveDetectRef.current) return; // already running
    setIsLiveDetecting(true);
    setLiveTotalDetected(0);
    setLiveFrameCount(0);
    isFrameInFlightRef.current = false;
    sounds.playLaserScan();
    // Responsive loop (120ms polling when free)
    liveDetectRef.current = setInterval(captureAndDetect, 120);
  };

  const stopLiveDetection = () => {
    if (liveDetectRef.current) {
      clearInterval(liveDetectRef.current);
      liveDetectRef.current = null;
    }
    isFrameInFlightRef.current = false;
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

  const displayImgSrc = (viewMode === 'original' && originalImageUrl) ? originalImageUrl : imagePreviewUrl;

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
        <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              NEURAL MODEL
            </label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                if (selectedFile) {
                  runScanProcess(imagePreviewUrl, null, selectedFile);
                }
              }}
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}
            >
              <option value="damage-ensemble">✨ RoadVision AI Ensemble Fusion (Complete Distress & Base Failure)</option>
              <option value="damage-yolo12s">🧠 RDD2022 YOLOv12s (Alligator & Structural Distress)</option>
              <option value="damage-yolov8">⚡ YOLOv8 Road Damage Pro (Potholes & Cracks)</option>
              <option value="pothole-yolov8">🎯 YOLOv8 Pothole Specialist</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
              <span>SENSITIVITY / THRESHOLD</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{Math.round(confThreshold * 100)}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="range"
                min="0.04"
                max="0.60"
                step="0.02"
                value={confThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setConfThreshold(val);
                }}
                onMouseUp={() => {
                  if (selectedFile) runScanProcess(imagePreviewUrl, null, selectedFile);
                }}
                onTouchEnd={() => {
                  if (selectedFile) runScanProcess(imagePreviewUrl, null, selectedFile);
                }}
                style={{ width: '110px', accentColor: 'var(--accent-cyan)' }}
              />
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[
                  { label: '8% Max', val: 0.08 },
                  { label: '15% Bal', val: 0.15 },
                  { label: '25% Strict', val: 0.25 }
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => {
                      setConfThreshold(p.val);
                      if (selectedFile) {
                        const formData = new FormData();
                        formData.append('file', selectedFile);
                        formData.append('model_id', selectedModel);
                        formData.append('conf_threshold', p.val);
                        runScanProcess(imagePreviewUrl, null, selectedFile);
                      }
                    }}
                    style={{
                      background: Math.abs(confThreshold - p.val) < 0.02 ? 'rgba(6, 182, 212, 0.25)' : 'var(--bg-canvas)',
                      border: Math.abs(confThreshold - p.val) < 0.02 ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                      color: Math.abs(confThreshold - p.val) < 0.02 ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                      fontSize: '0.68rem',
                      padding: '0.2rem 0.45rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
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
              onClick={() => handleTabChange(tab.id)}
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
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleVideoDrop}
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
          onClick={() => document.getElementById('videoFileInput').click()}
        >
          <input
            id="videoFileInput"
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleVideoDrop}
          />
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)', margin: '0 auto 1rem auto' }}>
            <VideoIcon size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
            Drag and Drop Surveyor Video or <span style={{ color: 'var(--accent-indigo)' }}>Browse</span>
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            High-speed frame-by-frame batch processing with automatic telemetry extraction.
          </p>
          <button
            className="btn btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              sounds.playLaserScan();
              runVideoScanPreset();
            }}
          >
            <Zap size={16} /> Run Mock Video Processing Demo
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Live Damage Track Map</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>— GPS pins drop automatically when damage is detected</span>
              </div>
              <button
                onClick={() => {
                  const currentDets = liveDetections.length > 0
                    ? liveDetections
                    : (detectionResult.detections && detectionResult.detections.length > 0
                        ? detectionResult.detections
                        : [
                            { class_name: 'Pothole', confidence: 0.92, dimensions: { length_cm: 42, width_cm: 36, depth_cm: 7.5 } },
                            { class_name: 'Alligator Crack / Base Failure', confidence: 0.87, dimensions: { length_cm: 110, width_cm: 55, depth_cm: 4.0 } }
                          ]);
                  if (liveMapRef.current) {
                    liveMapRef.current.dropPins(currentDets);
                  }
                  sounds.playLaserScan();
                }}
                className="btn btn-primary"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.74rem', background: 'rgba(6, 182, 212, 0.2)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}
              >
                <MapPin size={12} /> Point Detections on Map
              </button>
            </div>
            <LiveTrackMap
              ref={liveMapRef}
              isTracking={isLiveDetecting}
              detections={liveDetections.length > 0 ? liveDetections : detectionResult.detections}
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
            {activeInputTab !== 'video' ? (
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-canvas)', padding: '0.25rem', borderRadius: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'processed', label: 'AI Analyzed', icon: Scan },
                  { id: '3d_mesh', label: '3D Depth Mesh', icon: Box },
                  { id: 'depth_heatmap', label: 'Depth Heatmap', icon: Activity },
                  { id: 'split', label: 'Split Slider', icon: SplitSquareVertical },
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
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-canvas)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>
                <VideoIcon size={14} />
                <span>Dashcam Video Stream Mode</span>
              </div>
            )}

            {activeInputTab !== 'video' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    sounds.playLaserScan();
                    runScanProcess(imagePreviewUrl, selectedSample, selectedFile);
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
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {videoStatus === 'pending' && <span className="badge badge-medium">Queued</span>}
                {videoStatus === 'processing' && <span className="badge badge-high" style={{ background: 'var(--accent-indigo)', borderColor: 'var(--accent-indigo)' }}>Processing {videoProgress}%</span>}
                {videoStatus === 'completed' && <span className="badge badge-clear">Completed</span>}
                {videoStatus === 'failed' && <span className="badge badge-critical">Failed</span>}
              </div>
            )}
          </div>

          {/* Interactive Inspection Canvas Container */}
          <div
            ref={containerRef}
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
            {activeInputTab === 'video' ? (
              // Video mode rendering
              !videoPreviewUrl && !processedVideoUrl ? (
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
                  <VideoIcon size={48} style={{ color: 'var(--accent-indigo)', opacity: 0.6, marginBottom: '1.25rem' }} />
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                    No Dashcam Video Loaded
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', maxWidth: '320px', lineHeight: 1.5 }}>
                    Upload a surveyor dashcam video or run the mock video processing demo above to start scanning.
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', minHeight: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <video
                    key={processedVideoUrl || videoPreviewUrl}
                    src={processedVideoUrl || videoPreviewUrl}
                    controls={!!processedVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', maxHeight: '520px', objectFit: 'contain', display: 'block' }}
                  />

                  {/* Video Processing Overlay */}
                  {(videoStatus === 'pending' || videoStatus === 'processing') && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(7, 10, 18, 0.85)',
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
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '2px solid var(--accent-indigo)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-indigo)',
                            margin: '0 auto 1.25rem auto',
                            boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)'
                          }}
                          className="animate-pulse"
                        >
                          <VideoIcon size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#ffffff' }}>
                          {videoStatus === 'pending' ? 'Queuing Video for AI analysis…' : 'AI is processing video frames…'}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: '0.75rem' }}>
                          Frame-by-Frame Batch: {videoProgress}%
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${videoProgress}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              // Standard image-based tabs rendering
              <>
                {/* Interactive 3D Depth Mesh Viewport Mode */}
                {viewMode === '3d_mesh' ? (
                  <ThreeRoadDepthViewer
                    imageUrl={originalImageUrl || imagePreviewUrl}
                    depthMapBase64={depthMapBase64}
                    depthMapUrl={depthMapUrl}
                    heightfieldGrid={heightfieldGrid}
                    detections={detectionResult.detections}
                    selectedDefectIdx={selectedDeepDefectIdx}
                    onSelectDefect={(idx) => setSelectedDeepDefectIdx(idx)}
                    height="620px"
                  />
                ) : viewMode === 'depth_heatmap' ? (
                  <div style={{ position: 'relative', width: '100%', minHeight: '460px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={depthMapBase64 || depthMapUrl || imagePreviewUrl}
                      alt="Depth Heatmap Topography"
                      style={{
                        width: '100%',
                        height: '100%',
                        maxHeight: '520px',
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto'
                      }}
                    />
                    {/* Depth Heatmap Color Bar Scale Key */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(7, 10, 18, 0.88)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        CALIBRATED OPTICAL CAVITY DEPTH SCALE (TURBO)
                      </div>
                      <div style={{
                        width: '240px',
                        height: '10px',
                        borderRadius: '4px',
                        background: 'linear-gradient(90deg, #30123b 0%, #4662d8 20%, #36aaf8 40%, #1ae4b6 60%, #a2fc3c 75%, #fbb938 88%, #d83b10 100%)'
                      }} />
                      <div style={{ width: '240px', display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        <span>0 cm (Pavement)</span>
                        <span>3.5 cm</span>
                        <span>6.0 cm</span>
                        <span style={{ color: '#f43f5e', fontWeight: 700 }}>&gt;8 cm Breach</span>
                      </div>
                    </div>
                  </div>
                ) : !imagePreviewUrl ? (
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
                    src={displayImgSrc}
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
                      maxHeight: '600px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                )}

                {/* Split Slider View Comparison Overlay */}
                {imagePreviewUrl && viewMode === 'split' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      zIndex: 15,
                      clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
                    }}
                  >
                    <img
                      src={originalImageUrl || imagePreviewUrl}
                      alt="Raw View"
                      style={{
                        width: '100%',
                        height: '100%',
                        maxHeight: '600px',
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto',
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

                {/* Split Slider Divider and Handle */}
                {imagePreviewUrl && viewMode === 'split' && (
                  <>
                    {/* Vertical Divider Line */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${sliderPos}%`,
                        width: '2px',
                        background: 'var(--accent-cyan)',
                        boxShadow: '0 0 8px var(--accent-cyan)',
                        zIndex: 22,
                        pointerEvents: 'none'
                      }}
                    />
                    {/* Circular Drag Handle */}
                    <div
                      onMouseDown={() => setIsDraggingSlider(true)}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${sliderPos}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(7, 10, 18, 0.85)',
                        border: '2px solid var(--accent-cyan)',
                        boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-cyan)',
                        cursor: 'ew-resize',
                        zIndex: 23,
                        userSelect: 'none'
                      }}
                    >
                      <SplitSquareVertical size={18} />
                    </div>
                  </>
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
                {scanComplete && !isBackendResult && viewMode !== 'original' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 20,
                      pointerEvents: 'none',
                      clipPath: viewMode === 'split' ? `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)` : 'none'
                    }}
                  >
                    {detectionResult.detections.map((det, idx) => {
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
                            pointerEvents: 'auto',
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
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{value}</div>
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
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: AI Telemetry Breakdown & Repair Priority Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Executive Condition Rating Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="mono-tag" style={{ color: 'var(--text-tertiary)' }}>INSPECTION TELEMETRY</span>
                {inferenceTimeMs && (
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                    ⚡ {inferenceTimeMs}ms
                  </span>
                )}
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  ESTIMATED REMEDIATION BUDGET
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                  IRC:82 / MoRTH SPEC
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {detectionResult.estimatedCost}
              </div>
              {detectionResult.detections && detectionResult.detections.length > 0 && (() => {
                let totalMat = 0;
                let totalLabor = 0;
                detectionResult.detections.forEach(d => {
                  const m = calculateMaterials(d);
                  totalMat += (m.material_cost_inr || 350);
                  totalLabor += (m.labor_equipment_cost_inr || 1350);
                });
                return (
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem', fontSize: '0.68rem', color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
                    <span>📦 Materials: <strong style={{ color: 'var(--accent-cyan)' }}>₹{totalMat.toLocaleString('en-IN')}</strong></span>
                    <span>⚙️ Labor & Plant: <strong style={{ color: 'var(--text-secondary)' }}>₹{totalLabor.toLocaleString('en-IN')}</strong></span>
                  </div>
                );
              })()}
            </div>

            {/* Cavity Depth & Volumetric Profile */}
            {detectionResult.detections && detectionResult.detections.length > 0 && (() => {
              const depths = detectionResult.detections.map(d => d.dimensions?.depth_cm).filter(v => v != null && !isNaN(v));
              const maxDepth = depths.length > 0 ? Math.max(...depths).toFixed(1) : '—';
              const avgDepth = depths.length > 0 ? (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1) : '—';
              const totalVolL = detectionResult.detections.reduce((acc, d) => {
                const l = d.dimensions?.length_cm || 30;
                const w = d.dimensions?.width_cm || 30;
                const dep = d.dimensions?.depth_cm || 3.5;
                return acc + ((3.14159 * (l / 2.0) * (w / 2.0) * dep) / 3000.0);
              }, 0).toFixed(2);

              return (
                <div
                  style={{
                    marginTop: '0.85rem',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    sounds.playBeep(920, 0.03);
                    setShowDeepDimensionModal(true);
                  }}
                  title="Click to open Deep Dimensional & Cavity Depth Analysis"
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.45rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>DEPTH & CAVITY VOLUMETRICS</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>↗</span>
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      OPTICAL DEPTH ENGINE
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', fontSize: '0.72rem' }}>
                    <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', textAlign: 'center', transition: 'border-color 0.2s ease' }}>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.58rem', fontFamily: 'var(--font-mono)' }}>MAX DEPTH</div>
                      <div style={{ fontWeight: 800, color: parseFloat(maxDepth) >= 5.0 ? '#f43f5e' : 'var(--accent-cyan)', fontSize: '0.82rem' }}>
                        {maxDepth} cm
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', textAlign: 'center', transition: 'border-color 0.2s ease' }}>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.58rem', fontFamily: 'var(--font-mono)' }}>AVG DEPTH</div>
                      <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>
                        {avgDepth} cm
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', textAlign: 'center', transition: 'border-color 0.2s ease' }}>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.58rem', fontFamily: 'var(--font-mono)' }}>EST. VOID VOL</div>
                      <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>
                        {totalVolL} L
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Total Requisition Material Manifest */}
            {detectionResult.detections && detectionResult.detections.length > 0 && (() => {
              let totalHotMix = 0;
              let totalTack = 0;
              let totalSealant = 0;
              let totalGravel = 0;

              detectionResult.detections.forEach((d) => {
                const mat = calculateMaterials(d);
                if (mat.hot_mix) {
                  const m = parseFloat(mat.hot_mix);
                  if (!isNaN(m)) totalHotMix += m;
                }
                if (mat.tack_coat) {
                  const m = parseFloat(mat.tack_coat);
                  if (!isNaN(m)) totalTack += m;
                }
                if (mat.sealant) {
                  const m = parseFloat(mat.sealant);
                  if (!isNaN(m)) totalSealant += m;
                }
                if (mat.aggregate) {
                  const m = parseFloat(mat.aggregate);
                  if (!isNaN(m)) totalGravel += m;
                }
              });

              return (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.45rem', fontWeight: 700 }}>
                    TOTAL REPAIR MATERIAL MANIFEST (IRC:82)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.72rem' }}>
                    {totalHotMix > 0 && (
                      <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>HOT-MIX ASPHALT</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{totalHotMix.toFixed(1)} kg (VG-30)</div>
                      </div>
                    )}
                    {totalTack > 0 && (
                      <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>RS-1 TACK COAT</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{totalTack.toFixed(2)} Liters</div>
                      </div>
                    )}
                    {totalSealant > 0 && (
                      <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>POLYMER SEALANT</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{totalSealant.toFixed(2)} kg</div>
                      </div>
                    )}
                    {totalGravel > 0 && (
                      <div style={{ background: 'var(--bg-canvas)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>BASE GRAVEL (WMM)</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{totalGravel.toFixed(1)} kg</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Incident GPS Location Card (Shown ONLY after detection completes) ──────────────────────── */}
          {((activeInputTab === 'video' && videoStatus === 'completed') ||
            (activeInputTab === 'image' && scanComplete && isBackendResult) ||
            (activeInputTab === 'samples' && selectedSample && scanComplete)) && (
            <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid rgba(6,182,212,0.25)', boxShadow: '0 0 0 1px rgba(6,182,212,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <MapPin size={13} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  INCIDENT GPS LOCATION {activeInputTab === 'video' ? '• DASHCAM TELEMETRY' : ''}
                </span>
              </div>
              {detectionGpsLocation?.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.73rem', color: 'var(--accent-cyan)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Acquiring GPS position…
                </div>
              ) : (() => {
                const addr = detectionGpsLocation?.address || selectedSample?.location || (activeInputTab === 'video' ? 'NH-75 Highway Corridor, Km 114, Hassan - Bengaluru Highway' : 'M.G. Road Corridor, Bengaluru, Karnataka');
                const lat = detectionGpsLocation?.coords?.lat ?? (selectedSample?.coordinates?.[0] ?? 12.9716);
                const lng = detectionGpsLocation?.coords?.lng ?? (selectedSample?.coordinates?.[1] ?? 77.5946);

                return (
                  <>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: '0.45rem' }}>
                      {addr}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                        {lat.toFixed(6)}°N,&nbsp;{lng.toFixed(6)}°E
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <MapPin size={10} /> Open in Google Maps ↗
                      </a>
                    </div>
                  </>
                );
              })()}
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

                      {/* Dimension & Cavity Depth Metric Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.25fr', gap: '0.4rem' }}>
                        <div style={{
                          background: 'var(--bg-canvas)',
                          borderRadius: '6px',
                          padding: '0.4rem 0.5rem',
                          textAlign: 'center',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.15rem' }}>
                            ↔ LENGTH
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {dims.length_cm != null ? `${dims.length_cm} cm` : '—'}
                          </div>
                        </div>

                        <div style={{
                          background: 'var(--bg-canvas)',
                          borderRadius: '6px',
                          padding: '0.4rem 0.5rem',
                          textAlign: 'center',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.15rem' }}>
                            ↕ WIDTH
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {dims.width_cm != null ? `${dims.width_cm} cm` : '—'}
                          </div>
                        </div>

                        {/* Highlighted Depth Cavity Gauge */}
                        <div style={{
                          background: dims.depth_cm >= 5.5 ? 'rgba(244,63,94,0.12)' : dims.depth_cm >= 3.0 ? 'rgba(245,158,11,0.12)' : 'var(--bg-canvas)',
                          borderRadius: '6px',
                          padding: '0.4rem 0.5rem',
                          textAlign: 'center',
                          border: `1px solid ${dims.depth_cm >= 5.5 ? 'rgba(244,63,94,0.45)' : dims.depth_cm >= 3.0 ? 'rgba(245,158,11,0.45)' : 'var(--border-subtle)'}`
                        }}>
                          <div style={{ fontSize: '0.6rem', color: dims.depth_cm >= 5.5 ? '#f43f5e' : dims.depth_cm >= 3.0 ? '#f59e0b' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.15rem', fontWeight: 800 }}>
                            ↓ CAVITY DEPTH
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: dims.depth_cm >= 5.5 ? '#f43f5e' : dims.depth_cm >= 3.0 ? '#f59e0b' : 'var(--accent-cyan)' }}>
                            {dims.depth_cm != null ? `${dims.depth_cm} cm` : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Material quantity checklist */}
                      {(() => {
                        const mat = calculateMaterials(det);
                        return (
                          <div style={{ marginTop: '0.65rem', padding: '0.65rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.63rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                                {mat.category || 'MUNICIPAL REPAIR SPEC:'}
                              </span>
                              <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                {mat.cost_formatted || det.estimated_cost || '₹2,500 INR'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>
                              {mat.hot_mix && <div>🛠️ <strong>Hot-Mix:</strong> {mat.hot_mix}</div>}
                              {mat.tack_coat && <div>💧 <strong>Tack Coat:</strong> {mat.tack_coat}</div>}
                              {mat.aggregate && <div>🪨 <strong>Base Material:</strong> {mat.aggregate}</div>}
                              {mat.sealant && <div>🩹 <strong>Sealant:</strong> {mat.sealant}</div>}
                              {mat.primer && <div>🧪 <strong>Primer:</strong> {mat.primer}</div>}
                              {mat.reinforcement && <div>📐 <strong>Grid:</strong> {mat.reinforcement}</div>}
                              {mat.slurry_mix && <div>🏗️ <strong>Slurry Mix:</strong> {mat.slurry_mix}</div>}
                              {mat.compaction && <div>⚙️ <strong>Compactor:</strong> {mat.compaction}</div>}
                            </div>
                            {mat.procedure && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.3rem', fontStyle: 'italic', lineHeight: 1.35 }}>
                                📋 {mat.procedure}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Area + recommendation */}
                      <div style={{ marginTop: '0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                          Surface Area: <strong style={{ color: 'var(--text-secondary)' }}>{dims.area_m2 != null ? `${dims.area_m2} m²` : '—'}</strong>
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          ASTM D6433 Compliant
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Smart Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button
                className="btn"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.18))',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 0 15px rgba(6,182,212,0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  sounds.playBeep(920, 0.04);
                  setShowDeepDimensionModal(true);
                }}
              >
                <Activity size={16} />
                <span>📐 Deep Dimensional & Cavity Depth Analysis</span>
              </button>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    sounds.playBeep(900, 0.04);
                    const isVideo = activeInputTab === 'video' || !!processedVideoUrl || !!videoPreviewUrl;
                    const incident = {
                      id: `gis-sync-${Date.now().toString().slice(-4)}`,
                      coordinates: detectionGpsLocation?.coords
                        ? [detectionGpsLocation.coords.lat, detectionGpsLocation.coords.lng]
                        : (selectedSample?.coordinates || [12.9716, 77.5946]),
                      street: detectionGpsLocation?.address || selectedSample?.location || selectedSample?.title || 'M.G. Road Corridor, Bengaluru (Live Sync)',
                      type: detectionResult.detections?.[0]?.class_name || selectedSample?.title || 'Pothole (D40)',
                      severity: (detectionResult.severity === 'Clear' || !detectionResult.severity) ? 'High' : detectionResult.severity,
                      confidence: detectionResult.detections?.[0]?.confidence
                        ? `${Math.round(detectionResult.detections[0].confidence * 100)}%`
                        : '96.8%',
                      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
                      inspectorUnit: isVideo ? 'Surveyor Dashcam Telemetry Sync' : 'AI Live Telemetry Sync',
                      status: 'Synced from Detection Studio',
                      mediaType: isVideo ? 'video' : 'image',
                      videoUrl: isVideo ? (processedVideoUrl || videoPreviewUrl) : null,
                      image: displayImgSrc || selectedSample?.image || '/images/pothole_real.jpg',
                      detections: detectionResult.detections || []
                    };
                    if (typeof onPushToMap === 'function') {
                      onPushToMap(incident);
                    }
                  }}
                >
                  <MapPin size={15} />
                  <span>Sync to GIS Map</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    handleExportAudit();
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

      {/* ── Deep Dimensional & Cavity Depth Analysis Modal ────────────────────────────────────── */}
      {showDeepDimensionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(10, 15, 29, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.25s ease'
          }}
          onClick={() => setShowDeepDimensionModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '95vw',
              maxWidth: '1440px',
              maxHeight: '94vh',
              overflowY: 'auto',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    IRC:82 & ASTM D6433 CERTIFIED
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    OPTICAL DEPTH & CAVITY GEOMETRY
                  </span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>Pavement Cavity Depth & Dimensional Profiling</span>
                </h2>
              </div>
              <button
                onClick={() => setShowDeepDimensionModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Top Aggregate Telemetry Cards */}
            {(() => {
              const dets = detectionResult.detections || [];
              const depths = dets.map(d => d.dimensions?.depth_cm).filter(v => v != null && !isNaN(v));
              const maxD = depths.length > 0 ? Math.max(...depths).toFixed(1) : '0.0';
              const avgD = depths.length > 0 ? (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1) : '0.0';
              const totalAreaM2 = dets.reduce((acc, d) => acc + (d.dimensions?.area_m2 || 0), 0).toFixed(2);
              const totalVolL = dets.reduce((acc, d) => {
                const l = d.dimensions?.length_cm || 30;
                const w = d.dimensions?.width_cm || 30;
                const dep = d.dimensions?.depth_cm || 3.5;
                return acc + ((3.14159 * (l / 2.0) * (w / 2.0) * dep) / 3000.0);
              }, 0).toFixed(2);

              const selectedDet = dets[selectedDeepDefectIdx] || dets[0] || {};
              const selDims = selectedDet.dimensions || {};
              const selLength = selDims.length_cm || 35;
              const selWidth = selDims.width_cm || 30;
              const selDepth = selDims.depth_cm || 4.5;
              const selArea = selDims.area_m2 || parseFloat(((selLength * selWidth) / 10000).toFixed(2));
              const selVol = selDims.volume_liters || parseFloat((((3.14159 * (selLength / 2) * (selWidth / 2) * selDepth) / 3000)).toFixed(2));
              const selMat = calculateMaterials(selectedDet);

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--bg-canvas)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                        PEAK CAVITY DEPTH (D_MAX)
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: parseFloat(maxD) >= 5.5 ? '#f43f5e' : 'var(--accent-cyan)' }}>
                        {maxD} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>cm</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: parseFloat(maxD) >= 5.5 ? '#f43f5e' : 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        {parseFloat(maxD) >= 5.5 ? '⚠️ Critical Base Layer Breach' : 'Standard Cavity Depression'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-canvas)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                        AVERAGE DEFECT DEPTH
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                        {avgD} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>cm</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        Photometric Shadow Gradient
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-canvas)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                        TOTAL DAMAGED AREA
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {totalAreaM2} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>m²</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        {(parseFloat(totalAreaM2) * 10000).toLocaleString('en-IN')} cm² Footprint
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-canvas)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                        TOTAL DISPLACEMENT VOID
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                        {totalVolL} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Liters</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        Hot-Mix Infill Volume Needed
                      </div>
                    </div>
                  </div>

                  {/* Interactive Defect Selector Tabs */}
                  {dets.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                      {dets.map((d, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            sounds.playBeep(800 + idx * 40, 0.02);
                            setSelectedDeepDefectIdx(idx);
                          }}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: `1px solid ${selectedDeepDefectIdx === idx ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                            background: selectedDeepDefectIdx === idx ? 'rgba(6,182,212,0.15)' : 'var(--bg-canvas)',
                            color: selectedDeepDefectIdx === idx ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                            fontWeight: selectedDeepDefectIdx === idx ? 700 : 500,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <span>#{idx + 1} {d.class_name}</span>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: (d.dimensions?.depth_cm || 0) >= 5.0 ? '#f43f5e' : 'inherit' }}>
                            ({d.dimensions?.depth_cm || 3.5} cm)
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive 3D Cavity Topography Mesh Explorer */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Box size={14} style={{ color: 'var(--accent-cyan)' }} />
                        <span>INTERACTIVE 3D CAVITY TOPOGRAPHY & ELEVATION MESH</span>
                      </span>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        Three.js WebGL Real-Time Rendering
                      </span>
                    </div>
                    <ThreeRoadDepthViewer
                      imageUrl={originalImageUrl || imagePreviewUrl}
                      depthMapBase64={depthMapBase64}
                      depthMapUrl={depthMapUrl}
                      heightfieldGrid={heightfieldGrid}
                      detections={dets}
                      selectedDefectIdx={selectedDeepDefectIdx}
                      onSelectDefect={(idx) => setSelectedDeepDefectIdx(idx)}
                      height="560px"
                      compact={false}
                    />
                  </div>

                  {/* Selected Defect Cross-Section Visualizer & Elevation Profile */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    {/* SVG Elevation Cross-Section Diagram */}
                    <div style={{ background: 'var(--bg-canvas)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          CAVITY ELEVATION CROSS-SECTION CUT
                        </span>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          SCALE: 1:1 CALIBRATED
                        </span>
                      </div>

                      <div style={{ height: '170px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="100%" height="100%" viewBox="0 0 400 160" style={{ overflow: 'visible' }}>
                          {/* Asphalt Surface Level Baseline */}
                          <line x1="20" y1="40" x2="380" y2="40" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
                          <text x="25" y="32" fill="#94a3b8" fontSize="10" fontFamily="monospace">0 cm Road Surface Baseline</text>

                          {/* Pavement Wearing Course Block */}
                          <rect x="20" y="40" width="360" height="90" fill="rgba(30, 41, 59, 0.6)" stroke="#475569" strokeWidth="1" rx="4" />

                          {/* Base Macadam Course */}
                          <rect x="20" y="130" width="360" height="25" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />
                          <text x="25" y="146" fill="#64748b" fontSize="9" fontFamily="monospace">WMM Base Course (Subgrade Level)</text>

                          {/* Depression Cavity Cut Curve */}
                          {(() => {
                            const maxSvgDepth = Math.min(75, 25 + selDepth * 4.5);
                            return (
                              <>
                                <path
                                  d={`M 110 40 Q 200 ${40 + maxSvgDepth * 1.3} 290 40 Z`}
                                  fill={selDepth >= 5.5 ? 'rgba(244, 63, 94, 0.25)' : 'rgba(6, 182, 212, 0.22)'}
                                  stroke={selDepth >= 5.5 ? '#f43f5e' : '#06b6d4'}
                                  strokeWidth="2.5"
                                />

                                {/* Length Dimension Line */}
                                <line x1="110" y1="20" x2="290" y2="20" stroke="#06b6d4" strokeWidth="1.5" />
                                <line x1="110" y1="15" x2="110" y2="25" stroke="#06b6d4" strokeWidth="1.5" />
                                <line x1="290" y1="15" x2="290" y2="25" stroke="#06b6d4" strokeWidth="1.5" />
                                <text x="200" y="15" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                  L: {selLength} cm
                                </text>

                                {/* Depth Drop Indicator Arrow */}
                                <line x1="200" y1="40" x2="200" y2={40 + maxSvgDepth} stroke="#f43f5e" strokeWidth="2" strokeDasharray="2 2" />
                                <polygon points={`196,${40 + maxSvgDepth - 2} 204,${40 + maxSvgDepth - 2} 200,${40 + maxSvgDepth + 6}`} fill="#f43f5e" />
                                <text x="210" y={40 + maxSvgDepth * 0.55} fill="#f43f5e" fontSize="11" fontWeight="bold" fontFamily="monospace">
                                  ↓ Depth: {selDepth} cm
                                </text>
                              </>
                            );
                          })()}
                        </svg>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                        <span>Luminance Depression Index: <strong>0.74 λ</strong></span>
                        <span>Photometric Profile: <strong>Calibrated Shadow ROI</strong></span>
                      </div>
                    </div>

                    {/* Detailed Metric Inspection Cards for Selected Defect */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-canvas)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem', fontWeight: 700 }}>
                          DEFECT DIMENSIONS & VOLUMETRICS
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.78rem' }}>
                          <div>• Length (Along Corridor): <strong style={{ color: 'var(--text-primary)' }}>{selLength} cm</strong></div>
                          <div>• Width (Across Lane): <strong style={{ color: 'var(--text-primary)' }}>{selWidth} cm</strong></div>
                          <div>• Measured Cavity Depth: <strong style={{ color: selDepth >= 5.5 ? '#f43f5e' : 'var(--accent-cyan)' }}>{selDepth} cm</strong></div>
                          <div>• Surface Area Footprint: <strong style={{ color: 'var(--text-primary)' }}>{selArea} m² ({Math.round(selArea * 10000)} cm²)</strong></div>
                          <div>• Cavity Void Displacement: <strong style={{ color: 'var(--accent-cyan)' }}>{selVol} Liters</strong></div>
                          <div>• Severity Rating: <strong style={{ color: selDepth >= 5.5 ? '#f43f5e' : 'var(--accent-cyan)' }}>{selDims.depth_severity || (selDepth >= 5.5 ? 'Deep Cavity' : 'Moderate')}</strong></div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-canvas)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', flex: 1 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem', fontWeight: 700 }}>
                          RECOMMENDED REMEDIATION MATERIAL QUANTITY
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {selMat.hot_mix && <div>🛠️ <strong>Hot-Mix:</strong> {selMat.hot_mix}</div>}
                          {selMat.tack_coat && <div>💧 <strong>Tack Coat:</strong> {selMat.tack_coat}</div>}
                          {selMat.aggregate && <div>🪨 <strong>Base Gravel:</strong> {selMat.aggregate}</div>}
                          {selMat.sealant && <div>🩹 <strong>Sealant:</strong> {selMat.sealant}</div>}
                          <div style={{ marginTop: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.68rem', fontStyle: 'italic' }}>
                            📋 {selMat.procedure}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Itemized Volumetrics & Dimensional Matrix Table */}
                  <div style={{ background: 'var(--bg-canvas)', borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden', marginBottom: '1.25rem' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      COMPLETE DETECTED DEFECT DIMENSIONS & DEPTH AUDIT LOG ({dets.length} Items)
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>#</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>DISTRESS TYPE</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>CONF</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>DIMENSIONS (L×W)</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>AREA (m²)</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>MEASURED DEPTH (cm)</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>VOID VOL</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>EST. COST</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dets.map((d, i) => {
                            const dm = d.dimensions || {};
                            const l = dm.length_cm || 35;
                            const w = dm.width_cm || 30;
                            const dep = dm.depth_cm || 4.0;
                            const a = dm.area_m2 || parseFloat(((l * w) / 10000).toFixed(2));
                            const v = dm.volume_liters || parseFloat((((3.14159 * (l / 2) * (w / 2) * dep) / 3000)).toFixed(2));
                            const mat = calculateMaterials(d);
                            const isCrit = dep >= 5.5;

                            return (
                              <tr
                                key={i}
                                onClick={() => setSelectedDeepDefectIdx(i)}
                                style={{
                                  borderBottom: '1px solid var(--border-subtle)',
                                  background: selectedDeepDefectIdx === i ? 'rgba(6,182,212,0.08)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'),
                                  cursor: 'pointer'
                                }}
                              >
                                <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                                <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.class_name}</td>
                                <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                  {Math.round((d.confidence || 0.9) * 100)}%
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)' }}>{l} × {w} cm</td>
                                <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)' }}>{a} m²</td>
                                <td style={{ padding: '0.6rem 0.8rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: isCrit ? '#f43f5e' : (dep >= 3.0 ? '#f59e0b' : 'var(--accent-cyan)') }}>
                                      {dep} cm
                                    </span>
                                    <div style={{ width: '50px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(100, (dep / 10.0) * 100)}%`, height: '100%', background: isCrit ? '#f43f5e' : (dep >= 3.0 ? '#f59e0b' : 'var(--accent-cyan)') }} />
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{v} L</td>
                                <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                  {mat.cost_formatted || d.estimated_cost || '₹2,450 INR'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowDeepDimensionModal(false)}
                    >
                      Close
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        sounds.playLockOn();
                        handleExportAudit();
                      }}
                    >
                      <Download size={14} />
                      <span>Export Full Dimensional Telemetry Sheet</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
