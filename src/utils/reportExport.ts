import { jsPDF } from 'jspdf';
import type { EvaluationResult, SessionRecord } from '../types/classsight';

export function downloadSessionCSV(session: SessionRecord) {
  const lines: string[] = [];
  lines.push('ClassSight AI - Privacy-Preserving Classroom Engagement Export');
  lines.push(`Course Code,${escapeCsv(session.courseCode)}`);
  lines.push(`Session Title,${escapeCsv(session.title)}`);
  lines.push(`Room,${escapeCsv(session.room)}`);
  lines.push(`Duration (sec),${session.durationSec}`);
  lines.push(`Model,${escapeCsv(session.modelLabel)}`);
  lines.push(`Anonymised Before Pose,${session.anonymisedBeforePose ? 'YES' : 'NO'}`);
  lines.push(`Overall Engagement Score,${session.overallScore}%`);
  lines.push(`Attentive %,${session.attentivePct}%`);
  lines.push(`Distracted %,${session.distractedPct}%`);
  lines.push(`Participating %,${session.participatingPct}%`);
  lines.push('');
  lines.push('Timeline');
  lines.push('Timestamp,Label,Overall Score,Attentive %,Distracted %,Participating %,Uncertain %,Students Detected,Drop Alert');
  for (const pt of session.timeline) {
    lines.push(
      `${pt.timestampSec},${pt.label},${pt.overallScore},${pt.attentivePct},${pt.distractedPct},${pt.participatingPct},${pt.uncertainPct},${pt.studentsDetected},${pt.isDrop ? 'DROP' : 'NORMAL'}`
    );
  }
  lines.push('');
  lines.push('Seating Zones (Aggregated Only)');
  lines.push('Zone,Row,Side,Avg Engagement %,Attentive %,Distracted %,Participating %,Uncertain %,Occupancy,Status');
  for (const z of session.seatingZones) {
    lines.push(
      `${z.zoneId},${z.rowLabel},${z.sideLabel},${z.avgEngagement},${z.attentivePct},${z.distractedPct},${z.participatingPct},${z.uncertainPct},${z.avgOccupancy},${z.status}`
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${session.courseCode.replace(/\s+/g, '_')}_engagement_report.csv`);
}

export function downloadSessionPDF(session: SessionRecord, evaluation?: EvaluationResult) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 48;

  const addHeading = (text: string) => {
    if (y > 740) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175);
    doc.text(text, 44, y);
    y += 18;
    doc.setDrawColor(203, 213, 225);
    doc.line(44, y - 10, 550, y - 10);
  };

  const addLine = (label: string, value: string) => {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(label, 44, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(value, 200, y);
    y += 16;
  };

  // Header Banner
  doc.setFillColor(8, 13, 25);
  doc.rect(0, 0, 595, 86, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(248, 250, 252);
  doc.text('ClassSight AI — Classroom Engagement Report', 44, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(34, 211, 238);
  doc.text('Understand Your Classroom. Protect Every Identity. · Privacy-Preserving Analytics', 44, 58);

  y = 114;
  addHeading('1. Class Details & Session Metadata');
  addLine('Course & Title:', `${session.courseCode} — ${session.title}`);
  addLine('Room / Source:', `${session.room} (${session.sourceType})`);
  addLine('Duration:', `${Math.floor(session.durationSec / 60)}m ${session.durationSec % 60}s (${session.framesProcessed} frames @ ${session.sampleFps} FPS)`);
  addLine('Classifier Engine:', session.modelLabel);
  addLine('Data Origin:', session.isDemoData ? 'Demonstration Dataset' : 'Local CV Analysis');
  addLine('Generated At:', new Date().toLocaleString());

  y += 10;
  addHeading('2. Engagement Distribution Summary');
  addLine('Overall Engagement Score:', `${session.overallScore}%`);
  addLine('Attentive:', `${session.attentivePct}%`);
  addLine('Participating:', `${session.participatingPct}%`);
  addLine('Distracted:', `${session.distractedPct}%`);
  addLine('Uncertain:', `${session.uncertainPct}%`);
  addLine('Anonymous Subjects:', `${session.studentsDetected} detected (no identities stored)`);

  if (session.aiSummary) {
    y += 8;
    addHeading('3. Pedagogical Session Summary');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const wrapped = doc.splitTextToSize(session.aiSummary, 505);
    doc.text(wrapped, 44, y);
    y += wrapped.length * 14 + 8;
  }

  y += 6;
  addHeading('4. Aggregated Seating Heatmap Summary');
  for (const z of session.seatingZones) {
    addLine(
      `${z.rowLabel} · ${z.sideLabel}:`,
      `${z.avgEngagement}% engagement (${z.status.toUpperCase()}) · Att ${z.attentivePct}% / Dis ${z.distractedPct}% / Part ${z.participatingPct}%`
    );
  }

  y += 6;
  addHeading('5. Engagement Timeline & Drop Detection');
  if (session.drops.length === 0) {
    addLine('Drop Alerts:', 'No significant engagement drops (>=12 pts) detected.');
  } else {
    for (const d of session.drops) {
      addLine(`${d.timeRange} (${d.dropDelta} pts):`, `${d.primaryCause} [${d.affectedZone}]`);
    }
  }
  const sampleTimeline = session.timeline.slice(0, 8);
  for (const pt of sampleTimeline) {
    addLine(
      `t = ${pt.label}:`,
      `Score ${pt.overallScore}% · Att ${pt.attentivePct}% · Dis ${pt.distractedPct}% · Part ${pt.participatingPct}%`
    );
  }

  if (evaluation) {
    y += 6;
    addHeading('6. Model Evaluation Summary');
    addLine('Evaluated Model:', evaluation.modelName);
    addLine('Accuracy / Macro F1:', `${(evaluation.accuracy * 100).toFixed(1)}% accuracy · ${evaluation.macroF1.toFixed(3)} Macro F1`);
    addLine('Precision / Recall / Kappa:', `P: ${evaluation.macroPrecision.toFixed(3)} · R: ${evaluation.macroRecall.toFixed(3)} · Kappa: ${evaluation.cohensKappa.toFixed(3)}`);
  }

  y += 6;
  addHeading('7. Privacy Processing Compliance Summary');
  addLine('Pre-Pose Face Blur:', session.anonymisedBeforePose ? `Verified (${session.blurMode} mode)` : 'Pending');
  addLine('Skeleton-Only Storage:', session.skeletonOnlyStored ? 'Enabled (zero facial features persisted)' : 'Disabled');
  addLine('Raw Video Retention:', '0 seconds (ephemeral local memory only)');
  addLine('Student PII Stored:', 'None (strictly anonymous zone aggregates)');

  doc.save(`${session.courseCode.replace(/\s+/g, '_')}_ClassSight_Report.pdf`);
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
