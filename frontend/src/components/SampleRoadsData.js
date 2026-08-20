// Realistic Sample Road Imagery & Ground-Truth Detections for RoadVision AI in Karnataka, India
export const SAMPLE_ROADS = [
  {
    id: 'sample-pothole-severe',
    title: 'Severe Pothole Cluster — M.G. Road Bengaluru',
    category: 'Highways & Expressways',
    location: 'M.G. Road Corridor, Bengaluru, Karnataka',
    coordinates: [12.9716, 77.5946],
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80',
    description: 'Multiple deep asphalt cavity fractures causing structural pavement depression and hazard to local transit.',
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
        box: [240, 320, 490, 510],
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
    title: 'Fatigue Alligator Cracking — Gokul Road Hubballi',
    category: 'Arterial Corridors',
    location: 'Gokul Road, Hubballi, Karnataka',
    coordinates: [15.3647, 75.1240],
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
    title: 'Transverse Faulting — Kottara Chowki Mangaluru',
    category: 'Arterial Corridors',
    location: 'Kottara Chowki Flyover Access, Mangaluru, Karnataka',
    coordinates: [12.9141, 74.8560],
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
    description: 'Perpendicular thermal contraction cracks extending across both travel lanes due to coastal weather cycles.',
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
    title: 'Aggregate Ravelling — Congress Road Belagavi',
    category: 'Commercial District',
    location: 'Congress Road, Belagavi, Karnataka',
    coordinates: [15.8497, 74.4977],
    image: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80',
    description: 'Loss of surface aggregate binder matrix creating coarse friction loss and heavy truck lane depressions.',
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
    title: 'Newly Paved Loop — Mysuru Palace Ring Rd',
    category: 'Highways & Expressways',
    location: 'Mysuru Palace Ring Rd, Mysuru, Karnataka',
    coordinates: [12.2958, 76.6394],
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

// GIS Map Data Points across Karnataka state
export const GIS_DAMAGE_POINTS = [
  {
    id: 'gis-1',
    coordinates: [12.9716, 77.5946],
    street: 'M.G. Road Corridor, Bengaluru',
    type: 'Pothole (D40)',
    severity: 'High',
    confidence: '96.8%',
    date: '2026-08-18 14:32',
    inspectorUnit: 'KA-51-Survey-Unit 04',
    status: 'Pending Work Order',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-2',
    coordinates: [12.2958, 76.6394],
    street: 'Mysuru Palace Ring Rd, Mysuru',
    type: 'Alligator Crack (D20)',
    severity: 'High',
    confidence: '94.2%',
    date: '2026-08-18 16:15',
    inspectorUnit: 'KA-09-Fleet #12',
    status: 'Assigned to Crew 2',
    image: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-3',
    coordinates: [12.9141, 74.8560],
    street: 'Kottara Chowki Flyover, Mangaluru',
    type: 'Transverse Crack (D10)',
    severity: 'Medium',
    confidence: '89.5%',
    date: '2026-08-17 11:20',
    inspectorUnit: 'KA-19-Survey Van #02',
    status: 'Scheduled',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-4',
    coordinates: [15.3647, 75.1240],
    street: 'Gokul Road Arterial, Hubballi',
    type: 'Pothole (D40)',
    severity: 'Critical',
    confidence: '98.1%',
    date: '2026-08-19 08:45',
    inspectorUnit: 'KA-25-Citizen Report #88',
    status: 'Urgent Dispatch',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-5',
    coordinates: [15.8497, 74.4977],
    street: 'Congress Road, Belagavi',
    type: 'Surface Ravelling',
    severity: 'Low',
    confidence: '86.4%',
    date: '2026-08-16 15:40',
    inspectorUnit: 'KA-22-Survey-Unit 01',
    status: 'Monitored',
    image: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-6',
    coordinates: [17.3297, 76.8343],
    street: 'Super Market Rd, Kalaburagi',
    type: 'Pothole (D40)',
    severity: 'High',
    confidence: '95.3%',
    date: '2026-08-19 09:12',
    inspectorUnit: 'KA-32-Drone Alpha',
    status: 'Pending Review',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-7',
    coordinates: [13.9299, 75.5681],
    street: 'B.H. Road Link, Shivamogga',
    type: 'Repaired Patch',
    severity: 'Clear',
    confidence: '99.0%',
    date: '2026-08-15 13:00',
    inspectorUnit: 'KA-14-Audit Bot',
    status: 'Closed & Verified',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'gis-8',
    coordinates: [13.0068, 76.1026],
    street: 'B.M. Road, Old Bus Stand, Hassan',
    type: 'Pothole (D40)',
    severity: 'High',
    confidence: '95.8%',
    date: '2026-08-18 10:20',
    inspectorUnit: 'KA-13-Survey-Unit 03',
    status: 'Pending Work Order',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'
  }
];

// Waypoints for the Autonomous Road Survey Simulator across Karnataka state
export const SIMULATED_SURVEY_ROUTE = [
  { lat: 12.9716, lng: 77.5946, street: 'Bengaluru (NH-48)', event: 'Survey Vehicle Alpha launched from Capital' },
  { lat: 12.2958, lng: 76.6394, street: 'Mysuru (NH-275)', event: 'Pristine road status scanned' },
  { lat: 13.0068, lng: 76.1026, street: 'Hassan (NH-75)', event: 'Minor cracks detected' },
  { lat: 12.9141, lng: 74.8560, street: 'Mangaluru Coast (NH-66)', event: 'Transverse faulting detected near port link' },
  { lat: 13.9299, lng: 75.5681, street: 'Shivamogga (NH-69)', event: 'Surface ravelling clusters mapped' },
  { lat: 15.3647, lng: 75.1240, street: 'Hubballi-Dharwad Hub', event: 'State Highway SH-1 scan complete' }
];
