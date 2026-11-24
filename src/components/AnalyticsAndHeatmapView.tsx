import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Lightbulb, ShieldCheck, Users } from 'lucide-react';
import type { SeatingZoneStat, SessionRecord } from '../types/classsight';

interface EngagementAnalyticsViewProps {
  session: SessionRecord;
}

export function EngagementAnalyticsView({ session }: EngagementAnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#22D3EE]">
              Module 4 · Classroom Engagement Analytics
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {session.courseCode} — Timeline, Comparisons &amp; Drop Detection
            </h2>
          </div>
          <div className="font-mono text-xs text-slate-400 tabular-nums">
            {session.isDemoData ? 'Demonstration Data' : 'Local CV Analysis'} · {session.framesProcessed.toLocaleString()} frames
          </div>
        </div>

        {/* Full Engagement Timeline */}
        <div className="mt-5 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={session.timeline} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="disFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
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
                stroke="#22D3EE"
                strokeWidth={2.4}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="attentivePct"
                name="Attentive %"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#attFill)"
              />
              <Area
                type="monotone"
                dataKey="distractedPct"
                name="Distracted %"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#disFill)"
              />
              <Area
                type="monotone"
                dataKey="participatingPct"
                name="Participating %"
                stroke="#22C55E"
                strokeWidth={2}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attentive vs Distracted Comparison + Drop Detection + Insights */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-6">
          <h3 className="text-base font-semibold text-white">
            Attentive vs. Distracted Interval Comparison
          </h3>
          <p className="text-xs text-slate-400">
            Side-by-side comparison of focus vs. distraction across time buckets
          </p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={session.timeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
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
                <Bar dataKey="attentivePct" name="Attentive %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="distractedPct" name="Distracted %" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-6">
          <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
            <h3 className="text-base font-semibold text-white">Engagement Drop Detection</h3>
            <p className="text-xs text-slate-400">
              Automatically flags intervals where overall class score drops by &ge; 12 points
            </p>
            <div className="mt-3 space-y-2.5">
              {session.drops.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-[#080D19] p-3 text-xs text-slate-300">
                  No significant engagement drops detected during this session.
                </div>
              ) : (
                session.drops.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-amber-300">
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{d.timeRange}</span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {d.previousScore}% → {d.lowestScore}% ({d.dropDelta} pts)
                      </span>
                    </div>
                    <p className="mt-1.5 text-slate-200">{d.primaryCause}</p>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Affected Area: {d.affectedZone}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[#22D3EE]" />
              <h3 className="text-base font-semibold text-white">Class-Level Insights</h3>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
              {session.insights.map((ins, i) => (
                <li key={i} className="rounded-lg border border-slate-800 bg-[#080D19] px-3.5 py-2.5">
                  {ins}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SeatingHeatmapViewProps {
  session: SessionRecord;
}

export function SeatingHeatmapView({ session }: SeatingHeatmapViewProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    session.seatingZones[0]?.zoneId ?? 'front-left'
  );

  const selectedZone =
    session.seatingZones.find((z) => z.zoneId === selectedZoneId) ?? session.seatingZones[0];

  const rows: Array<'Front Row' | 'Middle Row' | 'Back Row'> = [
    'Front Row',
    'Middle Row',
    'Back Row',
  ];

  // Seating Zone Intelligence: average per row
  const rowIntelligence = rows.map((rLabel) => {
    const rowZones = session.seatingZones.filter((z) => z.rowLabel === rLabel);
    const valid = rowZones.filter((z) => z.avgOccupancy > 0);
    const avg =
      valid.length > 0
        ? Math.round(valid.reduce((s, z) => s + z.avgEngagement, 0) / valid.length)
        : 0;
    return { rowLabel: rLabel, avgEngagement: avg };
  });

  const getZoneVisualStyle = (z: SeatingZoneStat) => {
    if (z.status === 'high') {
      return {
        border: 'border-[#3B82F6]',
        bg: 'bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30',
        text: 'text-blue-200',
        label: 'High Engagement',
      };
    }
    if (z.status === 'low') {
      return {
        border: 'border-[#F59E0B]',
        bg: 'bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30',
        text: 'text-amber-200',
        label: 'Low Engagement',
      };
    }
    return {
      border: 'border-slate-500',
      bg: 'bg-slate-600/25 hover:bg-slate-600/35',
      text: 'text-slate-300',
      label: 'Uncertain Data',
    };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Top-View Seating Layout */}
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-[#22D3EE]">
                Module 4B · Aggregated Spatial Heatmap
              </div>
              <h2 className="mt-1 text-lg font-semibold text-white">
                Top-View Classroom Seating Map
              </h2>
            </div>

            {/* Color System Legend (paired with explicit text labels) */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-blue-200">
                <span className="h-3 w-3 rounded-sm bg-[#3B82F6]" />
                <span>Blue = High Engagement</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-200">
                <span className="h-3 w-3 rounded-sm bg-[#F59E0B]" />
                <span>Orange = Low Engagement</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="h-3 w-3 rounded-sm bg-slate-500" />
                <span>Grey = Uncertain Data</span>
              </span>
            </div>
          </div>

          {/* Classroom Board */}
          <div className="mt-6 rounded-lg border border-cyan-500/40 bg-[#080D19] py-3 text-center text-xs font-semibold tracking-wide text-[#22D3EE]">
            CLASSROOM BOARD / INSTRUCTOR PODIUM
          </div>

          {/* 3 Rows x 2 Sides Grid */}
          <div className="mt-5 space-y-4">
            {rows.map((rowLabel) => {
              const left = session.seatingZones.find(
                (z) => z.rowLabel === rowLabel && z.sideLabel === 'Left Zone'
              );
              const right = session.seatingZones.find(
                (z) => z.rowLabel === rowLabel && z.sideLabel === 'Right Zone'
              );

              return (
                <div key={rowLabel} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[left, right].map((zone) => {
                    if (!zone) return null;
                    const style = getZoneVisualStyle(zone);
                    const isSelected = selectedZone?.zoneId === zone.zoneId;
                    return (
                      <button
                        key={zone.zoneId}
                        type="button"
                        onClick={() => setSelectedZoneId(zone.zoneId)}
                        className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${style.border} ${style.bg} ${
                          isSelected ? 'ring-2 ring-[#22D3EE] ring-offset-2 ring-offset-[#101827]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">
                            {zone.rowLabel} · {zone.sideLabel}
                          </span>
                          <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="font-mono text-2xl font-bold text-white tabular-nums">
                            {zone.avgOccupancy > 0 ? `${zone.avgEngagement}%` : '—'}
                          </span>
                          <span className="font-mono text-xs text-slate-300 tabular-nums">
                            ~{zone.avgOccupancy} subjects
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-300 font-mono tabular-nums">
                          <span>Att {zone.attentivePct}%</span>
                          <span>Part {zone.participatingPct}%</span>
                          <span>Dis {zone.distractedPct}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Zone Aggregated Inspector + Seating Zone Intelligence */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Aggregated Zone Statistics</h3>
              <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Zone-level summary only. Individual students are never isolated or named.
            </p>

            {selectedZone && (
              <div className="mt-4 space-y-3 border-t border-slate-800 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Selected Zone</span>
                  <span className="font-semibold text-white">
                    {selectedZone.rowLabel} · {selectedZone.sideLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Engagement Score</span>
                  <span className="font-mono text-base font-bold text-[#22D3EE] tabular-nums">
                    {selectedZone.avgEngagement}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Attentive Share</span>
                  <span className="font-mono tabular-nums text-[#3B82F6]">
                    {selectedZone.attentivePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Participating Share</span>
                  <span className="font-mono tabular-nums text-[#22C55E]">
                    {selectedZone.participatingPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Distracted Share</span>
                  <span className="font-mono tabular-nums text-[#F59E0B]">
                    {selectedZone.distractedPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Uncertain Frames</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {selectedZone.uncertainPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mean Anonymous Count</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-white">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedZone.avgOccupancy}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
            <h3 className="text-base font-semibold text-white">Seating Zone Intelligence</h3>
            <p className="mt-1 text-xs text-slate-400">
              Row-by-row engagement comparison across classroom depth
            </p>
            <div className="mt-4 space-y-3">
              {rowIntelligence.map((r) => (
                <div key={r.rowLabel}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{r.rowLabel}</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {r.avgEngagement}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#080D19]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${r.avgEngagement}%`,
                        backgroundColor: r.avgEngagement >= 70 ? '#3B82F6' : '#F59E0B',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
