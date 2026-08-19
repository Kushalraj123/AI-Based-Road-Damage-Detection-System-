# 🛣️ AI-Based Road Damage Detection System

An end-to-end AI-powered web application that detects and classifies road damage from images, videos, and live webcam feeds using state-of-the-art YOLO object detection models. Built with a **FastAPI** backend and a **React + Vite** frontend.

---

## 📸 Features

- **🖼️ Image Detection** — Upload road images and get instant damage detection with annotated bounding boxes
- **🎥 Video Detection** — Process full video files frame-by-frame with real-time progress tracking
- **📷 Webcam / Live Feed** — Detect road damage in real-time using your browser webcam
- **🗺️ Road Map View** — Visualize detected damage locations on an interactive Leaflet.js map
- **📊 Dashboard & Analytics** — View damage summaries, severity breakdowns, and historical trends
- **📄 Report Generator** — Generate structured detection reports from scan history
- **🌗 Dark / Light Mode** — Smooth theme toggling with persistent user preference
- **🔊 UI Sound Effects** — Subtle audio feedback for navigation and interactions

---

## 🧠 AI Models

| Model ID | Name | Description |
|---|---|---|
| `pothole-yolov8` | Pothole Detection (YOLOv8) | Detects potholes and surface voids. Best for quick scans. |
| `damage-yolo12s` | Road Damage RDD2022 (YOLOv12s) | Comprehensive detector covering longitudinal cracks, transverse cracks, alligator cracks, rutting, and repairs. |

### Damage Classes

**YOLOv8 (pothole-yolov8)**
- Longitudinal Crack
- Transverse Crack
- Alligator Crack
- Pothole
- Other

**YOLOv12s (damage-yolo12s) — RDD2022 Standard**
- D00 – Longitudinal Crack
- D10 – Transverse Crack
- D20 – Alligator Crack
- D40 – Rutting / Pothole
- Repair

Models are automatically downloaded from **Hugging Face Hub** on first use.

---

## 🏗️ Project Structure

```
Road11/
├── backend/
│   ├── main.py              # FastAPI app — detection logic, routes, video processing
│   ├── requirements.txt     # Python dependencies
│   ├── uploads/             # Uploaded original images/videos
│   └── processed/           # Annotated output images/videos
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx                          # Root component & tab router
│       ├── theme.js                         # Dark/Light theme manager
│       ├── components/
│       │   ├── Navbar.jsx                   # Glassmorphic sticky navbar
│       │   ├── HeroSection.jsx              # 3D animated landing hero
│       │   ├── TechPipeline.jsx             # AI pipeline visualization
│       │   ├── FeatureGrid.jsx              # 3D tilt feature showcase
│       │   ├── DetectionStudio.jsx          # Image / video / webcam detection UI
│       │   ├── DashboardView.jsx            # Stats & damage overview
│       │   ├── RoadMapView.jsx              # Leaflet.js interactive map
│       │   ├── AnalyticsDeepDive.jsx        # Charts and analytics
│       │   ├── ReportsGenerator.jsx         # PDF/report exporter
│       │   ├── AboutArchitecture.jsx        # Tech stack & architecture page
│       │   ├── Footer.jsx                   # Site footer
│       │   ├── SampleRoadsData.js           # Demo map data
│       │   └── SoundEffects.js              # UI audio feedback
│       ├── App.css
│       ├── index.css
│       ├── animations.css
│       └── components.css
│
├── history.json             # Local detection history store
└── test_pothole.jpg         # Sample test image
```

---

## ⚙️ Tech Stack

### Backend
| Tech | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **Ultralytics YOLO** | Object detection models |
| **OpenCV** | Image/video processing & annotation |
| **PyTorch** | Deep learning inference (GPU/CPU) |
| **Hugging Face Hub** | Model weight downloading |
| **Pydantic** | Request/response validation |

### Frontend
| Tech | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Three.js** | 3D animated hero scene |
| **Leaflet.js** | Interactive damage map |
| **Lucide React** | Icon library |
| **canvas-confetti** | Celebration animations |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) CUDA-capable GPU for faster inference

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
pip install -r requirements.txt
python main.py
```

The API server will start at **http://127.0.0.1:8000**

> **Note:** YOLO model weights are downloaded automatically from Hugging Face on first use. Ensure you have an internet connection.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

## 🔌 API Reference

### `GET /api/status`
Health check — returns GPU availability and model status.

### `GET /api/models`
Returns available detection models and their class labels.

### `POST /api/detect`
Detect damage in an uploaded image.

| Field | Type | Description |
|---|---|---|
| `file` | File | Image file (JPG, PNG, etc.) |
| `model_id` | string | `pothole-yolov8` or `damage-yolo12s` |
| `conf_threshold` | float | Confidence threshold (default: `0.15`) |

**Response:** Annotated image (base64), bounding boxes, damage counts, and severity level.

### `POST /api/detect-video`
Queue a video for background processing.

| Field | Type | Description |
|---|---|---|
| `file` | File | Video file (MP4, AVI, etc.) |
| `model_id` | string | Model to use |
| `conf_threshold` | float | Confidence threshold |

**Response:** `task_id` for polling status.

### `GET /api/video-status/{task_id}`
Poll the processing progress of a queued video task.

### `POST /api/detect-frame`
Detect damage in a single base64-encoded webcam frame (used for live detection).

### `GET /api/history`
Returns the last 50 detection records.

### `POST /api/history/clear`
Clears all detection history.

---

## 🎯 Severity Levels

| Severity | Criteria |
|---|---|
| **Clear** | No damage detected |
| **Low** | 1 detection, no potholes |
| **Medium** | 2+ detections OR 1 pothole |
| **High** | 4+ detections OR 2+ with potholes |

---

## 🗂️ Detection History

All scans are automatically saved to `history.json` (up to 50 most recent entries). Each entry includes:
- Timestamp
- Model used
- Original & processed file URLs
- Damage count & severity
- Detected damage classes

---

## 📦 Python Dependencies

```
fastapi
uvicorn
python-multipart
ultralytics
opencv-python-headless
torch
torchvision
pydantic
pandas
huggingface_hub
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open source. Feel free to use, modify, and distribute.

---

## 👨‍💻 Author

**Kushalraj** — [GitHub](https://github.com/Kushalraj123)
