import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  ConfusionMatrixCell,
  EngagementDrop,
  EvaluationResult,
  FrameLabelComparison,
  ModelType,
  PerClassMetric,
  PrivacyAuditEntry,
  PrivacySettings,
  SeatingZoneStat,
  SessionRecord,
  TimelinePoint,
} from '../src/types/classsight.ts';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'classsight.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    course_code TEXT NOT NULL,
    room TEXT NOT NULL,
    created_at TEXT NOT NULL,
    duration_sec INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    model_type TEXT NOT NULL,
    model_label TEXT NOT NULL,
    is_demo_data INTEGER NOT NULL,
    sample_fps REAL NOT NULL,
    frames_processed INTEGER NOT NULL,
    students_detected INTEGER NOT NULL,
    overall_score REAL NOT NULL,
    attentive_pct REAL NOT NULL,
    distracted_pct REAL NOT NULL,
    participating_pct REAL NOT NULL,
    uncertain_pct REAL NOT NULL,
    blur_mode TEXT NOT NULL,
    skeleton_only_stored INTEGER NOT NULL,
    anonymised_before_pose INTEGER NOT NULL,
    ai_summary TEXT,
    timeline_json TEXT NOT NULL,
    seating_zones_json TEXT NOT NULL,
    drops_json TEXT NOT NULL,
    insights_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS evaluation_runs (
    id TEXT PRIMARY KEY,
    dataset_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    is_illustrative INTEGER NOT NULL,
    evaluated_at TEXT NOT NULL,
    total_samples INTEGER NOT NULL,
    accuracy REAL NOT NULL,
    macro_precision REAL NOT NULL,
    macro_recall REAL NOT NULL,
    macro_f1 REAL NOT NULL,
    cohens_kappa REAL NOT NULL,
    per_class_json TEXT NOT NULL,
    confusion_matrix_json TEXT NOT NULL,
    comparisons_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS privacy_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    anonymisation_required INTEGER NOT NULL,
    blur_mode TEXT NOT NULL,
    blur_strength INTEGER NOT NULL,
    skeleton_only_mode INTEGER NOT NULL,
    local_processing_only INTEGER NOT NULL,
    consent_confirmed INTEGER NOT NULL,
    consent_instructor TEXT NOT NULL,
    consent_course_ref TEXT NOT NULL,
    consent_updated_at TEXT NOT NULL,
    raw_video_retention_sec INTEGER NOT NULL,
    python_backend_url TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS privacy_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL
  );
`);

function formatMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function buildDemoSessions(): SessionRecord[] {
  const s1Timeline: TimelinePoint[] = [
    { timestampSec: 0, label: '00:00', attentivePct: 74, distractedPct: 14, participatingPct: 8, uncertainPct: 4, overallScore: 82, studentsDetected: 28 },
    { timestampSec: 180, label: '03:00', attentivePct: 78, distractedPct: 11, participatingPct: 9, uncertainPct: 2, overallScore: 87, studentsDetected: 29 },
    { timestampSec: 360, label: '06:00', attentivePct: 72, distractedPct: 13, participatingPct: 12, uncertainPct: 3, overallScore: 84, studentsDetected: 29 },
    { timestampSec: 540, label: '09:00', attentivePct: 68, distractedPct: 15, participatingPct: 14, uncertainPct: 3, overallScore: 82, studentsDetected: 30 },
    { timestampSec: 720, label: '12:00', attentivePct: 54, distractedPct: 34, participatingPct: 7, uncertainPct: 5, overallScore: 61, studentsDetected: 30, isDrop: true },
    { timestampSec: 900, label: '15:00', attentivePct: 58, distractedPct: 29, participatingPct: 8, uncertainPct: 5, overallScore: 66, studentsDetected: 30, isDrop: true },
    { timestampSec: 1080, label: '18:00', attentivePct: 67, distractedPct: 18, participatingPct: 12, uncertainPct: 3, overallScore: 79, studentsDetected: 30 },
    { timestampSec: 1260, label: '21:00', attentivePct: 64, distractedPct: 14, participatingPct: 19, uncertainPct: 3, overallScore: 83, studentsDetected: 30 },
    { timestampSec: 1440, label: '24:00', attentivePct: 71, distractedPct: 13, participatingPct: 13, uncertainPct: 3, overallScore: 84, studentsDetected: 29 },
    { timestampSec: 1620, label: '27:00', attentivePct: 49, distractedPct: 39, participatingPct: 6, uncertainPct: 6, overallScore: 55, studentsDetected: 29, isDrop: true },
    { timestampSec: 1800, label: '30:00', attentivePct: 66, distractedPct: 19, participatingPct: 12, uncertainPct: 3, overallScore: 78, studentsDetected: 29 },
    { timestampSec: 1980, label: '33:00', attentivePct: 73, distractedPct: 12, participatingPct: 12, uncertainPct: 3, overallScore: 85, studentsDetected: 29 },
  ];

  const s1Zones: SeatingZoneStat[] = [
    { zoneId: 'front-left', rowLabel: 'Front Row', sideLabel: 'Left Zone', avgEngagement: 89, attentivePct: 72, distractedPct: 8, participatingPct: 17, uncertainPct: 3, avgOccupancy: 5, status: 'high' },
    { zoneId: 'front-right', rowLabel: 'Front Row', sideLabel: 'Right Zone', avgEngagement: 86, attentivePct: 70, distractedPct: 11, participatingPct: 16, uncertainPct: 3, avgOccupancy: 5, status: 'high' },
    { zoneId: 'middle-left', rowLabel: 'Middle Row', sideLabel: 'Left Zone', avgEngagement: 78, attentivePct: 66, distractedPct: 18, participatingPct: 12, uncertainPct: 4, avgOccupancy: 5, status: 'high' },
    { zoneId: 'middle-right', rowLabel: 'Middle Row', sideLabel: 'Right Zone', avgEngagement: 74, attentivePct: 63, distractedPct: 22, participatingPct: 11, uncertainPct: 4, avgOccupancy: 5, status: 'high' },
    { zoneId: 'back-left', rowLabel: 'Back Row', sideLabel: 'Left Zone', avgEngagement: 56, attentivePct: 48, distractedPct: 39, participatingPct: 8, uncertainPct: 5, avgOccupancy: 5, status: 'low' },
    { zoneId: 'back-right', rowLabel: 'Back Row', sideLabel: 'Right Zone', avgEngagement: 61, attentivePct: 46, distractedPct: 26, participatingPct: 7, uncertainPct: 21, avgOccupancy: 4, status: 'uncertain' },
  ];

  const s1Drops: EngagementDrop[] = [
    {
      id: 'drop-1',
      startSec: 720,
      endSec: 900,
      timeRange: '12:00 – 15:00',
      previousScore: 82,
      lowestScore: 61,
      dropDelta: -21,
      primaryCause: 'Sustained downward head pitch & gaze off-axis during dense derivation slides',
      affectedZone: 'Back Row (Left & Right)',
    },
    {
      id: 'drop-2',
      startSec: 1620,
      endSec: 1740,
      timeRange: '27:00 – 29:00',
      previousScore: 84,
      lowestScore: 55,
      dropDelta: -29,
      primaryCause: 'Increased slouch posture & lateral head yaw before Q&A prompt',
      affectedZone: 'Middle-Right & Back-Left',
    },
  ];

  const s2Timeline: TimelinePoint[] = [
    { timestampSec: 0, label: '00:00', attentivePct: 69, distractedPct: 16, participatingPct: 12, uncertainPct: 3, overallScore: 81, studentsDetected: 22 },
    { timestampSec: 180, label: '03:00', attentivePct: 66, distractedPct: 14, participatingPct: 17, uncertainPct: 3, overallScore: 83, studentsDetected: 22 },
    { timestampSec: 360, label: '06:00', attentivePct: 61, distractedPct: 12, participatingPct: 24, uncertainPct: 3, overallScore: 85, studentsDetected: 23 },
    { timestampSec: 540, label: '09:00', attentivePct: 64, distractedPct: 13, participatingPct: 20, uncertainPct: 3, overallScore: 84, studentsDetected: 23 },
    { timestampSec: 720, label: '12:00', attentivePct: 70, distractedPct: 15, participatingPct: 12, uncertainPct: 3, overallScore: 82, studentsDetected: 23 },
    { timestampSec: 900, label: '15:00', attentivePct: 58, distractedPct: 28, participatingPct: 10, uncertainPct: 4, overallScore: 68, studentsDetected: 23, isDrop: true },
    { timestampSec: 1080, label: '18:00', attentivePct: 68, distractedPct: 14, participatingPct: 15, uncertainPct: 3, overallScore: 83, studentsDetected: 23 },
  ];

  const s2Zones: SeatingZoneStat[] = [
    { zoneId: 'front-left', rowLabel: 'Front Row', sideLabel: 'Left Zone', avgEngagement: 91, attentivePct: 68, distractedPct: 7, participatingPct: 23, uncertainPct: 2, avgOccupancy: 4, status: 'high' },
    { zoneId: 'front-right', rowLabel: 'Front Row', sideLabel: 'Right Zone', avgEngagement: 88, attentivePct: 67, distractedPct: 9, participatingPct: 21, uncertainPct: 3, avgOccupancy: 4, status: 'high' },
    { zoneId: 'middle-left', rowLabel: 'Middle Row', sideLabel: 'Left Zone', avgEngagement: 82, attentivePct: 65, distractedPct: 14, participatingPct: 17, uncertainPct: 4, avgOccupancy: 4, status: 'high' },
    { zoneId: 'middle-right', rowLabel: 'Middle Row', sideLabel: 'Right Zone', avgEngagement: 79, attentivePct: 64, distractedPct: 17, participatingPct: 15, uncertainPct: 4, avgOccupancy: 4, status: 'high' },
    { zoneId: 'back-left', rowLabel: 'Back Row', sideLabel: 'Left Zone', avgEngagement: 67, attentivePct: 58, distractedPct: 27, participatingPct: 10, uncertainPct: 5, avgOccupancy: 4, status: 'low' },
    { zoneId: 'back-right', rowLabel: 'Back Row', sideLabel: 'Right Zone', avgEngagement: 72, attentivePct: 60, distractedPct: 21, participatingPct: 13, uncertainPct: 6, avgOccupancy: 3, status: 'high' },
  ];

  return [
    {
      id: 'demo-cs401-lecture',
      title: 'Computer Vision & Pose Geometry Lecture',
      courseCode: 'CS-401',
      room: 'Engineering Hall 204',
      createdAt: '2026-11-22T09:30:00.000Z',
      durationSec: 1980,
      sourceType: 'demo',
      modelType: 'lstm',
      modelLabel: 'Demonstration Data · Temporal LSTM Architecture (Prototype)',
      isDemoData: true,
      sampleFps: 5,
      framesProcessed: 9900,
      studentsDetected: 29,
      overallScore: 78,
      attentivePct: 66,
      distractedPct: 19,
      participatingPct: 12,
      uncertainPct: 3,
      blurMode: 'gaussian',
      skeletonOnlyStored: true,
      anonymisedBeforePose: true,
      aiSummary:
        'Class engagement averaged 78% across the 33-minute CS-401 lecture, anchored by strong front-row attention (87.5%) and active hand-raising around minute 21:00 (19% participation). Two localized engagement dips occurred at 12:00–15:00 (-21 pts) and 27:00–29:00 (-29 pts), concentrated in back-row zones where downward head pitch increased during proof walkthroughs.',
      timeline: s1Timeline,
      seatingZones: s1Zones,
      drops: s1Drops,
      insights: [
        'Front-row zones sustained 87.5% mean engagement vs 58.5% in back-row zones (+29.0 pt spatial gradient).',
        'Interactive Q&A at 21:00 elevated Participating cues from 7% to 19% within two 10-frame sliding windows.',
        'Back-right corner recorded 21% uncertain frames due to partial desk occlusion; marked grey on seating map.',
      ],
    },
    {
      id: 'demo-ai302-seminar',
      title: 'Deep Sequence Models Seminar',
      courseCode: 'AI-302',
      room: 'Innovation Lab 108',
      createdAt: '2026-11-21T14:00:00.000Z',
      durationSec: 1080,
      sourceType: 'demo',
      modelType: 'baseline',
      modelLabel: 'Demonstration Data · Baseline Classifier (Rule + Logistic)',
      isDemoData: true,
      sampleFps: 5,
      framesProcessed: 5400,
      studentsDetected: 23,
      overallScore: 81,
      attentivePct: 65,
      distractedPct: 16,
      participatingPct: 16,
      uncertainPct: 3,
      blurMode: 'gaussian',
      skeletonOnlyStored: true,
      anonymisedBeforePose: true,
      aiSummary:
        'Discussion-heavy seminar maintained 81% overall engagement with high participation (16% mean, peaking at 24% at 06:00). Only one brief 14-point dip appeared at 15:00 before wrapping up.',
      timeline: s2Timeline,
      seatingZones: s2Zones,
      drops: [
        {
          id: 'drop-s2-1',
          startSec: 900,
          endSec: 960,
          timeRange: '15:00 – 16:00',
          previousScore: 82,
          lowestScore: 68,
          dropDelta: -14,
          primaryCause: 'Brief transition pause while switching code notebooks',
          affectedZone: 'Back-Left Zone',
        },
      ],
      insights: [
        'Seminar seating shows smaller front-to-back variance (+20 pt difference vs +29 pt in lecture halls).',
        'Raised-hand posture cues peaked during open critique between 04:00 and 09:00.',
      ],
    },
  ];
}

function buildSeedEvaluationRuns(): EvaluationResult[] {
  const baselineComparisons: FrameLabelComparison[] = [
    { clipId: 'CLIP-001', timestampLabel: '00:12.4', annotatedLabel: 'Attentive', predictedLabel: 'Attentive', confidence: 0.89, headYawDeg: 4.2, handRaised: false, match: true },
    { clipId: 'CLIP-002', timestampLabel: '00:28.0', annotatedLabel: 'Participating', predictedLabel: 'Participating', confidence: 0.94, headYawDeg: -3.1, handRaised: true, match: true },
    { clipId: 'CLIP-003', timestampLabel: '00:44.6', annotatedLabel: 'Distracted', predictedLabel: 'Distracted', confidence: 0.81, headYawDeg: 36.4, handRaised: false, match: true },
    { clipId: 'CLIP-004', timestampLabel: '01:02.2', annotatedLabel: 'Attentive', predictedLabel: 'Distracted', confidence: 0.61, headYawDeg: 19.5, handRaised: false, match: false },
    { clipId: 'CLIP-005', timestampLabel: '01:18.8', annotatedLabel: 'Participating', predictedLabel: 'Participating', confidence: 0.91, headYawDeg: 2.0, handRaised: true, match: true },
    { clipId: 'CLIP-006', timestampLabel: '01:35.0', annotatedLabel: 'Distracted', predictedLabel: 'Attentive', confidence: 0.59, headYawDeg: 11.2, handRaised: false, match: false },
    { clipId: 'CLIP-007', timestampLabel: '01:51.4', annotatedLabel: 'Attentive', predictedLabel: 'Attentive', confidence: 0.87, headYawDeg: -5.8, handRaised: false, match: true },
    { clipId: 'CLIP-008', timestampLabel: '02:09.0', annotatedLabel: 'Distracted', predictedLabel: 'Distracted', confidence: 0.85, headYawDeg: -32.7, handRaised: false, match: true },
    { clipId: 'CLIP-009', timestampLabel: '02:24.6', annotatedLabel: 'Attentive', predictedLabel: 'Attentive', confidence: 0.92, headYawDeg: 1.4, handRaised: false, match: true },
    { clipId: 'CLIP-010', timestampLabel: '02:41.2', annotatedLabel: 'Participating', predictedLabel: 'Attentive', confidence: 0.63, headYawDeg: 5.0, handRaised: false, match: false },
  ];

  const baselineMatrix: ConfusionMatrixCell[] = [
    { actual: 'Attentive', predicted: 'Attentive', count: 142 },
    { actual: 'Attentive', predicted: 'Distracted', count: 14 },
    { actual: 'Attentive', predicted: 'Participating', count: 4 },
    { actual: 'Distracted', predicted: 'Attentive', count: 18 },
    { actual: 'Distracted', predicted: 'Distracted', count: 74 },
    { actual: 'Distracted', predicted: 'Participating', count: 2 },
    { actual: 'Participating', predicted: 'Attentive', count: 7 },
    { actual: 'Participating', predicted: 'Distracted', count: 1 },
    { actual: 'Participating', predicted: 'Participating', count: 58 },
  ];

  const baselinePerClass: PerClassMetric[] = [
    { label: 'Attentive', precision: 0.850, recall: 0.888, f1Score: 0.869, support: 160 },
    { label: 'Distracted', precision: 0.831, recall: 0.787, f1Score: 0.809, support: 94 },
    { label: 'Participating', precision: 0.906, recall: 0.879, f1Score: 0.892, support: 66 },
  ];

  const lstmMatrix: ConfusionMatrixCell[] = [
    { actual: 'Attentive', predicted: 'Attentive', count: 149 },
    { actual: 'Attentive', predicted: 'Distracted', count: 8 },
    { actual: 'Attentive', predicted: 'Participating', count: 3 },
    { actual: 'Distracted', predicted: 'Attentive', count: 11 },
    { actual: 'Distracted', predicted: 'Distracted', count: 82 },
    { actual: 'Distracted', predicted: 'Participating', count: 1 },
    { actual: 'Participating', predicted: 'Attentive', count: 4 },
    { actual: 'Participating', predicted: 'Distracted', count: 0 },
    { actual: 'Participating', predicted: 'Participating', count: 62 },
  ];

  const lstmPerClass: PerClassMetric[] = [
    { label: 'Attentive', precision: 0.909, recall: 0.931, f1Score: 0.920, support: 160 },
    { label: 'Distracted', precision: 0.911, recall: 0.872, f1Score: 0.891, support: 94 },
    { label: 'Participating', precision: 0.939, recall: 0.939, f1Score: 0.939, support: 66 },
  ];

  const lstmComparisons = baselineComparisons.map((item, idx) =>
    idx === 3 || idx === 5
      ? { ...item, predictedLabel: item.annotatedLabel, confidence: 0.84, match: true }
      : item
  );

  return [
    {
      id: 'eval-lstm-benchmark',
      datasetName: 'Annotated Classroom Validation Set (320 5-FPS Windows)',
      modelName: 'Temporal LSTM Sequence Classifier (Prototype Benchmark)',
      modelType: 'lstm',
      isIllustrative: true,
      evaluatedAt: '2026-11-22T10:15:00.000Z',
      totalSamples: 320,
      accuracy: 0.916,
      macroPrecision: 0.920,
      macroRecall: 0.914,
      macroF1: 0.917,
      cohensKappa: 0.861,
      perClass: lstmPerClass,
      confusionMatrix: lstmMatrix,
      comparisons: lstmComparisons,
    },
    {
      id: 'eval-baseline-benchmark',
      datasetName: 'Annotated Classroom Validation Set (320 5-FPS Windows)',
      modelName: 'Baseline Classifier (Head Pose + Posture Heuristic + Logistic)',
      modelType: 'baseline',
      isIllustrative: true,
      evaluatedAt: '2026-11-22T10:12:00.000Z',
      totalSamples: 320,
      accuracy: 0.856,
      macroPrecision: 0.862,
      macroRecall: 0.851,
      macroF1: 0.857,
      cohensKappa: 0.764,
      perClass: baselinePerClass,
      confusionMatrix: baselineMatrix,
      comparisons: baselineComparisons,
    },
  ];
}

export function seedDatabaseIfEmpty() {
  const sessionCount = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
  if (sessionCount === 0) {
    const insertSession = db.prepare(`
      INSERT INTO sessions (
        id, title, course_code, room, created_at, duration_sec, source_type,
        model_type, model_label, is_demo_data, sample_fps, frames_processed,
        students_detected, overall_score, attentive_pct, distracted_pct,
        participating_pct, uncertain_pct, blur_mode, skeleton_only_stored,
        anonymised_before_pose, ai_summary, timeline_json, seating_zones_json,
        drops_json, insights_json
      ) VALUES (
        @id, @title, @courseCode, @room, @createdAt, @durationSec, @sourceType,
        @modelType, @modelLabel, @isDemoData, @sampleFps, @framesProcessed,
        @studentsDetected, @overallScore, @attentivePct, @distractedPct,
        @participatingPct, @uncertainPct, @blurMode, @skeletonOnlyStored,
        @anonymisedBeforePose, @aiSummary, @timelineJson, @seatingZonesJson,
        @dropsJson, @insightsJson
      )
    `);

    for (const s of buildDemoSessions()) {
      insertSession.run({
        id: s.id,
        title: s.title,
        courseCode: s.courseCode,
        room: s.room,
        createdAt: s.createdAt,
        durationSec: s.durationSec,
        sourceType: s.sourceType,
        modelType: s.modelType,
        modelLabel: s.modelLabel,
        isDemoData: s.isDemoData ? 1 : 0,
        sampleFps: s.sampleFps,
        framesProcessed: s.framesProcessed,
        studentsDetected: s.studentsDetected,
        overallScore: s.overallScore,
        attentivePct: s.attentivePct,
        distractedPct: s.distractedPct,
        participatingPct: s.participatingPct,
        uncertainPct: s.uncertainPct,
        blurMode: s.blurMode,
        skeletonOnlyStored: s.skeletonOnlyStored ? 1 : 0,
        anonymisedBeforePose: s.anonymisedBeforePose ? 1 : 0,
        aiSummary: s.aiSummary ?? null,
        timelineJson: JSON.stringify(s.timeline),
        seatingZonesJson: JSON.stringify(s.seatingZones),
        dropsJson: JSON.stringify(s.drops),
        insightsJson: JSON.stringify(s.insights),
      });
    }
  }

  const evalCount = (db.prepare('SELECT COUNT(*) as c FROM evaluation_runs').get() as { c: number }).c;
  if (evalCount === 0) {
    const insertEval = db.prepare(`
      INSERT INTO evaluation_runs (
        id, dataset_name, model_name, model_type, is_illustrative, evaluated_at,
        total_samples, accuracy, macro_precision, macro_recall, macro_f1, cohens_kappa,
        per_class_json, confusion_matrix_json, comparisons_json
      ) VALUES (
        @id, @datasetName, @modelName, @modelType, @isIllustrative, @evaluatedAt,
        @totalSamples, @accuracy, @macroPrecision, @macroRecall, @macroF1, @cohensKappa,
        @perClassJson, @confusionMatrixJson, @comparisonsJson
      )
    `);

    for (const ev of buildSeedEvaluationRuns()) {
      insertEval.run({
        id: ev.id,
        datasetName: ev.datasetName,
        modelName: ev.modelName,
        modelType: ev.modelType,
        isIllustrative: ev.isIllustrative ? 1 : 0,
        evaluatedAt: ev.evaluatedAt,
        totalSamples: ev.totalSamples,
        accuracy: ev.accuracy,
        macroPrecision: ev.macroPrecision,
        macroRecall: ev.macroRecall,
        macroF1: ev.macroF1,
        cohensKappa: ev.cohensKappa,
        perClassJson: JSON.stringify(ev.perClass),
        confusionMatrixJson: JSON.stringify(ev.confusionMatrix),
        comparisonsJson: JSON.stringify(ev.comparisons),
      });
    }
  }

  const privacyRow = db.prepare('SELECT id FROM privacy_settings WHERE id = 1').get();
  if (!privacyRow) {
    db.prepare(`
      INSERT INTO privacy_settings (
        id, anonymisation_required, blur_mode, blur_strength, skeleton_only_mode,
        local_processing_only, consent_confirmed, consent_instructor, consent_course_ref,
        consent_updated_at, raw_video_retention_sec, python_backend_url
      ) VALUES (1, 1, 'gaussian', 28, 1, 1, 1, 'Dr. A. Mehta (Faculty Demo)', 'CS-401 / Fall Term', ?, 0, 'http://localhost:8000')
    `).run(new Date().toISOString());

    db.prepare(`
      INSERT INTO privacy_audit_log (timestamp, event_type, details, status)
      VALUES (?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      'Pipeline Privacy Gate Initialized',
      'Enforced pre-pose Gaussian face blur, 0s raw frame retention, and non-PII zone aggregation.',
      'Verified'
    );
  }
}

function mapSessionRow(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    courseCode: String(row.course_code),
    room: String(row.room),
    createdAt: String(row.created_at),
    durationSec: Number(row.duration_sec),
    sourceType: row.source_type as SessionRecord['sourceType'],
    modelType: row.model_type as ModelType,
    modelLabel: String(row.model_label),
    isDemoData: Boolean(row.is_demo_data),
    sampleFps: Number(row.sample_fps),
    framesProcessed: Number(row.frames_processed),
    studentsDetected: Number(row.students_detected),
    overallScore: Number(row.overall_score),
    attentivePct: Number(row.attentive_pct),
    distractedPct: Number(row.distracted_pct),
    participatingPct: Number(row.participating_pct),
    uncertainPct: Number(row.uncertain_pct),
    blurMode: row.blur_mode as SessionRecord['blurMode'],
    skeletonOnlyStored: Boolean(row.skeleton_only_stored),
    anonymisedBeforePose: Boolean(row.anonymised_before_pose),
    aiSummary: row.ai_summary ? String(row.ai_summary) : undefined,
    timeline: JSON.parse(String(row.timeline_json)) as TimelinePoint[],
    seatingZones: JSON.parse(String(row.seating_zones_json)) as SeatingZoneStat[],
    drops: JSON.parse(String(row.drops_json)) as EngagementDrop[],
    insights: JSON.parse(String(row.insights_json)) as string[],
  };
}

export function listSessions(): SessionRecord[] {
  const rows = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(mapSessionRow);
}

export function getSessionById(id: string): SessionRecord | null {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapSessionRow(row) : null;
}

export function insertSession(session: SessionRecord): SessionRecord {
  db.prepare(`
    INSERT INTO sessions (
      id, title, course_code, room, created_at, duration_sec, source_type,
      model_type, model_label, is_demo_data, sample_fps, frames_processed,
      students_detected, overall_score, attentive_pct, distracted_pct,
      participating_pct, uncertain_pct, blur_mode, skeleton_only_stored,
      anonymised_before_pose, ai_summary, timeline_json, seating_zones_json,
      drops_json, insights_json
    ) VALUES (
      @id, @title, @courseCode, @room, @createdAt, @durationSec, @sourceType,
      @modelType, @modelLabel, @isDemoData, @sampleFps, @framesProcessed,
      @studentsDetected, @overallScore, @attentivePct, @distractedPct,
      @participatingPct, @uncertainPct, @blurMode, @skeletonOnlyStored,
      @anonymisedBeforePose, @aiSummary, @timelineJson, @seatingZonesJson,
      @dropsJson, @insightsJson
    )
  `).run({
    id: session.id,
    title: session.title,
    courseCode: session.courseCode,
    room: session.room,
    createdAt: session.createdAt,
    durationSec: session.durationSec,
    sourceType: session.sourceType,
    modelType: session.modelType,
    modelLabel: session.modelLabel,
    isDemoData: session.isDemoData ? 1 : 0,
    sampleFps: session.sampleFps,
    framesProcessed: session.framesProcessed,
    studentsDetected: session.studentsDetected,
    overallScore: session.overallScore,
    attentivePct: session.attentivePct,
    distractedPct: session.distractedPct,
    participatingPct: session.participatingPct,
    uncertainPct: session.uncertainPct,
    blurMode: session.blurMode,
    skeletonOnlyStored: session.skeletonOnlyStored ? 1 : 0,
    anonymisedBeforePose: session.anonymisedBeforePose ? 1 : 0,
    aiSummary: session.aiSummary ?? null,
    timelineJson: JSON.stringify(session.timeline),
    seatingZonesJson: JSON.stringify(session.seatingZones),
    dropsJson: JSON.stringify(session.drops),
    insightsJson: JSON.stringify(session.insights),
  });

  addAuditLog(
    'Session Metrics Persisted',
    `Stored anonymized zone & timeline metrics for "${session.courseCode}" (${session.framesProcessed} frames @ ${session.sampleFps} FPS). Zero video frames or PII stored.`,
    'Verified'
  );

  return session;
}

export function updateSessionSummary(id: string, aiSummary: string): void {
  db.prepare('UPDATE sessions SET ai_summary = ? WHERE id = ?').run(aiSummary, id);
}

export function deleteSessionById(id: string): boolean {
  const res = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  if (res.changes > 0) {
    addAuditLog('Session Data Deleted', `Permanently removed session record "${id}" from local SQLite.`, 'Purged');
    return true;
  }
  return false;
}

export function purgeNonDemoSessions(): number {
  const res = db.prepare('DELETE FROM sessions WHERE is_demo_data = 0').run();
  addAuditLog(
    'User Session Data Purged',
    `Deleted ${res.changes} custom analyzed classroom session(s) on teacher request.`,
    'Purged'
  );
  return res.changes;
}

export function listEvaluationRuns(): EvaluationResult[] {
  const rows = db.prepare('SELECT * FROM evaluation_runs ORDER BY evaluated_at DESC').all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    datasetName: String(row.dataset_name),
    modelName: String(row.model_name),
    modelType: row.model_type as ModelType,
    isIllustrative: Boolean(row.is_illustrative),
    evaluatedAt: String(row.evaluated_at),
    totalSamples: Number(row.total_samples),
    accuracy: Number(row.accuracy),
    macroPrecision: Number(row.macro_precision),
    macroRecall: Number(row.macro_recall),
    macroF1: Number(row.macro_f1),
    cohensKappa: Number(row.cohens_kappa),
    perClass: JSON.parse(String(row.per_class_json)) as PerClassMetric[],
    confusionMatrix: JSON.parse(String(row.confusion_matrix_json)) as ConfusionMatrixCell[],
    comparisons: JSON.parse(String(row.comparisons_json)) as FrameLabelComparison[],
  }));
}

export function insertEvaluationRun(ev: EvaluationResult): EvaluationResult {
  db.prepare(`
    INSERT INTO evaluation_runs (
      id, dataset_name, model_name, model_type, is_illustrative, evaluated_at,
      total_samples, accuracy, macro_precision, macro_recall, macro_f1, cohens_kappa,
      per_class_json, confusion_matrix_json, comparisons_json
    ) VALUES (
      @id, @datasetName, @modelName, @modelType, @isIllustrative, @evaluatedAt,
      @totalSamples, @accuracy, @macroPrecision, @macroRecall, @macroF1, @cohensKappa,
      @perClassJson, @confusionMatrixJson, @comparisonsJson
    )
  `).run({
    id: ev.id,
    datasetName: ev.datasetName,
    modelName: ev.modelName,
    modelType: ev.modelType,
    isIllustrative: ev.isIllustrative ? 1 : 0,
    evaluatedAt: ev.evaluatedAt,
    totalSamples: ev.totalSamples,
    accuracy: ev.accuracy,
    macroPrecision: ev.macroPrecision,
    macroRecall: ev.macroRecall,
    macroF1: ev.macroF1,
    cohensKappa: ev.cohensKappa,
    perClassJson: JSON.stringify(ev.perClass),
    confusionMatrixJson: JSON.stringify(ev.confusionMatrix),
    comparisonsJson: JSON.stringify(ev.comparisons),
  });
  return ev;
}

export function getPrivacySettings(): PrivacySettings {
  const row = db.prepare('SELECT * FROM privacy_settings WHERE id = 1').get() as Record<string, unknown>;
  return {
    anonymisationRequired: Boolean(row.anonymisation_required),
    blurMode: row.blur_mode as PrivacySettings['blurMode'],
    blurStrength: Number(row.blur_strength),
    skeletonOnlyMode: Boolean(row.skeleton_only_mode),
    localProcessingOnly: Boolean(row.local_processing_only),
    consentConfirmed: Boolean(row.consent_confirmed),
    consentInstructor: String(row.consent_instructor),
    consentCourseRef: String(row.consent_course_ref),
    consentUpdatedAt: String(row.consent_updated_at),
    rawVideoRetentionSec: Number(row.raw_video_retention_sec),
    pythonBackendUrl: String(row.python_backend_url),
  };
}

export function updatePrivacySettings(next: Partial<PrivacySettings>): PrivacySettings {
  const current = getPrivacySettings();
  const merged: PrivacySettings = {
    anonymisationRequired: true, // Always enforced true by privacy architecture
    blurMode: next.blurMode ?? current.blurMode,
    blurStrength: next.blurStrength ?? current.blurStrength,
    skeletonOnlyMode: next.skeletonOnlyMode ?? current.skeletonOnlyMode,
    localProcessingOnly: next.localProcessingOnly ?? current.localProcessingOnly,
    consentConfirmed: next.consentConfirmed ?? current.consentConfirmed,
    consentInstructor: next.consentInstructor ?? current.consentInstructor,
    consentCourseRef: next.consentCourseRef ?? current.consentCourseRef,
    consentUpdatedAt: next.consentConfirmed !== undefined || next.consentInstructor || next.consentCourseRef
      ? new Date().toISOString()
      : current.consentUpdatedAt,
    rawVideoRetentionSec: 0, // Strictly zero raw video retention
    pythonBackendUrl: next.pythonBackendUrl ?? current.pythonBackendUrl,
  };

  db.prepare(`
    UPDATE privacy_settings SET
      anonymisation_required = 1,
      blur_mode = @blurMode,
      blur_strength = @blurStrength,
      skeleton_only_mode = @skeletonOnlyMode,
      local_processing_only = @localProcessingOnly,
      consent_confirmed = @consentConfirmed,
      consent_instructor = @consentInstructor,
      consent_course_ref = @consentCourseRef,
      consent_updated_at = @consentUpdatedAt,
      raw_video_retention_sec = 0,
      python_backend_url = @pythonBackendUrl
    WHERE id = 1
  `).run({
    blurMode: merged.blurMode,
    blurStrength: merged.blurStrength,
    skeletonOnlyMode: merged.skeletonOnlyMode ? 1 : 0,
    localProcessingOnly: merged.localProcessingOnly ? 1 : 0,
    consentConfirmed: merged.consentConfirmed ? 1 : 0,
    consentInstructor: merged.consentInstructor,
    consentCourseRef: merged.consentCourseRef,
    consentUpdatedAt: merged.consentUpdatedAt,
    pythonBackendUrl: merged.pythonBackendUrl,
  });

  addAuditLog(
    'Privacy Policy Updated',
    `Blur mode: ${merged.blurMode} (strength ${merged.blurStrength}px), skeleton-only storage: ${merged.skeletonOnlyMode ? 'ON' : 'OFF'}, consent: ${merged.consentConfirmed ? 'Confirmed' : 'Pending'}.`,
    'Updated'
  );

  return merged;
}

export function listPrivacyAuditLog(): PrivacyAuditEntry[] {
  const rows = db
    .prepare('SELECT * FROM privacy_audit_log ORDER BY id DESC LIMIT 40')
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: Number(row.id),
    timestamp: String(row.timestamp),
    eventType: String(row.event_type),
    details: String(row.details),
    status: row.status as PrivacyAuditEntry['status'],
  }));
}

export function addAuditLog(eventType: string, details: string, status: PrivacyAuditEntry['status']): void {
  db.prepare(`
    INSERT INTO privacy_audit_log (timestamp, event_type, details, status)
    VALUES (?, ?, ?, ?)
  `).run(new Date().toISOString(), eventType, details, status);
}

export { formatMMSS };
