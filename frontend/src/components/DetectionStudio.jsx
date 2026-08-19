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

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function DetectionStudio({ onPushToMap, onGenerateReport }) {
  const [activeInputTab, setActiveInputTab] = useState('image'); // 'image' | 'video' | 'camera' | 'samples'
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(SAMPLE_ROADS[0].image);
  const [selectedSample, setSelectedSample] = useState(SAMPLE_ROADS[0]);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(true); // Default to showing sample result

  // Detection Results State
  const [detectionResult, setDetectionResult] = useState({
    severity: SAMPLE_ROADS[0].severity,
    pciScore: SAMPLE_ROADS[0].pciScore,
    repairPriority: SAMPLE_ROADS[0].repairPriority,
    estimatedCost: SAMPLE_ROADS[0].estimatedCost,
    distressCount: SAMPLE_ROADS[0].distressCount,
    detections: SAMPLE_ROADS[0].detections,
    location: SAMPLE_ROADS[0].location
  });

  // Display View modes
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'processed' | 'original' | 'heatmap'
  const [sliderPos, setSliderPos] = useState(50);
  const [hoveredBox, setHoveredBox] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Model selection
  const [selectedModel, setSelectedModel] = useState('damage-yolo12s');
  const [confThreshold, setConfThreshold] = useState(0.25);

  // Camera stream ref
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const scanStages = [
    { title: 'Surface Mesh Acquisition', desc: 'Ingesting 3D pavement geometry and ambient illumination.' },
    { title: 'Depth & Gradient Mapping', desc: 'Computing orthorectified surface depression gradients.' },
    { title: 'YOLOv12s Feature Extraction', desc: 'Running neural convolutional tensor passes.' },
    { title: 'Distress Segmentation', desc: 'Generating bounding boxes & polygon masks.' },
    { title: 'Structural Severity Matrix', desc: 'Computing PCI impact and repair priority.' }
  ];

  // Start Scan Sequence (Simulated or Backend)
  const runScanProcess = async (imageUrl, groundTruthData = null) => {
    setIsScanning(true);
    setScanComplete(false);
    setScanStage(0);
    setScanProgress(5);
    sounds.playLaserScan();

    for (let i = 0; i < scanStages.length; i++) {
      setScanStage(i);
      setScanProgress((i + 1) * 20);
      sounds.playBeep(450 + i * 120, 0.04);
      await new Promise((r) => setTimeout(r, 450));
    }

    sounds.playLockOn();
    setIsScanning(false);
    setScanComplete(true);

    if (groundTruthData) {
      setDetectionResult(groundTruthData);
    } else {
      // Generated result for user custom upload
      const count = Math.floor(Math.random() * 3) + 1;
      const detections = [
        {
          id: 'user-det-1',
          class_name: 'Pothole (D40)',
          confidence: 0.962,
          severity: 'High',
          box: [220, 280, 520, 480],
          dimensions: { width: '52 cm', depth: '6.8 cm', area: '0.28 m²' },
          recommendation: 'Full depth hot asphalt patch'
        },
        {
          id: 'user-det-2',
          class_name: 'Longitudinal Crack (D00)',
          confidence: 0.908,
          severity: 'Medium',
          box: [580, 320, 820, 440],
          dimensions: { width: '92 cm', depth: '1.2 cm', area: '0.42 m²' },
          recommendation: 'Hot pour rubberized crack sealant'
        }
      ];
      setDetectionResult({
        severity: 'High',
        pciScore: 54,
        repairPriority: 'P1 — Scheduled Maintenance (48h)',
        estimatedCost: '₹2,35,000 INR',
        distressCount: detections.length,
        detections,
        location: 'Uploaded GPS: 37.7749° N, 122.4194° W'
      });
    }
  };

  // Handle Drag & Drop Image
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setImagePreviewUrl(url);
      runScanProcess(url);
    }
  };

  // Handle Preset Sample Selection
  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    setImagePreviewUrl(sample.image);
    runScanProcess(sample.image, sample);
  };

  // Handle Camera Stream
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        sounds.playBeep(900, 0.05);
      } catch (err) {
        alert('Camera access denied or unavailable.');
      }
    }
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

      {/* Live Camera Stream Mode */}
      {activeInputTab === 'camera' && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto 1.5rem auto', borderRadius: '12px', overflow: 'hidden', background: '#000000', position: 'relative' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '360px', objectFit: 'cover' }} />
            {cameraActive && <div className="scan-line" />}
          </div>
          <button className="btn btn-primary" onClick={toggleCamera}>
            <Camera size={18} />
            <span>{cameraActive ? 'Stop Live Feed' : 'Activate Live Dashcam'}</span>
          </button>
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
            {/* Base Image Preview */}
            <img
              src={imagePreviewUrl}
              alt="Road Inspection View"
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '520px',
                objectFit: 'cover',
                display: 'block'
              }}
            />

            {/* Split Slider View Comparison Overlay */}
            {viewMode === 'split' && (
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
                  src={imagePreviewUrl}
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
            {viewMode === 'split' && (
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
            {showHeatmap && (
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
            {scanComplete && viewMode !== 'original' && detectionResult.detections.map((det, idx) => {
              // Normalize box to percentages based on sample 1000x700 coord space
              const left = (det.box[0] / 1000) * 100;
              const top = (det.box[1] / 700) * 100;
              const width = ((det.box[2] - det.box[0]) / 1000) * 100;
              const height = ((det.box[3] - det.box[1]) / 700) * 100;

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
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                        {det.class_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginBottom: '0.5rem' }}>
                        <div>Width: <span style={{ color: '#fff', fontWeight: 600 }}>{det.dimensions.width}</span></div>
                        <div>Depth: <span style={{ color: '#fff', fontWeight: 600 }}>{det.dimensions.depth}</span></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: color, fontWeight: 600 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {detectionResult.detections.map((det, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {det.class_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                        Area: {det.dimensions.area} • Depth: {det.dimensions.depth}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono-tag" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>
                        {Math.round(det.confidence * 100)}%
                      </div>
                      <span style={{ fontSize: '0.68rem', color: det.severity === 'High' ? 'var(--severity-critical)' : 'var(--severity-medium)' }}>
                        {det.severity} Risk
                      </span>
                    </div>
                  </div>
                ))}
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
