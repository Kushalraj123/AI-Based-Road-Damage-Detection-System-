import sys
import os
import time

sys.path.insert(0, os.path.abspath("backend"))
from main import model_manager, process_detection, MODEL_CLASSES

print("Testing pothole-yolov8...")
t0 = time.time()
m1 = model_manager.get_model("pothole-yolov8")
print(f"Model1 loaded in {time.time()-t0:.2f}s")
if m1:
    print(f"Model1 names: {m1.names}")

img_path = os.path.abspath("../test_pothole.jpg")
t0 = time.time()
res1 = process_detection(img_path, "pothole-yolov8", 0.15)
print(f"pothole-yolov8 inference in {time.time()-t0:.3f}s: found {res1['total_damage']} items: {res1['detections']}")

print("\nTesting damage-yolo12s...")
t0 = time.time()
m2 = model_manager.get_model("damage-yolo12s")
print(f"Model2 loaded in {time.time()-t0:.2f}s")
if m2:
    print(f"Model2 names: {m2.names}")

t0 = time.time()
res2 = process_detection(img_path, "damage-yolo12s", 0.15)
print(f"damage-yolo12s inference in {time.time()-t0:.3f}s: found {res2['total_damage']} items: {res2['detections']}")
