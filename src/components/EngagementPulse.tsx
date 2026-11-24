import { motion } from 'motion/react';
import { Activity, CheckCircle2, EyeOff, Lock, ScanFace, ShieldCheck } from 'lucide-react';

interface EngagementPulseProps {
  score: number;
  label: string;
  studentsDetected: number;
  isLive?: boolean;
}

export function EngagementPulse({ score, label, studentsDetected, isLive = false }: EngagementPulseProps) {
  const pulseColor =
    score >= 75 ? '#3B82F6' : score >= 55 ? '#F59E0B' : '#EF4444';
  const statusLabel =
    score >= 75 ? 'High Momentum' : score >= 55 ? 'Moderate Focus' : 'Attention Dip';

  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#22D3EE]">
            Classroom Engagement Pulse {isLive ? '· Live Stream' : '· Session Aggregate'}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-white tabular-nums">{score}%</span>
            <span className="text-xs font-medium text-slate-300">
              {statusLabel} · {studentsDetected} anonymous subjects
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{label}</p>
        </div>

        {/* Animated Engagement Pulse Ring */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.15, 0.45] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: pulseColor }}
          />
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full border bg-[#080D19]"
            style={{ borderColor: pulseColor }}
          >
            <Activity className="h-5 w-5" style={{ color: pulseColor }} />
          </div>
        </div>
      </div>

      {/* Animated Waveform Bars */}
      <div className="mt-4 flex h-7 items-end gap-1.5" aria-hidden="true">
        {[0.45, 0.7, 0.85, 0.65, 0.92, 0.78, 0.58, 0.88, 0.95, 0.72, 0.64, 0.84, 0.76, 0.9].map(
          (factor, idx) => {
            const hPct = Math.max(20, Math.min(100, Math.round(score * factor)));
            return (
              <motion.div
                key={idx}
                animate={{ scaleY: [0.85, 1.05, 0.85] }}
                transition={{ duration: 1.6, delay: idx * 0.08, repeat: Infinity, ease: 'easeInOut' }}
                className="flex-1 origin-bottom rounded-sm"
                style={{
                  height: `${hPct}%`,
                  backgroundColor: pulseColor,
                  opacity: 0.45 + factor * 0.5,
                }}
              />
            );
          }
        )}
      </div>
    </div>
  );
}

interface PrivacyMonitorProps {
  currentStage: number; // 1..6
  blurMode: string;
  anonymisedBeforePose: boolean;
}

const SIX_STAGES = [
  '1. Frame Sample (5 FPS)',
  '2. Face Detection',
  '3. Pre-Pose Redaction',
  '4. Pose & Gaze Vectors',
  '5. Temporal Classifier',
  '6. Zone Aggregation',
];

export function PrivacyPipelineMonitor({
  currentStage,
  blurMode,
  anonymisedBeforePose,
}: PrivacyMonitorProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
          <span className="text-sm font-semibold text-white">
            Privacy-First Processing Monitor
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5 text-[#22D3EE]" />
            <span>Pre-Pose Blur: {anonymisedBeforePose ? `Verified (${blurMode})` : 'Enforced'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#22C55E]" />
            <span>0s Raw Retention</span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {SIX_STAGES.map((stageLabel, idx) => {
          const stepNum = idx + 1;
          const completed = currentStage >= stepNum;
          const active = currentStage === stepNum;
          return (
            <div
              key={stageLabel}
              className={`rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                active
                  ? 'border-[#22D3EE] bg-[#22D3EE]/10 text-white'
                  : completed
                    ? 'border-[#3B82F6]/40 bg-[#080D19] text-slate-200'
                    : 'border-slate-800 bg-[#080D19]/60 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] tabular-nums">0{stepNum}</span>
                {completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
                ) : (
                  <ScanFace className="h-3.5 w-3.5 text-slate-600" />
                )}
              </div>
              <div className="mt-1.5 font-medium leading-snug">{stageLabel.replace(/^\d+\.\s/, '')}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
