import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeRoadHero({ onDamageClick }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4.5, 12);
    camera.lookAt(0, 0, -25);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    
    const ambientLight = new THREE.AmbientLight(
      isDark ? 0x0f172a : 0xe2e8f0,
      isDark ? 1.5 : 2.5
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, isDark ? 2.5 : 3.5);
    dirLight.position.set(5, 12, 10);
    scene.add(dirLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, isDark ? 3.0 : 1.5, 50);
    cyanPointLight.position.set(-2, 2, -10);
    scene.add(cyanPointLight);

    const purplePointLight = new THREE.PointLight(0x8b5cf6, isDark ? 2.5 : 1.0, 50);
    purplePointLight.position.set(3, 2, -20);
    scene.add(purplePointLight);

    // --- Fog for Infinite Road Depth ---
    scene.fog = new THREE.FogExp2(isDark ? 0x070a12 : 0xf4f7fb, 0.022);

    // --- Road Surface Mesh ---
    const roadWidth = 14;
    const roadLength = 120;
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength, 32, 128);
    
    // Canvas procedural asphalt texture
    const asphaltCanvas = document.createElement('canvas');
    asphaltCanvas.width = 512;
    asphaltCanvas.height = 512;
    const ctx = asphaltCanvas.getContext('2d');
    ctx.fillStyle = isDark ? '#0c1220' : '#d8e2ec';
    ctx.fillRect(0, 0, 512, 512);
    // Add fine asphalt noise
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(Math.random() * (isDark ? 50 : 80)) + (isDark ? 10 : 160);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, y, 2, 2);
    }
    const roadTexture = new THREE.CanvasTexture(asphaltCanvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(2, 16);

    const roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.85,
      metalness: 0.15,
    });

    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -35);
    scene.add(roadMesh);

    // --- Ground Grid / Shoulder Grid ---
    const gridHelper = new THREE.GridHelper(160, 40, 0x06b6d4, isDark ? 0x1e293b : 0xcbd5e1);
    gridHelper.position.set(0, -0.05, -35);
    scene.add(gridHelper);

    // --- Lane Markings (Dashed Center Lines & Solid Side Lines) ---
    const laneGroup = new THREE.Group();
    const dashCount = 24;
    const dashLength = 2.5;
    const dashGap = 3.5;
    const dashes = [];

    const dashMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const shoulderMat = new THREE.MeshBasicMaterial({ color: isDark ? 0x06b6d4 : 0x0284c7 });

    // Center dashes
    for (let i = 0; i < dashCount; i++) {
      const dashGeo = new THREE.PlaneGeometry(0.35, dashLength);
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, -i * (dashLength + dashGap));
      laneGroup.add(dash);
      dashes.push(dash);
    }

    // Left & Right shoulder lines
    const leftShoulderGeo = new THREE.PlaneGeometry(0.3, roadLength);
    const leftShoulder = new THREE.Mesh(leftShoulderGeo, shoulderMat);
    leftShoulder.rotation.x = -Math.PI / 2;
    leftShoulder.position.set(-roadWidth / 2 + 0.6, 0.02, -35);
    laneGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(leftShoulderGeo, shoulderMat);
    rightShoulder.rotation.x = -Math.PI / 2;
    rightShoulder.position.set(roadWidth / 2 - 0.6, 0.02, -35);
    laneGroup.add(rightShoulder);

    scene.add(laneGroup);

    // --- Futuristic Side Pylons / Light Markers ---
    const pylonGroup = new THREE.Group();
    const pylonCount = 14;
    for (let i = 0; i < pylonCount; i++) {
      const pylonGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8);
      const pylonMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x1e293b : 0x94a3b8,
        metalness: 0.8,
        roughness: 0.2
      });

      // Left pylon
      const leftPylon = new THREE.Mesh(pylonGeo, pylonMat);
      leftPylon.position.set(-roadWidth / 2 - 1.2, 1.75, -i * 8);
      
      // Glowing crown
      const crownGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const crownMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const leftCrown = new THREE.Mesh(crownGeo, crownMat);
      leftCrown.position.set(0, 1.75, 0);
      leftPylon.add(leftCrown);
      pylonGroup.add(leftPylon);

      // Right pylon
      const rightPylon = leftPylon.clone();
      rightPylon.position.set(roadWidth / 2 + 1.2, 1.75, -i * 8);
      pylonGroup.add(rightPylon);
    }
    scene.add(pylonGroup);

    // --- Laser Scanning Plane ---
    const laserGeo = new THREE.PlaneGeometry(roadWidth + 4, 1.2);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const laserBeam = new THREE.Mesh(laserGeo, laserMat);
    laserBeam.rotation.x = -Math.PI / 2;
    laserBeam.position.set(0, 0.08, -10);
    scene.add(laserBeam);

    // Laser Light bar
    const laserLineGeo = new THREE.BoxGeometry(roadWidth + 4, 0.08, 0.08);
    const laserLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const laserLine = new THREE.Mesh(laserLineGeo, laserLineMat);
    laserLine.position.set(0, 0.12, -10);
    scene.add(laserLine);

    // --- 3D Road Damage Spots with Holographic HUD Bounding Boxes ---
    const damageGroup = new THREE.Group();

    // Damage Spot 1: Severe Pothole
    const potholeGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.2, 16);
    const potholeMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x030712 : 0x475569,
      roughness: 0.95
    });
    const potholeMesh = new THREE.Mesh(potholeGeo, potholeMat);
    potholeMesh.position.set(-2.2, 0.01, -12);
    damageGroup.add(potholeMesh);

    // Holographic Bounding Box Wireframe
    const bboxGeo1 = new THREE.BoxGeometry(3.0, 1.8, 3.0);
    const bboxEdges1 = new THREE.EdgesGeometry(bboxGeo1);
    const bboxLine1 = new THREE.LineSegments(
      bboxEdges1,
      new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 })
    );
    bboxLine1.position.set(-2.2, 0.9, -12);
    damageGroup.add(bboxLine1);

    // Damage Spot 2: Alligator Crack
    const crackGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });
    const crackMesh = new THREE.Mesh(crackGeo, crackMat);
    crackMesh.rotation.x = -Math.PI / 2;
    crackMesh.position.set(2.8, 0.03, -24);
    damageGroup.add(crackMesh);

    const bboxGeo2 = new THREE.BoxGeometry(4.0, 1.6, 4.0);
    const bboxEdges2 = new THREE.EdgesGeometry(bboxGeo2);
    const bboxLine2 = new THREE.LineSegments(
      bboxEdges2,
      new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 })
    );
    bboxLine2.position.set(2.8, 0.8, -24);
    damageGroup.add(bboxLine2);

    // Damage Spot 3: Longitudinal Crack
    const bboxGeo3 = new THREE.BoxGeometry(2.2, 1.2, 5.0);
    const bboxEdges3 = new THREE.EdgesGeometry(bboxGeo3);
    const bboxLine3 = new THREE.LineSegments(
      bboxEdges3,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    );
    bboxLine3.position.set(-1.0, 0.6, -38);
    damageGroup.add(bboxLine3);

    scene.add(damageGroup);

    // --- Floating Cyber Particles ---
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 30;
      particlePos[i + 1] = Math.random() * 8;
      particlePos[i + 2] = -Math.random() * 80;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.7
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- Mouse Parallax ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / height) * 2 - 1);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // --- Theme Listener ---
    const handleThemeSwitch = (e) => {
      const dark = e.detail.theme !== 'light';
      ambientLight.color.setHex(dark ? 0x0f172a : 0xe2e8f0);
      ambientLight.intensity = dark ? 1.5 : 2.5;
      scene.fog.color.setHex(dark ? 0x070a12 : 0xf4f7fb);
      potholeMat.color.setHex(dark ? 0x030712 : 0x475569);
    };
    window.addEventListener('themeChanged', handleThemeSwitch);

    // --- Animation Loop ---
    let animId;
    let clock = new THREE.Clock();
    let speed = 12.0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Move Lane Dashes
      const totalDashSpan = dashCount * (dashLength + dashGap);
      dashes.forEach((dash) => {
        dash.position.z += speed * delta;
        if (dash.position.z > 5) {
          dash.position.z -= totalDashSpan;
        }
      });

      // Move Laser Beam back and forth
      const laserZ = -5 - Math.sin(time * 1.5) * 28;
      laserBeam.position.z = laserZ;
      laserLine.position.z = laserZ;

      // Pulse bounding boxes
      const pulse = 1 + Math.sin(time * 4) * 0.06;
      bboxLine1.scale.set(pulse, pulse, pulse);
      bboxLine2.scale.set(pulse, pulse, pulse);
      bboxLine3.scale.set(pulse, pulse, pulse);

      // Float particles
      const positions = particleGeo.attributes.position.array;
      for (let i = 2; i < particleCount * 3; i += 3) {
        positions[i] += speed * 0.4 * delta;
        if (positions[i] > 10) {
          positions[i] = -80;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Camera Parallax
      targetX = mouseX * 1.8;
      targetY = 4.5 + mouseY * 0.8;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, -25);

      renderer.render(scene, camera);
    };

    animate();

    // --- Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('themeChanged', handleThemeSwitch);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}
