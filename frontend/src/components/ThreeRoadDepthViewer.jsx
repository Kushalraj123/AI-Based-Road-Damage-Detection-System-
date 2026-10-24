import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Layers,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sliders,
  Eye,
  Activity,
  Zap,
  Info,
  ChevronDown,
  Compass,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { sounds } from './SoundEffects';

/**
 * ThreeRoadDepthViewer
 * Ultra-Responsive Big 3D Surface Topography & Cavity Depth Viewer powered by Three.js
 */
export default function ThreeRoadDepthViewer({
  imageUrl,
  depthMapBase64,
  depthMapUrl,
  heightfieldGrid,
  detections = [],
  selectedDefectIdx = 0,
  onSelectDefect,
  height = '600px',
  compact = false
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const probesGroupRef = useRef(null);
  const reqAnimRef = useRef(null);

  // Viewer State
  const [shaderMode, setShaderMode] = useState('heatmap'); // 'heatmap' | 'photometric' | 'lidar' | 'contours'
  const [depthExaggeration, setDepthExaggeration] = useState(2.5); // 1.0 to 5.0
  const [showWireframe, setShowWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(selectedDefectIdx);
  const [activeSliceAxis, setActiveSliceAxis] = useState('x'); // 'x' (Length) | 'y' (Width)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);

  // Track dragging for custom orbit control
  const isMouseDownRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 15.5, phi: Math.PI / 3.2, theta: Math.PI / 4.2 });

  useEffect(() => {
    setSelectedIdx(selectedDefectIdx);
  }, [selectedDefectIdx]);

  // Set up 3D WebGL Canvas
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 1000;
    const heightPx = container.clientHeight || 600;

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    scene.background = new THREE.Color(isDark ? 0x070b14 : 0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 1000);
    cameraRef.current = camera;

    const updateCameraPos = () => {
      const { radius, phi, theta } = cameraSphericalRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, -0.4, 0);
    };
    updateCameraPos();

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Clear previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.6 : 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, isDark ? 2.8 : 3.5);
    keyLight.position.set(12, 18, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa855f7, isDark ? 2.0 : 1.4);
    fillLight.position.set(-12, 10, -12);
    scene.add(fillLight);

    const cyanPoint = new THREE.PointLight(0x06b6d4, 3.5, 25);
    cyanPoint.position.set(0, 5, 0);
    scene.add(cyanPoint);

    // --- Ground Grid Elevation Base ---
    const gridHelper = new THREE.GridHelper(22, 44, 0x06b6d4, isDark ? 0x1e293b : 0xcbd5e1);
    gridHelper.position.y = -2.6;
    scene.add(gridHelper);

    // --- Build Big 3D Surface Topography Heightfield Mesh ---
    const gridCols = 80;
    const gridRows = 60;
    const meshW = 13.5;
    const meshH = 9.5;
    const planeGeo = new THREE.PlaneGeometry(meshW, meshH, gridCols - 1, gridRows - 1);
    planeGeo.rotateX(-Math.PI / 2);

    // Apply Elevation Displacement from heightfieldGrid / detections
    const posAttr = planeGeo.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    // Precalculate elevation displacement
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // Normalized coordinates [0..1]
      const nx = (vx + meshW / 2) / meshW;
      const nz = (vz + meshH / 2) / meshH;

      let depressionCm = 0.0;

      // 1. Try reading from heightfieldGrid if provided
      if (heightfieldGrid && heightfieldGrid.length > 0) {
        const rowIdx = Math.min(heightfieldGrid.length - 1, Math.max(0, Math.floor(nz * heightfieldGrid.length)));
        const colIdx = Math.min(heightfieldGrid[0].length - 1, Math.max(0, Math.floor(nx * heightfieldGrid[0].length)));
        depressionCm = heightfieldGrid[rowIdx][colIdx] || 0.0;
      }

      // 2. Combine with detection boxes if available
      if (detections && detections.length > 0) {
        detections.forEach((d) => {
          const b = d.normalized_box || (d.box ? [d.box[0]/1000, d.box[1]/700, d.box[2]/1000, d.box[3]/700] : [0.3, 0.4, 0.7, 0.7]);
          const bxMin = b[0], byMin = b[1], bxMax = b[2], byMax = b[3];
          const bCenterX = (bxMin + bxMax) / 2;
          const bCenterY = (byMin + byMax) / 2;
          const bRadiusX = Math.max(0.05, (bxMax - bxMin) / 2);
          const bRadiusY = Math.max(0.05, (byMax - byMin) / 2);

          const dx = (nx - bCenterX) / bRadiusX;
          const dy = (nz - bCenterY) / bRadiusY;
          const distSq = dx * dx + dy * dy;

          if (distSq < 1.0) {
            const targetDepth = d.dimensions?.depth_cm || 5.5;
            const profile = Math.pow(1.0 - distSq, 1.35) * targetDepth;
            depressionCm = Math.max(depressionCm, profile);
          }
        });
      }

      // 3D vertical displacement in Three.js units (scale: 1 cm ≈ 0.18 units)
      const vy = -(depressionCm * 0.19 * depthExaggeration);
      posAttr.setY(i, vy);

      // Color mapping: 0cm = cyan/blue, 3cm = green/yellow, 6cm = orange, 8cm+ = bright red/magenta
      const depthRatio = Math.min(1.0, depressionCm / 9.0);
      if (depthRatio < 0.05) {
        color.setHSL(0.55, 0.85, 0.5); // Cyan surface level
      } else if (depthRatio < 0.35) {
        color.setHSL(0.42 - depthRatio * 0.55, 0.95, 0.5); // Green to Yellow
      } else if (depthRatio < 0.7) {
        color.setHSL(0.1 - (depthRatio - 0.35) * 0.28, 1.0, 0.52); // Orange to Red
      } else {
        color.setHSL(0.95, 1.0, 0.55); // Magenta deep breach
      }
      colors.push(color.r, color.g, color.b);
    }

    planeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    planeGeo.computeVertexNormals();

    // Textures
    const textureLoader = new THREE.TextureLoader();
    let diffuseMap = null;
    const texSource = depthMapBase64 || depthMapUrl || imageUrl;
    if (texSource) {
      diffuseMap = textureLoader.load(texSource);
      diffuseMap.wrapS = THREE.ClampToEdgeWrapping;
      diffuseMap.wrapT = THREE.ClampToEdgeWrapping;
    }

    const material = new THREE.MeshStandardMaterial({
      vertexColors: shaderMode === 'heatmap' || shaderMode === 'contours' || shaderMode === 'lidar',
      map: (shaderMode === 'photometric' || !diffuseMap) ? diffuseMap : (shaderMode === 'heatmap' ? diffuseMap : null),
      wireframe: showWireframe || shaderMode === 'lidar',
      roughness: 0.65,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    const roadMesh = new THREE.Mesh(planeGeo, material);
    roadMesh.castShadow = true;
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);
    meshRef.current = roadMesh;

    // --- Road Base & Subgrade Foundation Box (Cutaway Slab) ---
    const slabGeo = new THREE.BoxGeometry(meshW + 0.3, 0.5, meshH + 0.3);
    const slabMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x94a3b8,
      roughness: 0.9,
      metalness: 0.1
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.y = -0.26;
    scene.add(slabMesh);

    // --- 3D Depth Probes & Distress Markers ---
    const probesGroup = new THREE.Group();
    probesGroupRef.current = probesGroup;
    scene.add(probesGroup);

    if (detections && detections.length > 0) {
      detections.forEach((det, idx) => {
        const b = det.normalized_box || (det.box ? [det.box[0]/1000, det.box[1]/700, det.box[2]/1000, det.box[3]/700] : [0.3, 0.4, 0.7, 0.7]);
        const bxMin = b[0], byMin = b[1], bxMax = b[2], byMax = b[3];
        const cx = (bxMin + bxMax) / 2;
        const cy = (byMin + byMax) / 2;

        // Convert to 3D world coords on road mesh
        const worldX = (cx - 0.5) * meshW;
        const worldZ = (cy - 0.5) * meshH;
        const boxW = Math.max(0.5, (bxMax - bxMin) * meshW);
        const boxH = Math.max(0.5, (byMax - byMin) * meshH);
        const depthVal = det.dimensions?.depth_cm || 4.5;
        const depthDisplacement = depthVal * 0.19 * depthExaggeration;

        const isSelected = idx === selectedIdx;
        const probeColor = isSelected ? 0x06b6d4 : (depthVal >= 5.5 ? 0xf43f5e : 0xf59e0b);

        // 1. 3D Bounding Outline Cage
        const cageGeo = new THREE.BoxGeometry(boxW, Math.max(0.35, depthDisplacement), boxH);
        const cageEdges = new THREE.EdgesGeometry(cageGeo);
        const cageMat = new THREE.LineBasicMaterial({
          color: probeColor,
          linewidth: isSelected ? 3 : 1.5
        });
        const cageMesh = new THREE.LineSegments(cageEdges, cageMat);
        cageMesh.position.set(worldX, -depthDisplacement / 2, worldZ);
        probesGroup.add(cageMesh);

        // 2. Vertical Depth Probe Line (from 0cm surface level to bottom of cavity)
        const linePoints = [
          new THREE.Vector3(worldX, 0.08, worldZ),
          new THREE.Vector3(worldX, -depthDisplacement, worldZ)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineDashedMaterial({
          color: probeColor,
          dashSize: 0.12,
          gapSize: 0.06
        });
        const probeLine = new THREE.Line(lineGeo, lineMat);
        probeLine.computeLineDistances();
        probesGroup.add(probeLine);

        // 3. Top Laser Ring Target
        const ringGeo = new THREE.RingGeometry(0.15, 0.28, 20);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: probeColor,
          side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(worldX, 0.08, worldZ);
        probesGroup.add(ringMesh);

        // 4. Bottom Cavity Point Sphere Marker
        const sphGeo = new THREE.SphereGeometry(0.1, 14, 14);
        const sphMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sphMesh = new THREE.Mesh(sphGeo, sphMat);
        sphMesh.position.set(worldX, -depthDisplacement, worldZ);
        probesGroup.add(sphMesh);
      });
    }

    // --- Animation Loop ---
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      if (autoRotate) {
        cameraSphericalRef.current.theta += 0.005;
        updateCameraPos();
      }

      // Animate pulsing lights and lasers
      const time = performance.now() * 0.003;
      cyanPoint.intensity = 2.8 + Math.sin(time) * 0.9;

      renderer.render(scene, camera);
    };
    animate();
    reqAnimRef.current = frameId;

    // --- Mouse Orbit Interaction Handlers ---
    const handleMouseDown = (e) => {
      if (e.button === 0) { // left click
        isMouseDownRef.current = true;
        mousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e) => {
      if (!isMouseDownRef.current) return;
      const dx = e.clientX - mousePosRef.current.x;
      const dy = e.clientY - mousePosRef.current.y;
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      cameraSphericalRef.current.theta -= dx * 0.007;
      cameraSphericalRef.current.phi = Math.max(0.12, Math.min(Math.PI / 2.05, cameraSphericalRef.current.phi - dy * 0.007));
      updateCameraPos();
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.012;
      cameraSphericalRef.current.radius = Math.max(6, Math.min(32, cameraSphericalRef.current.radius + zoomDelta));
      updateCameraPos();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqAnimRef.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [imageUrl, depthMapBase64, depthMapUrl, heightfieldGrid, detections, selectedIdx, depthExaggeration, shaderMode, showWireframe, autoRotate, isFullscreen]);

  const resetCamera = () => {
    sounds.playBeep(700, 0.02);
    cameraSphericalRef.current = { radius: 15.5, phi: Math.PI / 3.2, theta: Math.PI / 4.2 };
    if (cameraRef.current) {
      const { radius, phi, theta } = cameraSphericalRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.lookAt(0, -0.4, 0);
    }
  };

  const currentDet = detections[selectedIdx] || detections[0] || {};
  const currentDims = currentDet.dimensions || {};
  const depthVal = currentDims.depth_cm || 4.5;
  const maxDepthVal = currentDims.max_depth_cm || (depthVal * 1.15).toFixed(1);
  const avgDepthVal = currentDims.avg_depth_cm || (depthVal * 0.68).toFixed(1);
  const volLiters = currentDims.volume_liters || 1.8;

  const containerStyle = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#070b14',
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        overflow: 'hidden'
      }
    : {
        position: 'relative',
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-glass)',
        boxShadow: '0 12px 35px rgba(0,0,0,0.45)'
      };

  return (
    <div style={containerStyle}>
      {/* 3D Viewport Header Toolbar */}
      <div style={{
        position: 'absolute',
        top: '14px',
        left: '16px',
        right: '16px',
        zIndex: 30,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.65rem',
        pointerEvents: 'none'
      }}>
        {/* Left: Shader Mode Pills */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          background: 'rgba(7, 10, 18, 0.88)',
          backdropFilter: 'blur(10px)',
          padding: '0.35rem 0.5rem',
          borderRadius: '10px',
          border: '1px solid var(--border-glass)',
          pointerEvents: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          {[
            { id: 'heatmap', label: 'Thermal Depth', icon: Activity },
            { id: 'photometric', label: '3D Photometric', icon: Eye },
            { id: 'lidar', label: 'LiDAR Wireframe', icon: Zap },
            { id: 'contours', label: 'Iso-Contours', icon: Layers }
          ].map((mode) => {
            const Icon = mode.icon;
            const isSel = shaderMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  sounds.playBeep(850, 0.02);
                  setShaderMode(mode.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '7px',
                  background: isSel ? 'rgba(6, 182, 212, 0.28)' : 'transparent',
                  border: isSel ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  color: isSel ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={14} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Camera, Controls & Fullscreen Maximize */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(7, 10, 18, 0.88)',
          backdropFilter: 'blur(10px)',
          padding: '0.35rem 0.65rem',
          borderRadius: '10px',
          border: '1px solid var(--border-glass)',
          pointerEvents: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          {/* Depth Exaggeration Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.65rem', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>3D Z-SCALE</span>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.3"
              value={depthExaggeration}
              onChange={(e) => setDepthExaggeration(parseFloat(e.target.value))}
              style={{ width: '80px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              title="3D Depth Exaggeration Factor"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{depthExaggeration}x</span>
          </div>

          {/* Auto Rotate Button */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              background: autoRotate ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
              border: autoRotate ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
              color: autoRotate ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Toggle Continuous Orbit Rotation"
          >
            Auto Orbit
          </button>

          {/* Wireframe Button */}
          <button
            onClick={() => setShowWireframe(!showWireframe)}
            style={{
              background: showWireframe ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
              border: showWireframe ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
              color: showWireframe ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Toggle Wireframe Mesh Grid"
          >
            Mesh Grid
          </button>

          {/* HUD Overlay Toggle */}
          <button
            onClick={() => setShowHud(!showHud)}
            style={{
              background: showHud ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: showHud ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
              color: showHud ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Toggle Telemetry HUD"
          >
            HUD
          </button>

          {/* Reset Camera View */}
          <button
            onClick={resetCamera}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)',
              padding: '0.35rem 0.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Reset 3D View Angle"
          >
            <RotateCcw size={14} />
          </button>

          {/* Maximize / Fullscreen Button */}
          <button
            onClick={() => {
              sounds.playLockOn();
              setIsFullscreen(!isFullscreen);
            }}
            style={{
              background: isFullscreen ? 'rgba(244,63,94,0.2)' : 'rgba(6,182,212,0.2)',
              border: `1px solid ${isFullscreen ? '#f43f5e' : 'var(--accent-cyan)'}`,
              color: isFullscreen ? '#f43f5e' : 'var(--accent-cyan)',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.74rem',
              fontWeight: 700
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Maximize 3D Viewport"}
          >
            {isFullscreen ? <><Minimize2 size={14} /> Exit Fullscreen</> : <><Maximize2 size={14} /> Expand Big</>}
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : height,
          minHeight: '480px',
          cursor: 'grab'
        }}
      />

      {/* Bottom Floating Telemetry & 3D Depth Inspection HUD */}
      {showHud && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          zIndex: 30,
          display: 'grid',
          gridTemplateColumns: compact && !isFullscreen ? '1fr' : 'minmax(0, 1.4fr) minmax(0, 1.6fr)',
          gap: '1rem',
          pointerEvents: 'none'
        }}>
          {/* Left HUD: Active Distress 3D Depth Card */}
          <div style={{
            background: 'rgba(7, 10, 18, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '0.9rem 1.25rem',
            pointerEvents: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: depthVal >= 5.5 ? '#f43f5e' : 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {currentDet.class_name || 'Road Cavity Anomaly'}
                </span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                padding: '0.2rem 0.55rem',
                borderRadius: '5px',
                background: depthVal >= 5.5 ? 'rgba(244,63,94,0.25)' : 'rgba(6,182,212,0.18)',
                color: depthVal >= 5.5 ? '#f43f5e' : 'var(--accent-cyan)',
                border: `1px solid ${depthVal >= 5.5 ? 'rgba(244,63,94,0.5)' : 'rgba(6,182,212,0.35)'}`
              }}>
                {depthVal >= 5.5 ? 'CRITICAL DEPTH BREACH' : 'MODERATE CAVITY'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>PEAK DEPTH</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: depthVal >= 5.5 ? '#f43f5e' : 'var(--accent-cyan)' }}>
                  {depthVal} <span style={{ fontSize: '0.75rem' }}>cm</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>MEAN DEPTH</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {avgDepthVal} <span style={{ fontSize: '0.75rem' }}>cm</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>VOID VOLUME</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {volLiters} <span style={{ fontSize: '0.75rem' }}>L</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right HUD: Real-Time 2D Cross-Sectional Elevation Slice Curve */}
          <div style={{
            background: 'rgba(7, 10, 18, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '0.8rem 1.1rem',
            pointerEvents: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>2D/3D ELEVATION SLICE PROFILE</span>
              </span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  onClick={() => setActiveSliceAxis('x')}
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '5px',
                    background: activeSliceAxis === 'x' ? 'rgba(6,182,212,0.28)' : 'transparent',
                    border: activeSliceAxis === 'x' ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)',
                    color: activeSliceAxis === 'x' ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                    cursor: 'pointer'
                  }}
                >
                  ↔ Long Axis
                </button>
                <button
                  onClick={() => setActiveSliceAxis('y')}
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '5px',
                    background: activeSliceAxis === 'y' ? 'rgba(6,182,212,0.28)' : 'transparent',
                    border: activeSliceAxis === 'y' ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)',
                    color: activeSliceAxis === 'y' ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                    cursor: 'pointer'
                  }}
                >
                  ↕ Transverse Axis
                </button>
              </div>
            </div>

            {/* SVG Mini Cross-Section Curve */}
            <div style={{ height: '58px', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 320 58" preserveAspectRatio="none">
                {/* Baseline 0cm Surface */}
                <line x1="0" y1="10" x2="320" y2="10" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                {/* Subgrade warning line at 5.5cm */}
                <line x1="0" y1="44" x2="320" y2="44" stroke="#f43f5e" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
                {/* Depression Curve */}
                {(() => {
                  const maxD = Math.min(40, 12 + depthVal * 3.4);
                  return (
                    <>
                      <path
                        d={`M 20 10 Q 160 ${10 + maxD} 300 10 L 300 54 L 20 54 Z`}
                        fill="rgba(6, 182, 212, 0.14)"
                      />
                      <path
                        d={`M 20 10 Q 160 ${10 + maxD} 300 10`}
                        fill="none"
                        stroke={depthVal >= 5.5 ? '#f43f5e' : '#06b6d4'}
                        strokeWidth="2.5"
                      />
                      {/* Lowest Point Indicator */}
                      <circle cx="160" cy={10 + maxD} r="3.5" fill="#ffffff" stroke={depthVal >= 5.5 ? '#f43f5e' : '#06b6d4'} strokeWidth="1.5" />
                    </>
                  );
                })()}
              </svg>
              <div style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                0 cm Surface Baseline
              </div>
              <div style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '0.62rem', color: depthVal >= 5.5 ? '#f43f5e' : 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                ↓ {depthVal} cm Max Cavity Drop
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
