import sys, os, cv2
sys.path.insert(0, os.path.abspath("backend"))
from main import model_manager

img = cv2.imread("../test_pothole.jpg")
print(f"Image shape: {img.shape}")

m1 = model_manager.get_model("pothole-yolov8")
raw_res1 = m1.predict(img, conf=0.01, verbose=False)[0]
print(f"\nRaw pothole-yolov8 detections (conf>=0.01): {len(raw_res1.boxes)}")
for b in raw_res1.boxes:
    print(f"  cls={int(b.cls[0].item())} ({m1.names[int(b.cls[0].item())]}), conf={float(b.conf[0].item()):.4f}, box={b.xyxy[0].cpu().numpy().tolist()}")

m2 = model_manager.get_model("damage-yolo12s")
raw_res2 = m2.predict(img, conf=0.01, verbose=False)[0]
print(f"\nRaw damage-yolo12s detections (conf>=0.01): {len(raw_res2.boxes)}")
for b in raw_res2.boxes:
    print(f"  cls={int(b.cls[0].item())} ({m2.names[int(b.cls[0].item())]}), conf={float(b.conf[0].item()):.4f}, box={b.xyxy[0].cpu().numpy().tolist()}")
