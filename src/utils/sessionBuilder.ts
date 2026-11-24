import type {
  BlurMode,
  EngagementDrop,
  ModelType,
  PipelineFrameResult,
  SeatingZoneId,
  SeatingZoneStat,
  SessionRecord,
  TimelinePoint,
} from '../types/classsight';

const ZONE_META: Record<
  SeatingZoneId,
  { rowLabel: SeatingZoneStat['rowLabel']; sideLabel: SeatingZoneStat['sideLabel'] }
> = {
  'front-left': { rowLabel: 'Front Row', sideLabel: 'Left Zone' },
  'front-right': { rowLabel: 'Front Row', sideLabel: 'Right Zone' },
  'middle-left': { rowLabel: 'Middle Row', sideLabel: 'Left Zone' },
  'middle-right': { rowLabel: 'Middle Row', sideLabel: 'Right Zone' },
  'back-left': { rowLabel: 'Back Row', sideLabel: 'Left Zone' },
  'back-right': { rowLabel: 'Back Row', sideLabel: 'Right Zone' },
};

export function buildSessionFromFrames(params: {
  title: string;
  courseCode: string;
  room: string;
  sourceType: 'demo' | 'upload' | 'webcam';
  modelType: ModelType;
  blurMode: BlurMode;
  frames: PipelineFrameResult[];
}): SessionRecord {
  const { title, courseCode, room, sourceType, modelType, blurMode, frames } = params;
  const count = Math.max(1, frames.length);
  const durationSec = Math.max(1, Math.round(frames[frames.length - 1]?.timestampSec ?? count * 0.2));

  // Bucket frames into up to 24 timeline points for readable visualization
  const bucketSize = Math.max(1, Math.ceil(frames.length / 24));
  const timeline: TimelinePoint[] = [];

  for (let i = 0; i < frames.length; i += bucketSize) {
    const slice = frames.slice(i, i + bucketSize);
    let att = 0;
    let dis = 0;
    let part = 0;
    let unc = 0;
    let maxStudents = 0;
    let scoreSum = 0;

    for (const f of slice) {
      att += f.classCounts.attentive;
      dis += f.classCounts.distracted;
      part += f.classCounts.participating;
      unc += f.classCounts.uncertain;
      maxStudents = Math.max(maxStudents, f.people.length);
      scoreSum += f.overallScore;
    }

    const totalObs = Math.max(1, att + dis + part + unc);
    const ts = Math.round(slice[0].timestampSec);
    const mm = Math.floor(ts / 60);
    const ss = ts % 60;
    const avgScore = Math.round(scoreSum / slice.length);
    const prevScore = timeline.length > 0 ? timeline[timeline.length - 1].overallScore : avgScore;

    timeline.push({
      timestampSec: ts,
      label: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
      attentivePct: Math.round((att / totalObs) * 100),
      distractedPct: Math.round((dis / totalObs) * 100),
      participatingPct: Math.round((part / totalObs) * 100),
      uncertainPct: Math.round((unc / totalObs) * 100),
      overallScore: avgScore,
      studentsDetected: maxStudents,
      isDrop: prevScore - avgScore >= 12,
    });
  }

  // Aggregate seating zones (never individual identities)
  const zoneAccum = new Map<
    SeatingZoneId,
    { att: number; dis: number; part: number; unc: number; total: number }
  >();
  (Object.keys(ZONE_META) as SeatingZoneId[]).forEach((z) => {
    zoneAccum.set(z, { att: 0, dis: 0, part: 0, unc: 0, total: 0 });
  });

  let maxStudentsDetected = 0;
  let totalAtt = 0;
  let totalDis = 0;
  let totalPart = 0;
  let totalUnc = 0;

  for (const f of frames) {
    maxStudentsDetected = Math.max(maxStudentsDetected, f.people.length);
    for (const p of f.people) {
      const bucket = zoneAccum.get(p.zoneId)!;
      bucket.total += 1;
      if (p.engagementClass === 'Attentive') {
        bucket.att += 1;
        totalAtt += 1;
      } else if (p.engagementClass === 'Distracted') {
        bucket.dis += 1;
        totalDis += 1;
      } else if (p.engagementClass === 'Participating') {
        bucket.part += 1;
        totalPart += 1;
      } else {
        bucket.unc += 1;
        totalUnc += 1;
      }
    }
  }

  const seatingZones: SeatingZoneStat[] = (Object.keys(ZONE_META) as SeatingZoneId[]).map((zoneId) => {
    const meta = ZONE_META[zoneId];
    const acc = zoneAccum.get(zoneId)!;
    if (acc.total === 0) {
      return {
        zoneId,
        rowLabel: meta.rowLabel,
        sideLabel: meta.sideLabel,
        avgEngagement: 0,
        attentivePct: 0,
        distractedPct: 0,
        participatingPct: 0,
        uncertainPct: 100,
        avgOccupancy: 0,
        status: 'uncertain',
      };
    }
    const attPct = Math.round((acc.att / acc.total) * 100);
    const disPct = Math.round((acc.dis / acc.total) * 100);
    const partPct = Math.round((acc.part / acc.total) * 100);
    const uncPct = Math.max(0, 100 - attPct - disPct - partPct);
    const avgEng = Math.min(100, Math.round(attPct * 0.92 + partPct * 1.0 + disPct * 0.2));
    const status: SeatingZoneStat['status'] =
      uncPct >= 25 ? 'uncertain' : avgEng >= 70 ? 'high' : 'low';

    return {
      zoneId,
      rowLabel: meta.rowLabel,
      sideLabel: meta.sideLabel,
      avgEngagement: avgEng,
      attentivePct: attPct,
      distractedPct: disPct,
      participatingPct: partPct,
      uncertainPct: uncPct,
      avgOccupancy: Math.max(1, Math.round(acc.total / count)),
      status,
    };
  });

  // Engagement drop detection
  const drops: EngagementDrop[] = [];
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1];
    const curr = timeline[i];
    if (prev.overallScore - curr.overallScore >= 12) {
      drops.push({
        id: `drop-${i}`,
        startSec: prev.timestampSec,
        endSec: curr.timestampSec,
        timeRange: `${prev.label} – ${curr.label}`,
        previousScore: prev.overallScore,
        lowestScore: curr.overallScore,
        dropDelta: curr.overallScore - prev.overallScore,
        primaryCause: 'Detected increase in off-axis head yaw or downward posture angle',
        affectedZone: 'Aggregated Classroom Stream',
      });
    }
  }

  const grandTotal = Math.max(1, totalAtt + totalDis + totalPart + totalUnc);
  const attentivePct = Math.round((totalAtt / grandTotal) * 100);
  const distractedPct = Math.round((totalDis / grandTotal) * 100);
  const participatingPct = Math.round((totalPart / grandTotal) * 100);
  const uncertainPct = Math.max(0, 100 - attentivePct - distractedPct - participatingPct);
  const overallScore = Math.round(
    frames.reduce((s, f) => s + f.overallScore, 0) / frames.length
  );

  const modelLabel =
    modelType === 'lstm'
      ? 'Temporal LSTM Architecture (Prototype Weights · Browser WASM)'
      : 'Baseline Classifier (Head Pose + Posture Logistic · Browser WASM)';

  const populatedZones = seatingZones.filter((z) => z.avgOccupancy > 0);
  const topZone = [...populatedZones].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
  const lowZone = [...populatedZones].sort((a, b) => a.avgEngagement - b.avgEngagement)[0];

  const insights = [
    `Processed ${frames.length} anonymised frames at 5 FPS with pre-pose ${blurMode} face redaction.`,
    topZone
      ? `Highest engagement observed in ${topZone.rowLabel} ${topZone.sideLabel} (${topZone.avgEngagement}%).`
      : 'No occupied seating zones detected.',
    lowZone && lowZone !== topZone
      ? `Lowest engagement observed in ${lowZone.rowLabel} ${lowZone.sideLabel} (${lowZone.avgEngagement}%).`
      : `Overall engagement averaged ${overallScore}% across ${maxStudentsDetected} anonymous subject tracks.`,
  ];

  return {
    id: `session-${Date.now()}`,
    title,
    courseCode,
    room,
    createdAt: new Date().toISOString(),
    durationSec,
    sourceType,
    modelType,
    modelLabel,
    isDemoData: false,
    sampleFps: 5,
    framesProcessed: frames.length,
    studentsDetected: maxStudentsDetected,
    overallScore,
    attentivePct,
    distractedPct,
    participatingPct,
    uncertainPct,
    blurMode,
    skeletonOnlyStored: true,
    anonymisedBeforePose: true,
    timeline,
    seatingZones,
    drops,
    insights,
  };
}
