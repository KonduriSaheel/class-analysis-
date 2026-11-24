import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Server,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { downloadSessionCSV, downloadSessionPDF } from '../utils/reportExport';
import type {
  BlurMode,
  EvaluationResult,
  PrivacyAuditEntry,
  PrivacySettings,
  SessionRecord,
} from '../types/classsight';

interface ReportsViewProps {
  session: SessionRecord;
  evaluation?: EvaluationResult;
}

export function ReportsView({ session, evaluation }: ReportsViewProps) {
  const [downloadedMsg, setDownloadedMsg] = useState<string | null>(null);

  const handlePDF = () => {
    downloadSessionPDF(session, evaluation);
    setDownloadedMsg(`Exported PDF report for ${session.courseCode}.`);
  };

  const handleCSV = () => {
    downloadSessionCSV(session);
    setDownloadedMsg(`Exported CSV analytics for ${session.courseCode}.`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-medium text-[#22D3EE]">Report Generation</div>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Export Classroom Engagement &amp; Privacy Compliance Reports
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Includes class details, duration, distribution, timeline, seating heatmap, model
              evaluation, and privacy summary.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#080D19] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-[#22D3EE] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#22D3EE]" />
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePDF}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>

        {downloadedMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
            <span>{downloadedMsg}</span>
          </div>
        )}
      </div>

      {/* Report Layout Preview */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#22D3EE]">
              <FileText className="h-4 w-4" />
              <span>Formatted Report Preview</span>
            </div>
            <h3 className="mt-2 text-xl font-bold text-white">
              {session.courseCode} — {session.title}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Room: {session.room} · Duration: {Math.floor(session.durationSec / 60)}m{' '}
              {session.durationSec % 60}s · Model: {session.modelLabel}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Overall Engagement</div>
            <div className="font-mono text-3xl font-bold text-white tabular-nums">
              {session.overallScore}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-white">Engagement Distribution</h4>
            <div className="mt-3 space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="font-sans text-slate-300">Attentive</span>
                <span className="text-[#3B82F6]">{session.attentivePct}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="font-sans text-slate-300">Participating</span>
                <span className="text-[#22C55E]">{session.participatingPct}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="font-sans text-slate-300">Distracted</span>
                <span className="text-[#F59E0B]">{session.distractedPct}%</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="font-sans text-slate-300">Uncertain</span>
                <span className="text-slate-400">{session.uncertainPct}%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Privacy Processing Summary</h4>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-300">Pre-Pose Face Blur</span>
                <span className="font-semibold text-[#22C55E]">
                  Verified ({session.blurMode})
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-300">Skeleton-Only Mode</span>
                <span className="font-semibold text-slate-200">
                  {session.skeletonOnlyStored ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-300">Raw Video Retention</span>
                <span className="font-mono text-[#22D3EE]">0 seconds</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-300">Identities Stored</span>
                <span className="font-semibold text-slate-200">None (Zone Aggregates Only)</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Seating Heatmap Zone Breakdown</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {session.seatingZones.map((z) => (
              <div
                key={z.zoneId}
                className="rounded-lg border border-slate-800 bg-[#080D19] p-3 text-xs"
              >
                <div className="font-medium text-white">
                  {z.rowLabel} · {z.sideLabel}
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[#22D3EE] tabular-nums">
                  {z.avgEngagement}%
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Att {z.attentivePct}% · Part {z.participatingPct}% · Dis {z.distractedPct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {evaluation && (
          <div className="border-t border-slate-800 pt-4 text-xs text-slate-300">
            <span className="font-semibold text-white">Linked Model Evaluation: </span>
            {evaluation.modelName} — Accuracy {(evaluation.accuracy * 100).toFixed(1)}% · Macro F1{' '}
            {evaluation.macroF1.toFixed(3)} · Cohen&apos;s Kappa {evaluation.cohensKappa.toFixed(3)}
          </div>
        )}
      </div>
    </div>
  );
}

interface PrivacySettingsViewProps {
  settings: PrivacySettings;
  auditLog: PrivacyAuditEntry[];
  pythonConnected: boolean;
  onUpdateSettings: (next: Partial<PrivacySettings>) => Promise<void>;
  onPurgeUserSessions: () => Promise<number>;
}

export function PrivacySettingsView({
  settings,
  auditLog,
  pythonConnected,
  onUpdateSettings,
  onPurgeUserSessions,
}: PrivacySettingsViewProps) {
  const [instructor, setInstructor] = useState(settings.consentInstructor);
  const [courseRef, setCourseRef] = useState(settings.consentCourseRef);
  const [consentChecked, setConsentChecked] = useState(settings.consentConfirmed);
  const [pythonUrl, setPythonUrl] = useState(settings.pythonBackendUrl);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    if (!instructor.trim() || !courseRef.trim()) {
      setErrorMsg('Instructor name and course reference are required.');
      return;
    }
    try {
      await onUpdateSettings({
        consentInstructor: instructor.trim(),
        consentCourseRef: courseRef.trim(),
        consentConfirmed: consentChecked,
        pythonBackendUrl: pythonUrl.trim(),
      });
      setStatusMsg('Privacy settings and recording consent confirmation updated in SQLite.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save privacy settings.');
    }
  };

  const handlePurge = async () => {
    const count = await onPurgeUserSessions();
    setStatusMsg(`Purged ${count} custom recorded session(s) from SQLite. Demonstration datasets retained.`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Core Privacy Controls */}
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-6">
          <div className="flex items-center gap-2 text-xs font-medium text-[#22D3EE]">
            <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
            <span>Architectural Privacy Controls</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Anonymisation &amp; Retention Policies
          </h2>

          <div className="mt-5 space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#080D19] p-3.5">
              <div>
                <div className="font-semibold text-white">Pre-Pose Face Anonymisation</div>
                <div className="mt-0.5 text-slate-400">
                  Locked ON. Faces are always blurred before PoseLandmarker runs.
                </div>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-[#22C55E]">
                <Lock className="h-3.5 w-3.5" />
                <span>Enforced</span>
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#080D19] p-3.5">
              <div className="font-semibold text-white">Blur / Redaction Mode</div>
              <div className="mt-2.5 flex items-center gap-2">
                {(['gaussian', 'pixelate', 'solid'] as BlurMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onUpdateSettings({ blurMode: m })}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                      settings.blurMode === m
                        ? 'border-[#22D3EE] bg-[#22D3EE]/15 text-[#22D3EE]'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#080D19] p-3.5">
              <div>
                <div className="font-semibold text-white">Skeleton-Only Output Mode</div>
                <div className="mt-0.5 text-slate-400">
                  Discard video pixels and retain only anonymous kinematic summaries.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ skeletonOnlyMode: !settings.skeletonOnlyMode })}
                className={`rounded-md px-3 py-1.5 font-semibold cursor-pointer ${
                  settings.skeletonOnlyMode
                    ? 'bg-[#3B82F6] text-white'
                    : 'border border-slate-700 text-slate-300'
                }`}
              >
                {settings.skeletonOnlyMode ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#080D19] p-3.5">
              <div>
                <div className="font-semibold text-white">Raw Video Retention</div>
                <div className="mt-0.5 text-slate-400">
                  Frames are discarded immediately after pose vectors are extracted.
                </div>
              </div>
              <span className="font-mono font-semibold text-[#22D3EE]">0 seconds</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-3.5">
              <div>
                <div className="font-semibold text-red-200">Delete Custom Session Data</div>
                <div className="mt-0.5 text-red-300/80">
                  Removes all user-analyzed classroom sessions from local SQLite.
                </div>
              </div>
              <button
                type="button"
                onClick={handlePurge}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/50 bg-red-500/20 px-3 py-1.5 font-semibold text-red-200 hover:bg-red-500/30 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Consent Confirmation & Python FastAPI Bridge */}
        <div className="space-y-5 lg:col-span-6">
          <form
            onSubmit={handleSaveConsent}
            className="rounded-xl border border-slate-800 bg-[#101827] p-5 space-y-4 text-xs"
          >
            <h3 className="text-base font-semibold text-white">
              Recording Consent &amp; Backend Configuration
            </h3>

            <div>
              <label className="block text-slate-300">Faculty / Instructor Name</label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 text-white focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300">Course &amp; Institutional Reference</label>
              <input
                type="text"
                value={courseRef}
                onChange={(e) => setCourseRef(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 text-white focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-[#080D19] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 accent-[#22C55E]"
              />
              <span className="text-slate-300 leading-relaxed">
                I confirm classroom participants have been notified of privacy-preserving analytics
                and that zero personally identifiable faces or student names will be stored.
              </span>
            </label>

            <div>
              <label className="block text-slate-300">
                Optional Python FastAPI CV Backend URL
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="url"
                  value={pythonUrl}
                  onChange={(e) => setPythonUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 font-mono text-white focus:border-[#3B82F6] focus:outline-none"
                />
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 font-medium ${
                    pythonConnected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-[#22C55E]'
                      : 'border-slate-700 bg-[#080D19] text-slate-400'
                  }`}
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>{pythonConnected ? 'Connected' : 'Browser WASM Active'}</span>
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Run <code className="text-cyan-300">uvicorn main:app --port 8000</code> inside{' '}
                <code className="text-cyan-300">/backend</code> to enable optional server-side
                OpenCV + PyTorch LSTM inference.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
                {errorMsg}
              </div>
            )}
            {statusMsg && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-200">
                {statusMsg}
              </div>
            )}

            <button
              type="submit"
              className="rounded-lg bg-[#3B82F6] px-4 py-2 font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              Save Privacy &amp; Consent Settings
            </button>
          </form>
        </div>
      </div>

      {/* Privacy Audit Log */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <h3 className="text-base font-semibold text-white">Privacy Audit Log (SQLite)</h3>
        <p className="text-xs text-slate-400">
          Immutable log of anonymisation verifications, setting updates, and data purges
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4 font-medium">Timestamp</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 pr-4 font-medium">Details</th>
                <th className="py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {auditLog.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-white">{entry.eventType}</td>
                  <td className="py-2.5 pr-4 text-slate-300">{entry.details}</td>
                  <td className="py-2.5 text-right font-semibold text-[#22C55E]">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
