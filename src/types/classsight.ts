export type EngagementClass = 'Attentive' | 'Distracted' | 'Participating' | 'Uncertain';

export type ModelType = 'demo' | 'baseline' | 'lstm';

export type BlurMode = 'gaussian' | 'pixelate' | 'solid';

export type SeatingZoneId =
  | 'front-left'
  | 'front-right'
  | 'middle-left'
  | 'middle-right'
  | 'back-left'
  | 'back-right';

export type DashboardSection =
  | 'overview'
  | 'live'
  | 'video'
  | 'anonymisation'
  | 'pose'
  | 'analytics'
  | 'heatmap'
  | 'evaluation'
  | 'reports'
  | 'privacy';

export interface TimelinePoint {
  timestampSec: number;
  label: string;
  attentivePct: number;
  distractedPct: number;
  participatingPct: number;
  uncertainPct: number;
  overallScore: number;
  studentsDetected: number;
  isDrop?: boolean;
}

export interface SeatingZoneStat {
  zoneId: SeatingZoneId;
  rowLabel: 'Front Row' | 'Middle Row' | 'Back Row';
  sideLabel: 'Left Zone' | 'Right Zone';
  avgEngagement: number;
  attentivePct: number;
  distractedPct: number;
  participatingPct: number;
  uncertainPct: number;
  avgOccupancy: number;
  status: 'high' | 'low' | 'uncertain';
}

export interface EngagementDrop {
  id: string;
  startSec: number;
  endSec: number;
  timeRange: string;
  previousScore: number;
  lowestScore: number;
  dropDelta: number;
  primaryCause: string;
  affectedZone: string;
}

export interface SessionRecord {
  id: string;
  title: string;
  courseCode: string;
  room: string;
  createdAt: string;
  durationSec: number;
  sourceType: 'demo' | 'upload' | 'webcam' | 'python-backend';
  modelType: ModelType;
  modelLabel: string;
  isDemoData: boolean;
  sampleFps: number;
  framesProcessed: number;
  studentsDetected: number;
  overallScore: number;
  attentivePct: number;
  distractedPct: number;
  participatingPct: number;
  uncertainPct: number;
  blurMode: BlurMode;
  skeletonOnlyStored: boolean;
  anonymisedBeforePose: boolean;
  aiSummary?: string;
  timeline: TimelinePoint[];
  seatingZones: SeatingZoneStat[];
  drops: EngagementDrop[];
  insights: string[];
}

export interface PoseLandmark2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PersonPoseTelemetry {
  anonymousId: string; // e.g., "Subject #1" — never student identity
  zoneId: SeatingZoneId;
  bbox: { x: number; y: number; width: number; height: number };
  headYawDeg: number;
  headPitchDeg: number;
  headRollDeg: number;
  gazeEstimate: 'Board / Center' | 'Desk / Down' | 'Off-Axis Left' | 'Off-Axis Right';
  gazeNote: string;
  torsoLeanDeg: number;
  isSlouching: boolean;
  handRaised: boolean;
  engagementClass: EngagementClass;
  confidence: number;
  isUncertain: boolean;
  landmarks: PoseLandmark2D[];
}

export interface PipelineFrameResult {
  frameIndex: number;
  timestampSec: number;
  facesDetected: number;
  anonymisedBeforePose: boolean;
  processingMs: number;
  effectiveFps: number;
  people: PersonPoseTelemetry[];
  classCounts: {
    attentive: number;
    distracted: number;
    participating: number;
    uncertain: number;
  };
  overallScore: number;
}

export interface ConfusionMatrixCell {
  actual: 'Attentive' | 'Distracted' | 'Participating';
  predicted: 'Attentive' | 'Distracted' | 'Participating';
  count: number;
}

export interface PerClassMetric {
  label: 'Attentive' | 'Distracted' | 'Participating';
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface FrameLabelComparison {
  clipId: string;
  timestampLabel: string;
  annotatedLabel: 'Attentive' | 'Distracted' | 'Participating';
  predictedLabel: 'Attentive' | 'Distracted' | 'Participating';
  confidence: number;
  headYawDeg: number;
  handRaised: boolean;
  match: boolean;
}

export interface EvaluationResult {
  id: string;
  datasetName: string;
  modelName: string;
  modelType: ModelType;
  isIllustrative: boolean;
  evaluatedAt: string;
  totalSamples: number;
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  cohensKappa: number;
  perClass: PerClassMetric[];
  confusionMatrix: ConfusionMatrixCell[];
  comparisons: FrameLabelComparison[];
}

export interface PrivacySettings {
  anonymisationRequired: boolean;
  blurMode: BlurMode;
  blurStrength: number;
  skeletonOnlyMode: boolean;
  localProcessingOnly: boolean;
  consentConfirmed: boolean;
  consentInstructor: string;
  consentCourseRef: string;
  consentUpdatedAt: string;
  rawVideoRetentionSec: number; // Always 0 for privacy-first compliance
  pythonBackendUrl: string;
}

export interface PrivacyAuditEntry {
  id: number;
  timestamp: string;
  eventType: string;
  details: string;
  status: 'Verified' | 'Updated' | 'Purged';
}
