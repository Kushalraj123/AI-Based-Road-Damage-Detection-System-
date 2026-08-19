// Realistic Sample Road Imagery & Ground-Truth Detections for RoadVision AI

export const SAMPLE_ROADS = [
  {
    id: 'sample-pothole-severe',
    title: 'Severe Pothole Cluster — Express Corridor NH-48',
    category: 'Highways & Expressways',
    location: 'NH-48 Highway, Milepost 14.2, Mumbai-Pune Corridor',
    coordinates: [37.7651, -122.4042],
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80',
    description: 'Multiple deep asphalt cavity fractures causing structural pavement depression and hazard to high-speed transit.',
    distressCount: 3,
    severity: 'High',
    pciScore: 42,
    repairPriority: 'P1 — Immediate Hot-Mix Asphalt Patch (24h)',
    estimatedCost: '₹3,20,000 INR',
    detections: [
      {
        id: 'det-1',
        class_name: 'Pothole (D40)',
        class_id: 3,
        confidence: 0.968,
        severity: 'High',
        box: [240, 320, 490, 510], // [x1, y1, x2, y2]
        dimensions: { width: '48 cm', depth: '7.5 cm', area: '0.24 m²' },
        recommendation: 'Full-depth patch with tack coat binding.'
      },
      {
        id: 'det-2',
        class_name: 'Alligator Crack (D20)',
        class_id: 2,
        confidence: 0.912,
        severity: 'Medium',
        box: [520, 360, 780, 540],
        dimensions: { width: '110 cm', depth: '1.8 cm', area: '0.85 m²' },
        recommendation: 'Polymer-modified bitumen sealant.'
      },
      {
        id: 'det-3',
        class_name: 'Longitudinal Crack (D00)',
        class_id: 0,
        confidence: 0.884,
        severity: 'Low',
        box: [120, 260, 290, 410],
        dimensions: { width: '85 cm', depth: '0.8 cm', area: '0.35 m²' },
        recommendation: 'Crack routing and hot-pour mastic fill.'
      }
    ]
  },
  {
    id: 'sample-alligator-crack',
    title: 'Fatigue Alligator Cracking — Ring Road Arterial',
    category: 'Arterial Corridors',
    location: 'Outer Ring Road, Sector 62',
    coordinates: [37.8095, -122.2588],
    image: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=1200&q=80',
    description: 'Extensive interconnected fatigue cracking in the wheel path resulting from repeated subgrade deflection.',
    distressCount: 4,
    severity: 'High',
    pciScore: 51,
    repairPriority: 'P1 — Mill and Inlay Resurfacing',
    estimatedCost: '₹6,95,000 INR',
    detections: [
      {
        id: 'det-4',
        class_name: 'Alligator Crack (D20)',
        class_id: 2,
        confidence: 0.954,
        severity: 'High',
        box: [280, 240, 680, 520],
        dimensions: { width: '160 cm', depth: '2.4 cm', area: '1.45 m²' },
        recommendation: '2-inch cold milling and hot asphalt wearing course.'
      },
      {
        id: 'det-5',
        class_name: 'Transverse Crack (D10)',
        class_id: 1,
        confidence: 0.897,
        severity: 'Medium',
        box: [640, 180, 890, 310],
        dimensions: { width: '120 cm', depth: '1.2 cm', area: '0.55 m²' },
        recommendation: 'Elastomeric joint crack sealant.'
      }
    ]
  },
  {
    id: 'sample-transverse-thermal',
    title: 'Transverse Freeze-Thaw Joint Faulting — Hill Road Link',
    category: 'Mountain / Ghat Route',
    location: 'Western Ghats Highway Link MP 44',
    coordinates: [37.4922, -122.3150],
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
    description: 'Perpendicular thermal contraction cracks extending across both travel lanes due to temperature gradients.',
    distressCount: 2,
    severity: 'Medium',
    pciScore: 68,
    repairPriority: 'P2 — Scheduled Crack Sealing (14 Days)',
    estimatedCost: '₹1,75,000 INR',
    detections: [
      {
        id: 'det-6',
        class_name: 'Transverse Crack (D10)',
        class_id: 1,
        confidence: 0.941,
        severity: 'Medium',
        box: [180, 300, 790, 420],
        dimensions: { width: '220 cm', depth: '1.5 cm', area: '0.70 m²' },
        recommendation: 'High-pressure air clean and hot-applied rubberized sealant.'
      }
    ]
  },
  {
    id: 'sample-surface-ravelling',
    title: 'Aggregate Ravelling & Rutting — Metro Commercial Hub',
    category: 'Commercial District',
    location: 'Central Avenue Commercial Corridor',
    coordinates: [37.3382, -121.8863],
    image: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80',
    description: 'Loss of surface aggregate binder matrix creating coarse friction loss and longitudinal wheel depressions.',
    distressCount: 2,
    severity: 'Low',
    pciScore: 78,
    repairPriority: 'P3 — Routine Micro-surfacing / Slurry Seal',
    estimatedCost: '₹1,20,000 INR',
    detections: [
      {
        id: 'det-7',
        class_name: 'Surface Ravelling / Rutting',
        class_id: 0,
        confidence: 0.876,
        severity: 'Low',
        box: [220, 380, 560, 580],
        dimensions: { width: '95 cm', depth: '0.9 cm', area: '0.60 m²' },
        recommendation: 'Polymer-modified slurry seal application.'
      }
    ]
  },
  {
    id: 'sample-pristine-highway',
    title: 'Newly Paved Express Lane — National Corridor 44',
    category: 'Highways & Expressways',
    location: 'National Highway 44, MP 412',
    coordinates: [37.4419, -122.1430],
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    description: 'Optimal road condition with clear retroreflective striping and zero detected pavement distresses.',
    distressCount: 0,
    severity: 'Clear',
    pciScore: 98,
    repairPriority: 'Optimal Condition — Next Audit in 180 Days',
    estimatedCost: '₹0 INR',
    detections: []
  }
];

// GIS Map Data Points for Smart-City Digital Twin
export const GIS_DAMAGE_POINTS = [
  {
    id: 'gis-1',
    coordinates: [37.7749, -122.4194],
    street: 'Market St & 7th Ave',
    type: 'Pothole (D40)',
    severity: 'High',
    confidence: '96.8%',
    date: '2026-08-18 14:32',
    inspectorUnit: 'AI-MobileSurvey-Unit 04',
    status: 'Pending Work Order',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-2',
    coordinates: [37.7858, -122.4064],
    street: 'Mission St & 3rd St',
    type: 'Alligator Crack (D20)',
    severity: 'High',
    confidence: '94.2%',
    date: '2026-08-18 16:15',
    inspectorUnit: 'AI-Dashcam Fleet #12',
    status: 'Assigned to Crew 2',
    image: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-3',
    coordinates: [37.7601, -122.4350],
    street: 'Castro St & 18th St',
    type: 'Transverse Crack (D10)',
    severity: 'Medium',
    confidence: '89.5%',
    date: '2026-08-17 11:20',
    inspectorUnit: 'AI-Survey Van #02',
    status: 'Scheduled',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-4',
    coordinates: [37.7983, -122.4074],
    street: 'Columbus Ave & Broadway',
    type: 'Pothole (D40)',
    severity: 'Critical',
    confidence: '98.1%',
    date: '2026-08-19 08:45',
    inspectorUnit: 'Citizen AI-Report #88',
    status: 'Urgent Dispatch',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-5',
    coordinates: [37.7533, -122.4180],
    street: 'Valencia St & 22nd St',
    type: 'Surface Ravelling',
    severity: 'Low',
    confidence: '86.4%',
    date: '2026-08-16 15:40',
    inspectorUnit: 'AI-MobileSurvey-Unit 01',
    status: 'Monitored',
    image: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-6',
    coordinates: [37.8024, -122.4411],
    street: 'Marina Blvd & Scott St',
    type: 'Pothole (D40)',
    severity: 'High',
    confidence: '95.3%',
    date: '2026-08-19 09:12',
    inspectorUnit: 'AI-Survey Drone Alpha',
    status: 'Pending Review',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-7',
    coordinates: [37.7699, -122.4469],
    street: 'Haight St & Ashbury St',
    type: 'Repaired Patch',
    severity: 'Clear',
    confidence: '99.0%',
    date: '2026-08-15 13:00',
    inspectorUnit: 'Audit Verification Bot',
    status: 'Closed & Verified',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80'
  }
];

// Waypoints for the Autonomous Road Survey Simulator
export const SIMULATED_SURVEY_ROUTE = [
  { lat: 37.7983, lng: -122.4074, street: 'Columbus Ave / Broadway', event: 'Critical Pothole detected (Depth: 8.2cm)' },
  { lat: 37.7930, lng: -122.4030, street: 'Montgomery St', event: 'Road surface scanning... clear' },
  { lat: 37.7858, lng: -122.4064, street: 'Mission St & 3rd St', event: 'Alligator Fatigue crack detected (Area: 1.2m²)' },
  { lat: 37.7790, lng: -122.4120, street: 'Market St & 5th St', event: 'Longitudinal joint crack detected' },
  { lat: 37.7749, lng: -122.4194, street: 'Market St & 7th St', event: 'Severe Pothole Cluster detected' },
  { lat: 37.7680, lng: -122.4270, street: 'Mission St & 14th St', event: 'Laser scan completed for Corridor C-12' }
];
