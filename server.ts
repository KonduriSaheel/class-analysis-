import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  addAuditLog,
  deleteSessionById,
  getPrivacySettings,
  getSessionById,
  insertEvaluationRun,
  insertSession,
  listEvaluationRuns,
  listPrivacyAuditLog,
  listSessions,
  purgeNonDemoSessions,
  seedDatabaseIfEmpty,
  updatePrivacySettings,
  updateSessionSummary,
} from './server/db.ts';
import type {
  ConfusionMatrixCell,
  EvaluationResult,
  FrameLabelComparison,
  ModelType,
  PerClassMetric,
  SessionRecord,
} from './src/types/classsight.ts';

seedDatabaseIfEmpty();

const app = express();
app.use(express.json({ limit: '2mb' }));

const ALLOWED_BLUR_MODES = new Set(['gaussian', 'pixelate', 'solid']);
const ALLOWED_MODEL_TYPES = new Set(['demo', 'baseline', 'lstm']);
const ALLOWED_SOURCES = new Set(['demo', 'upload', 'webcam', 'python-backend']);
const LABELS: Array<'Attentive' | 'Distracted' | 'Participating'> = [
  'Attentive',
  'Distracted',
  'Participating',
];

function computeEvaluationMetrics(
  comparisons: FrameLabelComparison[],
  datasetName: string,
  modelName: string,
  modelType: ModelType,
  isIllustrative: boolean
): EvaluationResult {
  const matrixMap = new Map<string, number>();
  for (const actual of LABELS) {
    for (const predicted of LABELS) {
      matrixMap.set(`${actual}:${predicted}`, 0);
    }
  }

  let correct = 0;
  for (const row of comparisons) {
    const key = `${row.annotatedLabel}:${row.predictedLabel}`;
    matrixMap.set(key, (matrixMap.get(key) ?? 0) + 1);
    if (row.annotatedLabel === row.predictedLabel) {
      correct += 1;
    }
  }

  const total = Math.max(1, comparisons.length);
  const accuracy = Number((correct / total).toFixed(4));

  const confusionMatrix: ConfusionMatrixCell[] = [];
  for (const actual of LABELS) {
    for (const predicted of LABELS) {
      confusionMatrix.push({
        actual,
        predicted,
        count: matrixMap.get(`${actual}:${predicted}`) ?? 0,
      });
    }
  }

  const perClass: PerClassMetric[] = LABELS.map((label) => {
    const tp = matrixMap.get(`${label}:${label}`) ?? 0;
    let fp = 0;
    let fn = 0;
    let support = 0;
    for (const other of LABELS) {
      support += matrixMap.get(`${label}:${other}`) ?? 0;
      if (other !== label) {
        fp += matrixMap.get(`${other}:${label}`) ?? 0;
        fn += matrixMap.get(`${label}:${other}`) ?? 0;
      }
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return {
      label,
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1Score: Number(f1Score.toFixed(3)),
      support,
    };
  });

  const macroPrecision = Number(
    (perClass.reduce((acc, c) => acc + c.precision, 0) / LABELS.length).toFixed(3)
  );
  const macroRecall = Number(
    (perClass.reduce((acc, c) => acc + c.recall, 0) / LABELS.length).toFixed(3)
  );
  const macroF1 = Number(
    (perClass.reduce((acc, c) => acc + c.f1Score, 0) / LABELS.length).toFixed(3)
  );

  // Compute Cohen's kappa: (po - pe) / (1 - pe)
  let pe = 0;
  for (const label of LABELS) {
    const actualCount = LABELS.reduce((s, p) => s + (matrixMap.get(`${label}:${p}`) ?? 0), 0);
    const predCount = LABELS.reduce((s, a) => s + (matrixMap.get(`${a}:${label}`) ?? 0), 0);
    pe += (actualCount / total) * (predCount / total);
  }
  const cohensKappa = pe < 1 ? Number(((accuracy - pe) / (1 - pe)).toFixed(3)) : 1;

  return {
    id: `eval-${Date.now()}`,
    datasetName,
    modelName,
    modelType,
    isIllustrative,
    evaluatedAt: new Date().toISOString(),
    totalSamples: comparisons.length,
    accuracy,
    macroPrecision,
    macroRecall,
    macroF1,
    cohensKappa,
    perClass,
    confusionMatrix,
    comparisons,
  };
}

app.get('/api/health', async (_req, res) => {
  const privacy = getPrivacySettings();
  let pythonReachable = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 700);
    const resp = await fetch(`${privacy.pythonBackendUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    pythonReachable = resp.ok;
  } catch {
    pythonReachable = false;
  }

  res.json({
    ok: true,
    database: 'sqlite (better-sqlite3)',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    pythonBackendReachable: pythonReachable,
    pythonBackendUrl: privacy.pythonBackendUrl,
    anonymisationEnforced: true,
  });
});

app.get('/api/sessions', (_req, res) => {
  const sessions = listSessions();
  res.json({ sessions });
});

app.get('/api/sessions/:id', (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id || id.length > 80) {
    res.status(400).json({ error: 'Invalid session ID.' });
    return;
  }
  const session = getSessionById(id);
  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  res.json({ session });
});

app.post('/api/sessions', (req, res) => {
  const body = req.body as Partial<SessionRecord> & { rawFrames?: unknown; images?: unknown };

  // Hard privacy firewall: reject any payload attempting to send raw frames or image data
  if ('rawFrames' in body || 'images' in body) {
    res.status(400).json({
      error: 'Privacy policy violation: raw classroom frames or image buffers are never accepted by the server.',
    });
    return;
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const courseCode = typeof body.courseCode === 'string' ? body.courseCode.trim().slice(0, 32) : '';
  const room = typeof body.room === 'string' ? body.room.trim().slice(0, 64) : 'Local Classroom Feed';

  if (!title || !courseCode) {
    res.status(400).json({ error: 'Course code and session title are required.' });
    return;
  }

  if (!body.anonymisedBeforePose) {
    res.status(400).json({
      error: 'Privacy gate failed: anonymisedBeforePose must be verified true before saving session metrics.',
    });
    return;
  }

  const sourceType = ALLOWED_SOURCES.has(String(body.sourceType))
    ? (body.sourceType as SessionRecord['sourceType'])
    : 'upload';
  const modelType = ALLOWED_MODEL_TYPES.has(String(body.modelType))
    ? (body.modelType as ModelType)
    : 'baseline';
  const blurMode = ALLOWED_BLUR_MODES.has(String(body.blurMode))
    ? (body.blurMode as SessionRecord['blurMode'])
    : 'gaussian';

  const newSession: SessionRecord = {
    id: `session-${Date.now()}`,
    title,
    courseCode,
    room,
    createdAt: new Date().toISOString(),
    durationSec: Math.max(1, Math.min(86400, Number(body.durationSec) || 1)),
    sourceType,
    modelType,
    modelLabel:
      typeof body.modelLabel === 'string' && body.modelLabel.trim()
        ? body.modelLabel.trim().slice(0, 100)
        : modelType === 'lstm'
          ? 'Temporal LSTM Architecture (Prototype Weights)'
          : 'Baseline Classifier (Rule + Logistic)',
    isDemoData: Boolean(body.isDemoData),
    sampleFps: Math.max(1, Math.min(30, Number(body.sampleFps) || 5)),
    framesProcessed: Math.max(1, Number(body.framesProcessed) || 1),
    studentsDetected: Math.max(0, Number(body.studentsDetected) || 0),
    overallScore: Math.max(0, Math.min(100, Number(body.overallScore) || 0)),
    attentivePct: Math.max(0, Math.min(100, Number(body.attentivePct) || 0)),
    distractedPct: Math.max(0, Math.min(100, Number(body.distractedPct) || 0)),
    participatingPct: Math.max(0, Math.min(100, Number(body.participatingPct) || 0)),
    uncertainPct: Math.max(0, Math.min(100, Number(body.uncertainPct) || 0)),
    blurMode,
    skeletonOnlyStored: Boolean(body.skeletonOnlyStored ?? true),
    anonymisedBeforePose: true,
    aiSummary: typeof body.aiSummary === 'string' ? body.aiSummary.slice(0, 1200) : undefined,
    timeline: Array.isArray(body.timeline) ? body.timeline.slice(0, 600) : [],
    seatingZones: Array.isArray(body.seatingZones) ? body.seatingZones.slice(0, 12) : [],
    drops: Array.isArray(body.drops) ? body.drops.slice(0, 50) : [],
    insights: Array.isArray(body.insights)
      ? body.insights.slice(0, 10).map((s) => String(s).slice(0, 300))
      : [],
  };

  insertSession(newSession);
  res.status(201).json({ session: newSession });
});

app.delete('/api/sessions/:id', (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Invalid session ID.' });
    return;
  }
  const deleted = deleteSessionById(id);
  if (!deleted) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  res.json({ ok: true, deletedId: id });
});

app.delete('/api/sessions', (_req, res) => {
  const purgedCount = purgeNonDemoSessions();
  res.json({ ok: true, purgedCount });
});

app.post('/api/sessions/:id/ai-summary', async (req, res) => {
  const id = String(req.params.id || '').trim();
  const session = getSessionById(id);
  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  // Strictly aggregated, non-PII numeric payload ONLY (never images, video, or names)
  const sanitizedStatsPayload = {
    courseCode: session.courseCode,
    durationMinutes: Number((session.durationSec / 60).toFixed(1)),
    modelType: session.modelLabel,
    studentsDetectedApprox: session.studentsDetected,
    overallScorePct: session.overallScore,
    distribution: {
      attentivePct: session.attentivePct,
      distractedPct: session.distractedPct,
      participatingPct: session.participatingPct,
      uncertainPct: session.uncertainPct,
    },
    zoneSummary: session.seatingZones.map((z) => ({
      zone: `${z.rowLabel} ${z.sideLabel}`,
      avgEngagementPct: z.avgEngagement,
      status: z.status,
    })),
    engagementDrops: session.drops.map((d) => ({
      timeRange: d.timeRange,
      dropDeltaPts: d.dropDelta,
      primaryCause: d.primaryCause,
      affectedZone: d.affectedZone,
    })),
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        'GEMINI_API_KEY is not configured in server environment secrets. Add GEMINI_API_KEY in Settings > Secrets to generate AI pedagogical summaries.',
      sanitizedStatsPayload,
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      config: {
        systemInstruction:
          'You are an academic pedagogy analyst. Summarize classroom engagement strictly from the provided anonymized aggregated statistics. Never invent student names or identities. Write 3 concise, insightful sentences covering overall engagement, spatial row trends, and actionable pacing recommendations.',
      },
      contents: `Analyze these anonymized classroom engagement metrics and provide a concise pedagogical summary:\n${JSON.stringify(sanitizedStatsPayload, null, 2)}`,
    });

    const summaryText = (response.text ?? '').trim();
    if (!summaryText) {
      res.status(502).json({ error: 'Gemini returned an empty summary response.' });
      return;
    }

    updateSessionSummary(session.id, summaryText);
    addAuditLog(
      'AI Pedagogical Summary Generated',
      `Transmitted strictly aggregated numerical zone stats (0 frames, 0 PII) for "${session.courseCode}" to Gemini text summary endpoint.`,
      'Verified'
    );

    res.json({
      aiSummary: summaryText,
      sanitizedStatsPayload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
    res.status(502).json({
      error: `AI summary request failed: ${message}`,
      sanitizedStatsPayload,
    });
  }
});

app.get('/api/evaluation', (_req, res) => {
  const runs = listEvaluationRuns();
  res.json({ runs });
});

app.post('/api/evaluation/run', (req, res) => {
  const body = req.body as {
    datasetName?: string;
    modelType?: ModelType;
    comparisons?: FrameLabelComparison[];
  };

  const modelType: ModelType = body.modelType === 'lstm' ? 'lstm' : 'baseline';
  const datasetName =
    typeof body.datasetName === 'string' && body.datasetName.trim()
      ? body.datasetName.trim().slice(0, 120)
      : 'Custom Annotated Clip Evaluation';

  if (!Array.isArray(body.comparisons) || body.comparisons.length === 0) {
    res.status(400).json({ error: 'At least one annotated vs predicted clip sample is required.' });
    return;
  }

  const validComparisons: FrameLabelComparison[] = body.comparisons.slice(0, 500).map((item, idx) => {
    const ann = LABELS.includes(item.annotatedLabel) ? item.annotatedLabel : 'Attentive';
    const pred = LABELS.includes(item.predictedLabel) ? item.predictedLabel : 'Attentive';
    return {
      clipId: String(item.clipId || `SAMPLE-${idx + 1}`).slice(0, 32),
      timestampLabel: String(item.timestampLabel || `00:${String(idx * 5).padStart(2, '0')}`).slice(0, 16),
      annotatedLabel: ann,
      predictedLabel: pred,
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.75)),
      headYawDeg: Number(item.headYawDeg) || 0,
      handRaised: Boolean(item.handRaised),
      match: ann === pred,
    };
  });

  const modelName =
    modelType === 'lstm'
      ? 'Temporal LSTM Sequence Classifier (Evaluated Run)'
      : 'Baseline Classifier (Head Pose + Posture Heuristic)';

  const result = computeEvaluationMetrics(
    validComparisons,
    datasetName,
    modelName,
    modelType,
    false
  );
  insertEvaluationRun(result);
  res.status(201).json({ run: result });
});

app.get('/api/privacy', (_req, res) => {
  res.json({
    settings: getPrivacySettings(),
    auditLog: listPrivacyAuditLog(),
  });
});

app.put('/api/privacy', (req, res) => {
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof body.blurMode === 'string' && ALLOWED_BLUR_MODES.has(body.blurMode)) {
    updates.blurMode = body.blurMode;
  }
  if (typeof body.blurStrength === 'number' && Number.isFinite(body.blurStrength)) {
    updates.blurStrength = Math.max(8, Math.min(64, Math.round(body.blurStrength)));
  }
  if (typeof body.skeletonOnlyMode === 'boolean') {
    updates.skeletonOnlyMode = body.skeletonOnlyMode;
  }
  if (typeof body.localProcessingOnly === 'boolean') {
    updates.localProcessingOnly = body.localProcessingOnly;
  }
  if (typeof body.consentConfirmed === 'boolean') {
    updates.consentConfirmed = body.consentConfirmed;
  }
  if (typeof body.consentInstructor === 'string') {
    const trimmed = body.consentInstructor.trim();
    if (!trimmed || trimmed.length > 80) {
      res.status(400).json({ error: 'Instructor label must be between 1 and 80 characters.' });
      return;
    }
    updates.consentInstructor = trimmed;
  }
  if (typeof body.consentCourseRef === 'string') {
    const trimmed = body.consentCourseRef.trim();
    if (!trimmed || trimmed.length > 80) {
      res.status(400).json({ error: 'Course reference must be between 1 and 80 characters.' });
      return;
    }
    updates.consentCourseRef = trimmed;
  }
  if (typeof body.pythonBackendUrl === 'string') {
    const urlStr = body.pythonBackendUrl.trim();
    if (urlStr) {
      try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          res.status(400).json({ error: 'Python backend URL must use http or https.' });
          return;
        }
        updates.pythonBackendUrl = urlStr.replace(/\/$/, '');
      } catch {
        res.status(400).json({ error: 'Invalid Python backend URL.' });
        return;
      }
    }
  }

  const settings = updatePrivacySettings(updates);
  const auditLog = listPrivacyAuditLog();
  res.json({ settings, auditLog });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClassSight AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
