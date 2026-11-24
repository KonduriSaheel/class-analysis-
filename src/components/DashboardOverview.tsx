import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Brain,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { DashboardSection, SessionRecord } from '../types/classsight';
import { EngagementPulse, PrivacyPipelineMonitor } from './EngagementPulse';

interface DashboardOverviewProps {
  session: SessionRecord;
  allSessions: SessionRecord[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => Promise<void>;
  onNavigate: (section: DashboardSection) => void;
  onSessionUpdated: (updated: SessionRecord) => void;
}

export function DashboardOverview({
  session,
  allSessions,
  onSelectSession,
  onDeleteSession,
  onNavigate,
  onSessionUpdated,
}: DashboardOverviewProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [lastPayload, setLastPayload] = useState<Record<string, unknown> | null>(null);

  const distributionData = [
    { name: 'Attentive', value: session.attentivePct, color: '#3B82F6' },
    { name: 'Participating', value: session.participatingPct, color: '#22C55E' },
    { name: 'Distracted', value: session.distractedPct, color: '#F59E0B' },
    { name: 'Uncertain', value: session.uncertainPct, color: '#64748B' },
  ];

  const handleGenerateAISummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const resp = await fetch(`/api/sessions/${encodeURIComponent(session.id)}/ai-summary`, {
        method: 'POST',
      });
      const data = await resp.json();
      if (data.sanitizedStatsPayload) {
        setLastPayload(data.sanitizedStatsPayload);
      }
      if (!resp.ok) {
        setAiError(data.error || 'Could not generate AI summary.');
      } else if (data.aiSummary) {
        onSessionUpdated({ ...session, aiSummary: data.aiSummary });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error calling AI summary endpoint.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Origin Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#101827] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="font-semibold text-white">
            {session.courseCode} · {session.title}
          </span>
          <span aria-hidden="true">·</span>
          <span>{session.room}</span>
          <span aria-hidden="true">·</span>
          <span className={session.isDemoData ? 'text-amber-300' : 'text-[#22D3EE]'}>
            {session.modelLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('video')}
            className="rounded-lg bg-[#3B82F6] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Analyze New Video
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="rounded-lg border border-slate-700 bg-[#080D19] px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Overall Engagement</div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {session.overallScore}%
          </div>
          <div className="mt-1 text-xs text-[#22D3EE]">Weighted class index</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Attentive</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#3B82F6] tabular-nums">
            {session.attentivePct}%
          </div>
          <div className="mt-1 text-xs text-slate-400">Oriented to board</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Participating</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#22C55E] tabular-nums">
            {session.participatingPct}%
          </div>
          <div className="mt-1 text-xs text-slate-400">Raised-hand / active</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Distracted</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#F59E0B] tabular-nums">
            {session.distractedPct}%
          </div>
          <div className="mt-1 text-xs text-slate-400">Off-axis / slouch cues</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Students Detected</div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {session.studentsDetected}
          </div>
          <div className="mt-1 text-xs text-slate-400">Anonymous tracks only</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Processing FPS</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#22D3EE] tabular-nums">
            {session.sampleFps.toFixed(1)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {session.framesProcessed.toLocaleString()} frames sampled
          </div>
        </div>
      </div>

      {/* Engagement Pulse + Privacy Monitor */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <EngagementPulse
            score={session.overallScore}
            label={session.isDemoData ? 'Demonstration Dataset · No Live Camera' : 'Computed from Local CV Pipeline'}
            studentsDetected={session.studentsDetected}
            isLive={!session.isDemoData}
          />
        </div>
        <div className="lg:col-span-7">
          <PrivacyPipelineMonitor
            currentStage={6}
            blurMode={session.blurMode}
            anonymisedBeforePose={session.anonymisedBeforePose}
          />
        </div>
      </div>

      {/* Main Charts: Timeline + Distribution */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">Engagement Timeline</h3>
              <p className="text-xs text-slate-400">
                Overall engagement score and class state trends across session duration
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#22D3EE] hover:text-cyan-300 cursor-pointer"
            >
              <span>Detailed Analytics</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={session.timeline} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#080D19',
                    borderColor: 'rgba(148,163,184,0.2)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="overallScore"
                  name="Overall Score %"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="attentivePct"
                  name="Attentive %"
                  stroke="#22D3EE"
                  strokeWidth={1.6}
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="distractedPct"
                  name="Distracted %"
                  stroke="#F59E0B"
                  strokeWidth={1.6}
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="participatingPct"
                  name="Participating %"
                  stroke="#22C55E"
                  strokeWidth={1.6}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-4">
          <h3 className="text-base font-semibold text-white">Engagement Distribution</h3>
          <p className="text-xs text-slate-400">Attentive vs. Distracted vs. Participating share</p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical" margin={{ top: 8, right: 18, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#94A3B8" tick={{ fontSize: 12 }} width={86} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#080D19',
                    borderColor: 'rgba(148,163,184,0.2)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" name="Share %" radius={[0, 6, 6, 0]} barSize={22}>
                  {distributionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Session Summary + Smart Drop Alerts + Status */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-[#8B5CF6]" />
              <h3 className="text-base font-semibold text-white">AI Session Summary</h3>
            </div>
            <div className="flex items-center gap-2">
              {lastPayload && (
                <button
                  type="button"
                  onClick={() => setShowPayload((v) => !v)}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  {showPayload ? 'Hide Sanitized Payload' : 'Verify Sanitized Payload'}
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateAISummary}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-[#8B5CF6]/30 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{session.aiSummary ? 'Regenerate AI Summary' : 'Generate AI Summary'}</span>
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Generated strictly from anonymized numerical zone percentages—never video frames or
            student identities.
          </p>

          {aiError && (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              {aiError}
            </div>
          )}

          {session.aiSummary ? (
            <p className="mt-4 rounded-lg border border-slate-800 bg-[#080D19] p-4 text-sm leading-relaxed text-slate-200">
              {session.aiSummary}
            </p>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-[#080D19]/60 p-4 text-xs text-slate-400">
              No AI summary generated for this session yet. Click &ldquo;Generate AI Summary&rdquo;
              to synthesize pedagogical insights from aggregated metrics.
            </div>
          )}

          {showPayload && lastPayload && (
            <pre className="mt-3 max-h-44 overflow-auto rounded-lg border border-slate-800 bg-[#080D19] p-3 font-mono text-[11px] text-cyan-200">
              {JSON.stringify(lastPayload, null, 2)}
            </pre>
          )}
        </div>

        {/* Smart Engagement Alerts & System Status */}
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-5">
          <h3 className="text-base font-semibold text-white">Smart Engagement Alerts</h3>
          <div className="mt-3 space-y-2.5">
            {session.drops.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-[#080D19] p-3 text-xs text-slate-300">
                No severe engagement drops (&ge; 12 pts) detected in this session.
              </div>
            ) : (
              session.drops.map((drop) => (
                <div
                  key={drop.id}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-amber-300">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Drop at {drop.timeRange}</span>
                    </span>
                    <span className="font-mono tabular-nums">{drop.dropDelta} pts</span>
                  </div>
                  <p className="mt-1 text-slate-300">{drop.primaryCause}</p>
                  <div className="mt-1 text-[11px] text-slate-400">Zone: {drop.affectedZone}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t border-slate-800 pt-4 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Privacy Gate</span>
              <span className="inline-flex items-center gap-1 font-medium text-[#22C55E]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Pre-Pose Blur Verified</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Active Classifier</span>
              <span className="font-medium text-slate-200">{session.modelType.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Recent Sessions (SQLite Store)</h3>
            <p className="text-xs text-slate-400">
              Select any recorded or demonstration session to inspect timelines, heatmaps, and reports
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Course &amp; Session</th>
                <th className="py-2.5 pr-4 font-medium">Origin</th>
                <th className="py-2.5 pr-4 font-medium text-right">Subjects</th>
                <th className="py-2.5 pr-4 font-medium text-right">Engagement</th>
                <th className="py-2.5 pr-4 font-medium text-right">Attentive</th>
                <th className="py-2.5 pr-4 font-medium text-right">Participating</th>
                <th className="py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {allSessions.map((item) => {
                const isSelected = item.id === session.id;
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-[#3B82F6]/10' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 pr-4">
                      <button
                        type="button"
                        onClick={() => onSelectSession(item.id)}
                        className="text-left font-medium text-white hover:text-[#22D3EE] cursor-pointer"
                      >
                        {item.courseCode} · {item.title}
                      </button>
                      <div className="text-[11px] text-slate-400">{item.room}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">
                      {item.isDemoData ? 'Demonstration Data' : `CV (${item.sourceType})`}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-200">
                      {item.studentsDetected}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold text-white">
                      {item.overallScore}%
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[#3B82F6]">
                      {item.attentivePct}%
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[#22C55E]">
                      {item.participatingPct}%
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectSession(item.id)}
                          className="rounded border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-[#3B82F6] cursor-pointer"
                        >
                          {isSelected ? 'Active' : 'Inspect'}
                        </button>
                        {!item.isDemoData && (
                          <button
                            type="button"
                            onClick={() => onDeleteSession(item.id)}
                            title="Delete session"
                            className="rounded border border-slate-700 p-1 text-slate-400 hover:border-red-500/50 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
