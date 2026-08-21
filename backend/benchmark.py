import sys, os, time, cv2, torch
import numpy as np

sys.path.insert(0, os.path.abspath("backend"))
from main import model_manager

img = cv2.imread("../test_pothole.jpg")
m = model_manager.get_model("damage-yolo12s")

# Warmup
m.predict(np.zeros((640, 640, 3), dtype=np.uint8), verbose=False)

# Test 1: Native predict
t0 = time.time()
r1 = m.predict(img, conf=0.15, verbose=False)
t1 = time.time() - t0
print(f"Native inference: {t1*1000:.1f}ms, found {len(r1[0].boxes)} boxes")

# Test 2: imgsz=640
t0 = time.time()
r2 = m.predict(img, imgsz=640, conf=0.15, verbose=False)
t2 = time.time() - t0
print(f"imgsz=640 inference: {t2*1000:.1f}ms, found {len(r2[0].boxes)} boxes")

# Test 3: imgsz=480 (ideal for fast webcam/video)
t0 = time.time()
r3 = m.predict(img, imgsz=480, conf=0.15, verbose=False)
t3 = time.time() - t0
print(f"imgsz=480 inference: {t3*1000:.1f}ms, found {len(r3[0].boxes)} boxes")
