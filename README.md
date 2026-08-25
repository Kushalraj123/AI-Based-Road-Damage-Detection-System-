# 🛣️ AI-Based Road Damage Detection System (RoadVision AI)

An end-to-end, enterprise-grade AI infrastructure inspection platform that detects, classifies, and quantifies road defects from images, dashcam videos, and real-time camera feeds. Powered by state-of-the-art YOLO object detection neural networks, an **IRC:82 & ASTM D6433 certified material estimation engine**, and a high-performance **FastAPI + React 19 / Vite** architecture.

---

## 🌟 Key Features

### 🔍 1. Neural Detection Studio
- **🖼️ High-Precision Image Detection** — Upload road imagery with instant distress localization, bounding boxes, and confidence metrics.
- **🎥 Dashcam Video Analysis** — Asynchronous background video processing pipeline with real-time frame progress, ETA estimation, and web-optimized H.264 MP4 streaming.
- **📷 Real-Time Webcam / Mobile Feed** — Live frame-by-frame inference directly in the browser via base64 websocket/HTTP streaming.
- **🎛️ Interactive Comparison Modes** — Split-screen before/after slider, processed view, raw view, and density heatmaps.
- **📍 Automated GPS & Reverse Geocoding** — Geotags inspection sites automatically via browser geolocation and OpenStreetMap Nominatim.

### 📋 2. IRC:82 Certified Material & Cost Engine
- **Bituminous Hot-Mix Asphalt (VG-30)** — Calculated from cavity and depression volume ($L \times W \times D$).
- **Cationic Tack Coat (RS-1 / CSS-1h)** — Calibrated bonding emulsion quantities.
- **Graded Base Gravel (WMM)** — Wet-mix macadam structural base gravel estimation.
- **Polymer Crack Sealant (ASTM D6690 Type II)** — Hot-pour joint sealant per linear meter of crack routing.
- **Polymer Modified Slurry Seal (IRC:SP:81)** — Calibrated micro-surfacing for surface distortion and ravelling.
- **Remediation Budget Estimation** — Realistic municipal contractor pricing per defect and total corridor budget.

### 📊 3. Flexible Multi-Scope Reports Generator
- **Audit Timeframe Segmentation** — Segment reports by **Days**, **Weeks**, **Months**, **Yearly**, or **Overall (All-Time)**.
- **Dynamic Numeric Steppers** — Adjust custom periods (`N Days`, `N Weeks`, `N Months`, `N Years`) or choose overall record limits (`50`, `100`, `150+` records).
- **Executive Inspection Manifests** — PCI (Pavement Condition Index) score (0–100), severity ratings, and itemized distress catalogs.
- **Export Capabilities** — One-click **Print to PDF** formatted for municipal road audits and structured **CSV Data Export**.

### 🗺️ 4. GIS Road Map & Analytics Dashboard
- **Interactive Leaflet.js Corridor Map** — Filter and inspect geotagged damage markers color-coded by severity level.
- **Executive KPI Cards** — Total media analyzed, verified defect counts, severity ratios (High/Medium/Low), and state PCI metrics.
- **Deep Dive Visual Analytics** — Distress frequency distributions and severity breakdowns.

---

## 🧠 AI Neural Models

| Model ID | Model Name | Architecture | Specialization |
|---|---|---|---|
| `damage-ensemble` *(Default)* | **RoadVision AI Ensemble Fusion** | YOLOv8 + YOLOv12s Fusion | Potholes, extensive alligator fatigue, longitudinal & transverse cracks, base erosion. |
| `damage-yolo12s` | **Road Damage RDD2022** | YOLOv12s (RDD2022) | Structural fatigue, wide alligator cracking, longitudinal & transverse cracks. |
| `damage-yolov8` | **Road Damage Pro** | YOLOv8 | High-sensitivity detector for cracks, potholes, and surface distortion. |
| `pothole-yolov8` | **Pothole Specialist** | YOLOv8 | Fast inference optimized for potholes and road voids. |

### Supported Distress Classes
- **Potholes & Road Voids** (IRC:82 Cavity Patching)
- **Alligator & Fatigue Cracks** (MoRTH 500 Fatigue Inlay & Milling)
- **Longitudinal Cracks** (ASTM D6690 Crack Routing & Polymer Seal)
- **Transverse Cracks** (ASTM D6690 Polymer Seal)
- **Surface Distortion & Ravelling** (IRC:SP:81 Micro-Surfacing & Slurry Seal)
- **Repair Patches**

> **Note:** Neural model weights (`best.pt`, `yolo12s_RDD2022_best.pt`) are automatically downloaded from Hugging Face Hub on first run.

---

## 🏗️ Project Architecture

```
Road11/
├── backend/
│   ├── main.py              # FastAPI application, YOLO inference, video queue & history
│   ├── requirements.txt     # Python dependencies
│   ├── history.json         # Scan telemetry & historical inspection store
│   ├── uploads/             # Original media storage
│   └── processed/           # Processed annotated media & H.264 videos
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx                          # Root application router & state sync
│       ├── theme.js                         # Dark / Light theme manager
│       ├── components/
│       │   ├── Navbar.jsx                   # Sticky glassmorphic navigation
│       │   ├── HeroSection.jsx              # 3D interactive hero scene
│       │   ├── TechPipeline.jsx             # AI pipeline visualization
│       │   ├── FeatureGrid.jsx              # Interactive 3D tilt feature showcase
│       │   ├── DetectionStudio.jsx          # Neural detection studio (Image / Video / Webcam)
│       │   ├── DashboardView.jsx            # High-level metrics & stats
│       │   ├── RoadMapView.jsx              # Leaflet.js interactive map view
│       │   ├── AnalyticsDeepDive.jsx        # Analytics charts & trend deep dives
│       │   ├── ReportsGenerator.jsx         # Multi-scope IRC:82 reports & PDF/CSV exporter
│       │   ├── AboutArchitecture.jsx        # System architecture documentation
│       │   ├── Footer.jsx                   # Footer component
│       │   ├── SampleRoadsData.js           # Preset sample corridors
│       │   └── SoundEffects.js              # Synthesized audio feedback engine
│       ├── App.css
│       ├── index.css
│       ├── animations.css
│       └── components.css
│
└── README.md
```

---

## ⚙️ Tech Stack

### Backend
- **FastAPI** — High-performance asynchronous REST API framework
- **Ultralytics YOLO** (YOLOv8 & YOLOv12s) — Deep learning object detection
- **OpenCV & PyTorch** — Image manipulation, video transcoding, and GPU/CPU inference
- **Hugging Face Hub** — Automated model downloading and caching
- **Uvicorn** — ASGI production server

### Frontend
- **React 19 & Vite 8** — Reactive UI and lightning-fast build tooling
- **Leaflet.js & React-Leaflet** — Interactive GIS corridor mapping
- **Lucide React** — Modern UI icons
- **Web Audio API** — Synthesized procedural audio feedback

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- *(Optional)* CUDA-compatible GPU for accelerated inference

---

### 1. Clone the Repository
```bash
git clone https://github.com/Kushalraj123/AI-Based-Road-Damage-Detection-System-.git
cd AI-Based-Road-Damage-Detection-System-
```

---

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux / macOS:
# source venv/bin/activate

pip install -r requirements.txt
python main.py
```
> The API server runs at **http://127.0.0.1:8000** (Swagger docs available at `http://127.0.0.1:8000/docs`).

---

### 3. Frontend Setup
```bash
# In a new terminal:
cd frontend
npm install
npm run dev
```
> The web application will launch at **http://localhost:5173**.

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Health check, GPU status, and model availability |
| `GET` | `/api/models` | List of available neural models and class labels |
| `POST` | `/api/detect` | Run inference on uploaded image |
| `POST` | `/api/detect-video` | Enqueue video for frame-by-frame background tracking |
| `GET` | `/api/video-status/{task_id}` | Poll progress and retrieve processed video URL |
| `POST` | `/api/detect-frame` | Real-time inference on webcam frame (base64) |
| `GET` | `/api/history` | Retrieve timestamped detection records |
| `POST` | `/api/history/clear` | Clear local detection history |
| `GET` | `/api/stats` | Aggregated state PCI metrics, severity, and distress counts |

---

## 📄 License & Credits

- **Author**: [Kushalraj](https://github.com/Kushalraj123)
- **License**: MIT License. Open for educational and municipal infrastructure applications.
