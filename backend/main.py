"""
ClassSight AI - Python FastAPI Server
Optional local CV inference backend using FastAPI, OpenCV, MediaPipe,
NumPy, Pandas, Scikit-learn, and PyTorch LSTM.
"""

from __future__ import annotations
import os
import sqlite3
import tempfile
from typing import Literal
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sklearn.metrics import accuracy_score, cohen_kappa_score, confusion_matrix, precision_recall_fscore_support

from cv_pipeline import PrivacyFirstCVPipeline

app = FastAPI(title="ClassSight AI Python CV Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

pipeline = PrivacyFirstCVPipeline()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "FastAPI + OpenCV + MediaPipe + Scikit-learn",
        "anonymisationBeforePose": True,
        "rawVideoRetentionSec": 0,
    }


@app.post("/api/py/analyze-video")
async def analyze_video(
    file: UploadFile = File(...),
    blur_mode: Literal["gaussian", "pixelate", "solid"] = Form("gaussian"),
    model_type: Literal["baseline", "lstm"] = Form("baseline"),
    target_fps: float = Form(5.0),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Video filename is required.")

    suffix = os.path.splitext(file.filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = await file.read()
        tmp.write(content)

    try:
        result = pipeline.process_video_file(
            tmp_path,
            target_fps=max(1.0, min(15.0, target_fps)),
            blur_mode=blur_mode,
            model_type=model_type,
        )
        return result
    finally:
        # Enforce 0s raw video retention on disk
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/py/evaluate-csv")
async def evaluate_predictions(file: UploadFile = File(...)):
    """Evaluate a CSV containing 'annotated_label' and 'predicted_label' columns using Scikit-learn."""
    df = pd.read_csv(file.file)
    if "annotated_label" not in df.columns or "predicted_label" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV must include 'annotated_label' and 'predicted_label' columns.")

    labels = ["Attentive", "Distracted", "Participating"]
    y_true = df["annotated_label"].tolist()
    y_pred = df["predicted_label"].tolist()

    acc = float(accuracy_score(y_true, y_pred))
    kappa = float(cohen_kappa_score(y_true, y_pred, labels=labels))
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=labels, average="macro", zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=labels).tolist()

    return {
        "totalSamples": len(df),
        "accuracy": round(acc, 4),
        "macroPrecision": round(float(prec), 3),
        "macroRecall": round(float(rec), 3),
        "macroF1": round(float(f1), 3),
        "cohensKappa": round(kappa, 3),
        "confusionMatrix": cm,
        "labels": labels,
    }
