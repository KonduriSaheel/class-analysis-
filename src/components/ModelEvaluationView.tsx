import { useState } from 'react';
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import type { EvaluationResult, FrameLabelComparison, ModelType } from '../types/classsight';

interface ModelEvaluationViewProps {
  runs: EvaluationResult[];
  onRunCreated: (newRun: EvaluationResult) => void;
}

const LABELS: Array<'Attentive' | 'Distracted' | 'Participating'> = [
  'Attentive',
  'Distracted',
  'Participating',
];

export function ModelEvaluationView({ runs, onRunCreated }: ModelEvaluationViewProps) {
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id ?? '');
  const [datasetTitle, setDatasetTitle] = useState('Faculty-Annotated 10-Clip Benchmark');
  const [evalModelType, setEvalModelType] = useState<ModelType>('lstm');
  const [runningEval, setRunningEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [editableClips, setEditableClips] = useState<FrameLabelComparison[]>(
    runs[0]?.comparisons ?? []
  );

  const activeRun = runs.find((r) => r.id === selectedRunId) ?? runs[0];

  const handleSelectRun = (run: EvaluationResult) => {
    setSelectedRunId(run.id);
    setEditableClips(run.comparisons);
  };

  const handleToggleClipLabel = (clipId: string, nextPredicted: 'Attentive' | 'Distracted' | 'Participating') => {
    setEditableClips((prev) =>
      prev.map((c) =>
        c.clipId === clipId
          ? { ...c, predictedLabel: nextPredicted, match: c.annotatedLabel === nextPredicted }
          : c
      )
    );
  };

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvalError(null);
    if (!datasetTitle.trim()) {
      setEvalError('Please enter a dataset label.');
      return;
    }
    setRunningEval(true);
    try {
      const resp = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: datasetTitle.trim(),
          modelType: evalModelType,
          comparisons: editableClips,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setEvalError(data.error || 'Evaluation run failed.');
      } else if (data.run) {
        onRunCreated(data.run);
        setSelectedRunId(data.run.id);
      }
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Network error running evaluation.');
    } finally {
      setRunningEval(false);
    }
  };

  if (!activeRun) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-6 text-sm text-slate-300">
        No evaluation runs available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Run Switcher & Origin Clarity */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs font-medium text-[#22D3EE]">
              Module 5 · Model Evaluation &amp; Validation
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">{activeRun.modelName}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {activeRun.datasetName} ·{' '}
              <span className={activeRun.isIllustrative ? 'text-amber-300' : 'text-[#22C55E]'}>
                {activeRun.isIllustrative
                  ? 'Illustrative Validation Benchmark'
                  : 'Computed Live via Server Confusion Matrix'}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => handleSelectRun(run)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  activeRun.id === run.id
                    ? 'border-[#3B82F6] bg-[#3B82F6]/20 text-white'
                    : 'border-slate-700 bg-[#080D19] text-slate-300 hover:border-slate-500'
                }`}
              >
                {run.modelType.toUpperCase()} · {(run.accuracy * 100).toFixed(1)}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5 Top Evaluation Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Accuracy</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
            {(activeRun.accuracy * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Macro Precision</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#3B82F6] tabular-nums">
            {activeRun.macroPrecision.toFixed(3)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Macro Recall</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#22D3EE] tabular-nums">
            {activeRun.macroRecall.toFixed(3)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Macro F1-Score</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#22C55E] tabular-nums">
            {activeRun.macroF1.toFixed(3)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-4">
          <div className="text-xs text-slate-400">Cohen&apos;s Kappa</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#8B5CF6] tabular-nums">
            {activeRun.cohensKappa.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Confusion Matrix + Per-Class Metrics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-6">
          <h3 className="text-base font-semibold text-white">3×3 Confusion Matrix</h3>
          <p className="text-xs text-slate-400">
            Rows = Human-Annotated Ground Truth · Columns = Model Predictions
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-slate-400">Actual \ Predicted</th>
                  {LABELS.map((lbl) => (
                    <th key={lbl} className="p-2 font-medium text-slate-300">
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LABELS.map((actual) => (
                  <tr key={actual}>
                    <td className="p-2 text-left font-medium text-slate-300">{actual}</td>
                    {LABELS.map((predicted) => {
                      const cell = activeRun.confusionMatrix.find(
                        (c) => c.actual === actual && c.predicted === predicted
                      );
                      const val = cell?.count ?? 0;
                      const isDiag = actual === predicted;
                      return (
                        <td key={predicted} className="p-1.5">
                          <div
                            className={`rounded-lg border py-3 font-mono text-sm font-semibold tabular-nums ${
                              isDiag
                                ? 'border-[#3B82F6]/50 bg-[#3B82F6]/20 text-white'
                                : val > 0
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                  : 'border-slate-800 bg-[#080D19] text-slate-500'
                            }`}
                          >
                            {val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-6">
          <h3 className="text-base font-semibold text-white">Per-Class Performance Metrics</h3>
          <p className="text-xs text-slate-400">
            Precision, Recall, F1-score, and annotated support counts ({activeRun.totalSamples} samples)
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-4 font-medium">Class</th>
                  <th className="py-2 pr-4 text-right font-medium">Precision</th>
                  <th className="py-2 pr-4 text-right font-medium">Recall</th>
                  <th className="py-2 pr-4 text-right font-medium">F1-Score</th>
                  <th className="py-2 text-right font-medium">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                {activeRun.perClass.map((row) => (
                  <tr key={row.label}>
                    <td className="py-3 pr-4 font-sans font-semibold text-white">{row.label}</td>
                    <td className="py-3 pr-4 text-right text-slate-200">{row.precision.toFixed(3)}</td>
                    <td className="py-3 pr-4 text-right text-slate-200">{row.recall.toFixed(3)}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-[#22D3EE]">
                      {row.f1Score.toFixed(3)}
                    </td>
                    <td className="py-3 text-right text-slate-400">{row.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Dataset Evaluation Interface */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h3 className="text-base font-semibold text-white">
              Annotated vs. Predicted Clip Evaluator
            </h3>
            <p className="text-xs text-slate-400">
              Inspect or test predicted labels against human-annotated classroom clips and recompute
              server-side Confusion Matrix &amp; Cohen&apos;s Kappa.
            </p>
          </div>

          <form onSubmit={handleRunEvaluation} className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={datasetTitle}
              onChange={(e) => setDatasetTitle(e.target.value)}
              placeholder="Evaluation dataset name"
              className="rounded-lg border border-slate-700 bg-[#080D19] px-3 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
            />
            <select
              value={evalModelType}
              onChange={(e) => setEvalModelType(e.target.value as ModelType)}
              className="rounded-lg border border-slate-700 bg-[#080D19] px-3 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
            >
              <option value="baseline">Baseline Classifier</option>
              <option value="lstm">Temporal LSTM Model</option>
            </select>
            <button
              type="submit"
              disabled={runningEval}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {runningEval ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              <span>Compute Evaluation Run</span>
            </button>
          </form>
        </div>

        {evalError && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            {evalError}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-medium">Clip ID</th>
                <th className="py-2 pr-3 font-medium">Timestamp</th>
                <th className="py-2 pr-3 font-medium">Human Annotated</th>
                <th className="py-2 pr-3 font-medium">Model Predicted (Editable Test)</th>
                <th className="py-2 pr-3 text-right font-medium">Head Yaw</th>
                <th className="py-2 pr-3 text-right font-medium">Confidence</th>
                <th className="py-2 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {editableClips.map((clip) => (
                <tr key={clip.clipId}>
                  <td className="py-2.5 pr-3 font-mono text-white">{clip.clipId}</td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-400">
                    {clip.timestampLabel}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-slate-200">{clip.annotatedLabel}</td>
                  <td className="py-2.5 pr-3">
                    <select
                      value={clip.predictedLabel}
                      onChange={(e) =>
                        handleToggleClipLabel(
                          clip.clipId,
                          e.target.value as 'Attentive' | 'Distracted' | 'Participating'
                        )
                      }
                      className="rounded border border-slate-700 bg-[#080D19] px-2 py-1 text-xs text-white"
                    >
                      {LABELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                    {clip.headYawDeg}°
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                    {Math.round(clip.confidence * 100)}%
                  </td>
                  <td className="py-2.5 text-right">
                    {clip.match ? (
                      <span className="inline-flex items-center gap-1 text-[#22C55E]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Match</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Mismatch</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
