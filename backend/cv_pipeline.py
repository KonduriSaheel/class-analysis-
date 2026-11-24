"""
ClassSight AI - Privacy-First Computer Vision Pipeline (OpenCV + MediaPipe)
CRITICAL PRIVACY INVARIANT:
  Face detection and Gaussian face blurring execute BEFORE pose estimation.
  PoseLandmarker receives ONLY the anonymised frame buffer.
  Raw unblurred frames are immediately discarded from memory and never saved.
"""

from __future__ import annotations
import math
import time
from typing import Any, Dict, List, Literal, Tuple
import cv2
import mediapipe as mp
import numpy as np

from engagement_model import PoseFeatureVector, TemporalEngagementClassifier

BlurMode = Literal["gaussian", "pixelate", "solid"]


class PrivacyFirstCVPipeline:
    def __init__(self):
        self.mp_face = mp.solutions.face_detection.FaceDetection(
            model_selection=1, min_detection_confidence=0.45
        )
        self.mp_pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.classifier = TemporalEngagementClassifier(window_size=10)

    def anonymise_faces(
        self, frame_bgr: np.ndarray, mode: BlurMode = "gaussian", blur_ksize: int = 51
    ) -> Tuple[np.ndarray, int]:
        """Stage 1 & 2: Detect faces and irreversibly redact them before pose estimation."""
        h, w, _ = frame_bgr.shape
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.mp_face.process(rgb)
        anonymised = frame_bgr.copy()
        faces_count = 0

        if results.detections:
            for det in results.detections:
                faces_count += 1
                rel = det.location_data.relative_bounding_box
                x1 = max(0, int((rel.xmin - 0.04) * w))
                y1 = max(0, int((rel.ymin - 0.06) * h))
                x2 = min(w, int((rel.xmin + rel.width + 0.04) * w))
                y2 = min(h, int((rel.ymin + rel.height + 0.04) * h))
                if x2 <= x1 or y2 <= y1:
                    continue

                roi = anonymised[y1:y2, x1:x2]
                if mode == "gaussian":
                    k = max(15, blur_ksize | 1)
                    anonymised[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (k, k), 0)
                elif mode == "pixelate":
                    small = cv2.resize(roi, (max(4, (x2 - x1) // 12), max(4, (y2 - y1) // 12)), interpolation=cv2.INTER_LINEAR)
                    anonymised[y1:y2, x1:x2] = cv2.resize(small, (x2 - x1, y2 - y1), interpolation=cv2.INTER_NEAREST)
                else:
                    cv2.rectangle(anonymised, (x1, y1), (x2, y2), (16, 24, 39), -1)

        return anonymised, faces_count

    def estimate_pose_and_engagement(
        self,
        anonymised_bgr: np.ndarray,
        model_type: Literal["baseline", "lstm"] = "baseline",
    ) -> Dict[str, Any]:
        """Stage 3 & 4: Run pose estimation STRICTLY on the anonymised frame."""
        t0 = time.perf_counter()
        rgb_anon = cv2.cvtColor(anonymised_bgr, cv2.COLOR_BGR2RGB)
        pose_res = self.mp_pose.process(rgb_anon)

        people: List[Dict[str, Any]] = []
        if pose_res.pose_landmarks:
            lm = pose_res.pose_landmarks.landmark
            nose = lm[0]
            l_eye = lm[2]
            r_eye = lm[5]
            l_ear = lm[7]
            r_ear = lm[8]
            l_shoulder = lm[11]
            r_shoulder = lm[12]
            l_wrist = lm[15]
            r_wrist = lm[16]
            l_hip = lm[23]
            r_hip = lm[24]

            shoulder_mid_x = (l_shoulder.x + r_shoulder.x) / 2.0
            shoulder_mid_y = (l_shoulder.y + r_shoulder.y) / 2.0
            hip_mid_x = (l_hip.x + r_hip.x) / 2.0
            hip_mid_y = (l_hip.y + r_hip.y) / 2.0
            shoulder_width = max(0.05, abs(l_shoulder.x - r_shoulder.x))

            head_yaw = ((nose.x - shoulder_mid_x) / shoulder_width) * 48.0
            head_pitch = ((nose.y - (shoulder_mid_y - shoulder_width * 0.55)) / shoulder_width) * 42.0
            head_roll = math.degrees(math.atan2(l_eye.y - r_eye.y, max(1e-4, l_eye.x - r_eye.x)))
            torso_lean = math.degrees(math.atan2(shoulder_mid_x - hip_mid_x, max(1e-4, hip_mid_y - shoulder_mid_y)))
            is_slouching = abs(torso_lean) > 14.0 or (shoulder_mid_y - nose.y) < shoulder_width * 0.35
            hand_raised = (l_wrist.y < l_shoulder.y - 0.04) or (r_wrist.y < r_shoulder.y - 0.04)

            gaze_score = max(0.0, 1.0 - (abs(head_yaw) / 45.0) * 0.7 - (max(0.0, head_pitch) / 35.0) * 0.3)
            feat = PoseFeatureVector(
                head_yaw_deg=head_yaw,
                head_pitch_deg=head_pitch,
                head_roll_deg=head_roll,
                torso_lean_deg=torso_lean,
                is_slouching=is_slouching,
                hand_raised=hand_raised,
                gaze_board_score=gaze_score,
                shoulder_symmetry=max(0.0, 1.0 - abs(l_shoulder.y - r_shoulder.y) * 4.0),
            )

            track_id = "Subject #1"
            if model_type == "lstm":
                label, conf, uncertain = self.classifier.predict_lstm(track_id, feat)
            else:
                label, conf, uncertain = self.classifier.predict_baseline(track_id, feat)

            people.append(
                {
                    "anonymousId": track_id,
                    "headYawDeg": round(head_yaw, 1),
                    "headPitchDeg": round(head_pitch, 1),
                    "headRollDeg": round(head_roll, 1),
                    "torsoLeanDeg": round(torso_lean, 1),
                    "isSlouching": is_slouching,
                    "handRaised": hand_raised,
                    "gazeNote": "Approximate Gaze (Head-Orientation Proxy)",
                    "engagementClass": label,
                    "confidence": conf,
                    "isUncertain": uncertain,
                }
            )

        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return {
            "anonymisedBeforePose": True,
            "processingMs": round(elapsed_ms, 2),
            "people": people,
        }

    def process_video_file(
        self,
        video_path: str,
        target_fps: float = 5.0,
        blur_mode: BlurMode = "gaussian",
        model_type: Literal["baseline", "lstm"] = "baseline",
    ) -> Dict[str, Any]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Could not open classroom video file.")

        native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_step = max(1, int(round(native_fps / target_fps)))
        frame_idx = 0
        sampled_frames = 0
        timeline: List[Dict[str, Any]] = []

        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if frame_idx % frame_step == 0:
                    sampled_frames += 1
                    anon_frame, faces_count = self.anonymise_faces(frame, mode=blur_mode)
                    pose_out = self.estimate_pose_and_engagement(anon_frame, model_type=model_type)
                    # Original frame goes out of scope immediately
                    del frame
                    del anon_frame
                    timeline.append(
                        {
                            "timestampSec": round(frame_idx / native_fps, 2),
                            "facesDetected": faces_count,
                            "anonymisedBeforePose": True,
                            "people": pose_out["people"],
                        }
                    )
                frame_idx += 1
        finally:
            cap.release()

        return {
            "sampleFps": target_fps,
            "framesProcessed": sampled_frames,
            "anonymisedBeforePose": True,
            "timeline": timeline,
        }
