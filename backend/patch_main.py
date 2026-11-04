"""
patch_main.py

Integrates the fine-tuned RDD India YOLOv8s model into backend/main.py and
removes the fake / mock behavior.

Usage (run inside your backend folder):
    python patch_main.py            # patches ./main.py
    python patch_main.py path/to/main.py

Safety:
  - Every edit is checked first. If ANY anchor is not found exactly once,
    NOTHING is written and the failing edits are listed.
  - Your original is saved as main.py.bak before anything is written.
  - The patched file is syntax-checked before it is written.
"""
import pathlib
import re
import shutil
import sys

path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "main.py")
if not path.exists():
    sys.exit(f"File not found: {path}")

text = path.read_text(encoding="utf-8")
failures = []
applied = []


def rep(old, new, count=1, label=None):
    """Replace an exact string. It must occur exactly `count` times."""
    global text
    n = text.count(old)
    name = label or old.strip()[:70]
    if n != count:
        failures.append(f"{name!r}: expected {count} match(es), found {n}")
        return
    text = text.replace(old, new)
    applied.append(name)


def line_rep(prefix, new_lines, label=None):
    """Replace one whole line that starts with `prefix` (ignoring indentation)."""
    global text
    name = label or prefix[:70]
    pat = re.compile(r"^([ \t]*)" + re.escape(prefix) + r".*$", re.M)
    found = pat.findall(text)
    if len(found) != 1:
        failures.append(f"{name!r}: expected 1 line, found {len(found)}")
        return
    text = pat.sub(lambda m: m.group(1) + ("\n" + m.group(1)).join(new_lines), text)
    applied.append(name)


def re_sub(pattern, new, label, flags=0):
    """Regex replace. It must match exactly once."""
    global text
    new_text, n = re.subn(pattern, lambda m: new, text, flags=flags)
    if n != 1:
        failures.append(f"{label}: expected 1 match, found {n}")
        return
    text = new_text
    applied.append(label)


# --------------------------------------------------------------------------
# 1. Register our fine-tuned model, plus a helper that resolves model ids
# --------------------------------------------------------------------------
rep(
    "MODEL_CLASSES = {",
    '''FINETUNED_ID = "rdd-india-finetuned"
FINETUNED_WEIGHTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "rdd_india_v8s_best.pt")


def resolve_model_id(model_id: str) -> str:
    """Legacy ids ("damage-ensemble") and unknown ids resolve to our fine-tuned model."""
    if not model_id or model_id == "damage-ensemble" or model_id not in MODEL_CLASSES:
        return FINETUNED_ID
    return model_id


MODEL_CLASSES = {
    FINETUNED_ID: {
        "local_path": FINETUNED_WEIGHTS,
        "labels": {
            0: "Longitudinal Crack",
            1: "Transverse Crack",
            2: "Alligator Crack",
            3: "Pothole"
        },
        "colors": {
            0: (22, 115, 249),
            1: (22, 115, 249),
            2: (22, 115, 249),
            3: (68, 68, 239)
        }
    },''',
    label="register fine-tuned model",
)

# --------------------------------------------------------------------------
# 2. ModelManager: load local weights, default to the fine-tuned model
# --------------------------------------------------------------------------
rep('            model_id = "damage-yolov8"', "            model_id = FINETUNED_ID", label="get_model default")
rep(
    'repo_path = MODEL_CLASSES[model_id]["repo"]',
    'cfg = MODEL_CLASSES[model_id]\n            repo_path = cfg.get("repo")',
    label="get_model cfg",
)
rep('filename = MODEL_CLASSES[model_id]["filename"]', 'filename = cfg.get("filename")', label="get_model filename")
rep(
    'print(f"Loading model {model_id} from {repo_path} ({filename})...")',
    'print(f"Loading model {model_id} from {repo_path or cfg.get(\'local_path\')} ({filename or \'local weights\'})...")',
    label="get_model log line",
)
rep(
    "# Prefer local cached weights without network overhead, fallback to hub download",
    '''if cfg.get("local_path"):
                        if not os.path.exists(cfg["local_path"]):
                            raise FileNotFoundError(f"Fine-tuned weights not found at {cfg['local_path']}")
                        model = YOLO(cfg["local_path"])
                        self.loaded_models[model_id] = model
                        print(f"Model {model_id} loaded from local weights.")
                        return model
                    # Prefer local cached weights without network overhead, fallback to hub download''',
    label="get_model local weights branch",
)
rep("Creating mock fallback.", "Model unavailable.", label="mock wording 1")
rep("Using mock detector.", "Detection is disabled.", label="mock wording 2")

# --------------------------------------------------------------------------
# 3. Startup warmup: only our model, at 640
# --------------------------------------------------------------------------
rep('for mid in ["damage-yolov8", "pothole-yolov8"]:', "for mid in [FINETUNED_ID]:", label="warmup models")
rep(
    'm.predict(dummy, imgsz=480, verbose=False, device="cpu")',
    'm.predict(dummy, imgsz=640, verbose=False, device="cpu")',
    label="warmup imgsz",
)

# --------------------------------------------------------------------------
# 4. Delete the fake detection generator completely
# --------------------------------------------------------------------------
re_sub(
    r"# Simulated detection for fallback.*?\n    return results\n",
    "",
    "delete run_mock_detection",
    flags=re.S,
)

# --------------------------------------------------------------------------
# 5. process_detection: 640px, single model, no hidden threshold changes,
#    no mock fallback, clear error if the model failed to load
# --------------------------------------------------------------------------
rep(
    "    max_dim = 480",
    "    max_dim = 640  # matches the 640px training resolution of the fine-tuned model",
    label="process_detection max_dim",
)
line_rep(
    "# Optimize input resolution to native 480px",
    ["# Inference resolution is 640px, the same size the model was fine-tuned at"],
)
rep("effective_conf = max(0.14, float(conf_threshold))", "effective_conf = max(0.05, float(conf_threshold))")
rep("infer_conf = max(0.10, min(0.18, float(conf_threshold) - 0.05))", "infer_conf = effective_conf")
line_rep(
    "# Query models with calibrated threshold",
    ["# Use the confidence threshold chosen by the user directly (no hidden lowering)"],
)
line_rep(
    "# Dual-YOLOv8 ensemble:",
    ['# "damage-ensemble" (legacy id) and unknown ids use our fine-tuned model. No ensemble.'],
)
rep(
    'models_to_run = [("damage-yolov8", 480), ("pothole-yolov8", 480)]',
    "models_to_run = [(FINETUNED_ID, 640)]",
    label="ensemble branch",
)
rep("models_to_run = [(model_id, 480)]", "models_to_run = [(model_id, 640)]", label="single model branch")
rep(
    "    t0 = time.perf_counter()",
    '''    t0 = time.perf_counter()
    if all(model_manager.get_model(mid) is None for mid, _ in models_to_run):
        raise RuntimeError("Detection model failed to load. Check the weights file and the server log.")''',
    label="fail loudly if model missing",
)
re_sub(
    r"\n    # Robust fallback:[^\n]*\n    if len\(raw_detections\) == 0:\n        raw_detections = run_mock_detection\([^\n]*\)\n",
    "\n    # No fallback: if nothing is detected the road is reported as Clear (no invented detections)\n",
    "remove mock fallback call",
)

# --------------------------------------------------------------------------
# 6. Do not draw heuristic depth on the image labels (2 places)
# --------------------------------------------------------------------------
rep(
    'depth_val = det.get("dimensions", {}).get("depth_cm", None)',
    "depth_val = None  # depth is a heuristic estimate, so it is not drawn on the image",
    count=2,
    label="hide heuristic depth on boxes",
)

# --------------------------------------------------------------------------
# 7. Video: use the selected / fine-tuned model at 640
# --------------------------------------------------------------------------
rep(
    'models_for_video = [("damage-yolov8", 416)]',
    "models_for_video = [(resolve_model_id(model_id), 640)]",
    label="video model",
)
rep("target_max_dim = 480", "target_max_dim = 640", label="video resolution")
line_rep(
    "# High-speed lightweight 416px YOLOv8 inference",
    ["# Video uses the model chosen by the user (default: our fine-tuned model) at 640px"],
)

# --------------------------------------------------------------------------
# 8. API defaults
# --------------------------------------------------------------------------
rep('model_id: str = Form("damage-ensemble")', "model_id: str = Form(FINETUNED_ID)", count=2, label="route defaults")
rep("conf_threshold: float = Form(0.10)", "conf_threshold: float = Form(0.25)", label="image conf default")
rep('model_id: str = "damage-ensemble"', "model_id: str = FINETUNED_ID", label="FramePayload default")

# --------------------------------------------------------------------------
# 9. Webcam / live frame endpoint
# --------------------------------------------------------------------------
line_rep(
    'actual_model_id = "damage-yolov8" if',
    ["actual_model_id = resolve_model_id(payload.model_id)"],
    label="detect-frame model id",
)
rep(
    "live_conf = max(0.10, min(payload.conf_threshold, 0.20))",
    'live_conf = max(0.10, float(payload.conf_threshold))\n        if model is None:\n            raise RuntimeError("Detection model failed to load.")',
    label="detect-frame conf + load check",
)

# --------------------------------------------------------------------------
# 10. /api/models: honest list (ours first, third-party clearly labeled)
# --------------------------------------------------------------------------
re_sub(
    r'@app\.get\("/api/models"\)\ndef get_models\(\):.*?(?=\ndef extract_exif_metadata)',
    '''@app.get("/api/models")
def get_models():
    return {
        "models": [
            {
                "id": FINETUNED_ID,
                "name": "RoadVision RDD-India (YOLOv8s, fine-tuned by us)",
                "description": "YOLOv8s fine-tuned by our team on RDD2022 India. 4 classes. Our own model.",
                "classes": list(MODEL_CLASSES[FINETUNED_ID]["labels"].values())
            },
            {
                "id": "damage-yolo12s",
                "name": "Third-party pretrained: Road Damage RDD2022 (YOLOv12s)",
                "description": "Pretrained model from Hugging Face (rezzzq). Not trained by us. For comparison only.",
                "classes": list(MODEL_CLASSES["damage-yolo12s"]["labels"].values())
            },
            {
                "id": "damage-yolov8",
                "name": "Third-party pretrained: Road Damage (YOLOv8)",
                "description": "Pretrained model from Hugging Face (ozair23). Not trained by us. For comparison only.",
                "classes": list(MODEL_CLASSES["damage-yolov8"]["labels"].values())
            },
            {
                "id": "pothole-yolov8",
                "name": "Third-party pretrained: Pothole (YOLOv8)",
                "description": "Pretrained model from Hugging Face (vinothvikas1987). Not trained by us. For comparison only.",
                "classes": list(MODEL_CLASSES["pothole-yolov8"]["labels"].values())
            }
        ]
    }
''',
    "rewrite /api/models",
    flags=re.S,
)

# --------------------------------------------------------------------------
# 11. Remove unsubstantiated standards claims and leftover foreign wording
# --------------------------------------------------------------------------
rep(
    "Civil Engineering Material & Remediation Cost Calculator adhering to ASTM D6433 & IRC:82 / MoRTH Standards.",
    "Rule-of-thumb material and cost estimator. Illustrative heuristics only, not certified to any standard.",
    label="materials docstring 1",
)
rep(
    "Calibrated realistic municipal spot-repair costs and material quantities.",
    "Quantities and prices are rough assumptions, not measured values.",
    label="materials docstring 2",
)
rep(
    "# Depth range by defect category (IRC:82 & ASTM D6433 standard)",
    "# Assumed depth range per defect category (heuristic, not measured)",
    label="depth comment",
)
rep('"Pothole Patching (IRC:82 Spec)"', '"Pothole Patching"', label="category 1")
rep('"Fatigue Milling & Inlay (MoRTH 500)"', '"Fatigue Milling & Inlay"', label="category 2")
rep('"Crack Routing & Hot-Pour Seal (ASTM D6690)"', '"Crack Routing & Hot-Pour Seal"', label="category 3")
rep('"Micro-Surfacing & Slurry Seal (IRC:SP:81)"', '"Micro-Surfacing & Slurry Seal"', label="category 4")
rep("HCMC Dispatch Alert", "Dispatch Alert", label="HCMC print")
rep(
    "Notification successfully submitted to HCMC Municipal system.",
    "Notification recorded (demo, not connected to a real municipal system).",
    label="HCMC message",
)

# --------------------------------------------------------------------------
# Report, verify, write
# --------------------------------------------------------------------------
if failures:
    print("NOTHING WAS WRITTEN. These edits could not be applied:\n")
    for f in failures:
        print("  -", f)
    print("\nPaste this list back so the anchors can be fixed.")
    sys.exit(1)

try:
    compile(text, str(path), "exec")
except SyntaxError as e:
    sys.exit(f"Patched file has a syntax error, NOT written: {e}")

leftovers = [w for w in ("run_mock_detection", "mock fallback", "mock detector") if w in text]
if leftovers:
    print("Warning, these words are still present:", leftovers)

backup = path.with_suffix(".py.bak")
shutil.copyfile(path, backup)
path.write_text(text, encoding="utf-8")
print(f"OK. {len(applied)} edits applied to {path}. Original saved as {backup}.")