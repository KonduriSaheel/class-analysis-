# ClassSight AI — Running the Project

ClassSight AI runs out-of-the-box as a full-stack web application (React + Vite + Express + SQLite + browser-side WASM MediaPipe Computer Vision) **and** includes this native Python FastAPI + OpenCV + MediaPipe + Scikit-learn + PyTorch LSTM backend for faculty demonstrations requiring server-side Python CV.

## 1. Full-Stack Web App (Primary Runtime)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. All face anonymisation, 5 FPS frame sampling, MediaPipe pose estimation, temporal engagement classification, seating heatmaps, SQLite persistence (`./data/classsight.db`), and PDF/CSV exports work directly in the browser and Express/SQLite server.

## 2. Optional Python FastAPI CV Backend

If you want to run the Python OpenCV + MediaPipe + Scikit-learn + PyTorch LSTM backend locally alongside the frontend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Once running, the ClassSight AI dashboard automatically detects `http://localhost:8000/health` in the **Privacy Settings** and **Video Analysis** views.

## Privacy Architecture Guarantee

1. Raw video frames are sampled locally at 5 FPS.
2. Face detection + Gaussian blur runs **before** pose estimation.
3. Only anonymous 33-point skeleton kinematics and aggregated seating-zone percentages are retained.
4. Original video files uploaded to the Python endpoint are deleted immediately inside a `finally:` block (`0s` retention).
