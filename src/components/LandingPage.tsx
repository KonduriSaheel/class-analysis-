import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  EyeOff,
  Lock,
  ScanFace,
  ShieldCheck,
  Video,
} from 'lucide-react';
import type { DashboardSection } from '../types/classsight';

interface LandingPageProps {
  onLaunchDashboard: (initialSection?: DashboardSection) => void;
}

const PIPELINE_STEPS = [
  {
    id: 'video',
    index: '01',
    title: 'Video Ingestion',
    subtitle: '5 FPS Local Sampling',
    detail: 'Classroom video or webcam frames are sampled locally in browser memory at 5 FPS. Original frames never touch disk or external APIs.',
    icon: Video,
    accent: '#3B82F6',
  },
  {
    id: 'blur',
    index: '02',
    title: 'Face Anonymisation',
    subtitle: 'Pre-Pose Redaction',
    detail: 'BlazeFace detects every facial region and applies Gaussian blur before any downstream model reads the frame.',
    icon: EyeOff,
    accent: '#22D3EE',
  },
  {
    id: 'pose',
    index: '03',
    title: 'Pose Estimation',
    subtitle: '33-Point Skeletons',
    detail: 'MediaPipe Pose extracts head yaw/pitch/roll, approximate gaze vector, torso slouch, and raised-hand cues from blurred frames only.',
    icon: ScanFace,
    accent: '#8B5CF6',
  },
  {
    id: 'classify',
    index: '04',
    title: 'AI Classification',
    subtitle: 'Baseline & LSTM',
    detail: '10-frame sliding windows classify Attentive, Distracted, and Participating states with explicit uncertainty thresholds.',
    icon: Brain,
    accent: '#22C55E',
  },
  {
    id: 'analytics',
    index: '05',
    title: 'Analytics & Heatmaps',
    subtitle: 'Aggregated Only',
    detail: 'Outputs timelines, drop alerts, and front/middle/back seating zone heatmaps—zero student names or biometric IDs.',
    icon: BarChart3,
    accent: '#3B82F6',
  },
];

export function LandingPage({ onLaunchDashboard }: LandingPageProps) {
  const [activeStage, setActiveStage] = useState(1);

  return (
    <div className="min-h-screen bg-[#080D19] text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080D19]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/40 text-[#22D3EE]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>ClassSight AI</span>
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#pipeline" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Architecture
            </a>
            <a href="#privacy" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Privacy
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Analytics
            </a>
            <a href="#stack" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Stack
            </a>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onLaunchDashboard('overview')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="top">
        <section className="mx-auto max-w-7xl px-6 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-between lg:col-span-6">
              <div>
                <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
                  Computer Vision · Privacy-Preserving Classroom Analytics
                </p>
                <h1
                  className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl"
                  style={{ textWrap: 'balance', lineHeight: 1.08 }}
                >
                  Understand Classroom Engagement Without Compromising Privacy.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
                  Understand Your Classroom. Protect Every Identity. ClassSight AI samples
                  classroom feeds at 5 FPS, blurs faces before pose estimation, and converts
                  anonymous body kinematics into engagement timelines, seating heatmaps, and
                  pedagogical reports.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onLaunchDashboard('overview')}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Open Teacher Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchDashboard('video')}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#101827] px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Try Video &amp; Blur Lab</span>
                  </button>
                </div>
              </div>

              {/* Clean unboxed proof metadata strip */}
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-800/80 pt-6">
                <div>
                  <div className="font-mono text-2xl font-semibold text-white tabular-nums">0 sec</div>
                  <div className="mt-1 text-xs text-slate-400">Raw video retention</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-[#22D3EE] tabular-nums">5 FPS</div>
                  <div className="mt-1 text-xs text-slate-400">Pre-pose blurred sampling</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-white tabular-nums">3 Classes</div>
                  <div className="mt-1 text-xs text-slate-400">Attentive · Distracted · Active</div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[340px] overflow-hidden rounded-xl border border-slate-800 bg-[#101827]">
                <img
                  src="/src/assets/images/hero_classroom_vision_1795436914632.jpg"
                  alt="University lecture hall monitored with privacy-preserving computer vision overlays"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080D19] via-[#080D19]/35 to-transparent" />

                {/* Subtle CV Anonymisation Grid Overlay */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
                  viewBox="0 0 640 360"
                  aria-hidden="true"
                >
                  <g stroke="#22D3EE" strokeWidth="1.2" fill="none">
                    <rect x="115" y="215" width="38" height="38" rx="6" strokeDasharray="4 3" />
                    <rect x="275" y="220" width="38" height="38" rx="6" strokeDasharray="4 3" />
                    <rect x="348" y="205" width="36" height="36" rx="6" strokeDasharray="4 3" />
                  </g>
                  <g stroke="#3B82F6" strokeWidth="1.6" fill="none">
                    <path d="M134 256 L134 295 M112 272 L156 272" />
                    <path d="M294 260 L294 300 M272 278 L316 278" />
                    <path d="M366 244 L366 284 M346 262 L386 262" />
                  </g>
                </svg>

                <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-[#22D3EE]">
                      Pre-Pose Anonymisation Active
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      Faces redacted locally before skeleton extraction
                    </div>
                  </div>
                  <div className="font-mono text-xs text-slate-300 tabular-nums">
                    Zone Aggregation · No Student IDs
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Animated 5-Stage Pipeline Section */}
        <section id="pipeline" className="border-t border-slate-800/80 bg-[#0B1221] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-medium text-[#22D3EE]">How It Works</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  End-to-End Privacy-First Computer Vision Pipeline
                </h2>
              </div>
              <p className="max-w-md text-sm text-slate-400">
                Click any stage to inspect how raw classroom pixels are discarded before pose
                vectors or temporal engagement classifications are computed.
              </p>
            </div>

            {/* Interactive Pipeline Flow */}
            <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-5">
              {PIPELINE_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStage === idx;
                return (
                  <motion.button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStage(idx)}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.16 }}
                    className={`group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[#3B82F6] bg-[#101827]'
                        : 'border-slate-800 bg-[#080D19]/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-400 tabular-nums">
                          {step.index}
                        </span>
                        <Icon
                          className="h-5 w-5"
                          style={{ color: isActive ? step.accent : '#64748B' }}
                        />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-xs font-medium text-[#22D3EE]">{step.subtitle}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                      {idx < PIPELINE_STEPS.length - 1
                        ? `Feeds Stage 0${idx + 2}`
                        : 'Feeds Teacher Dashboard'}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Active Stage Detail Bar */}
            <div className="mt-6 rounded-xl border border-slate-800 bg-[#101827] p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="text-xs font-medium text-[#22D3EE]">
                    Stage {PIPELINE_STEPS[activeStage].index} · {PIPELINE_STEPS[activeStage].subtitle}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {PIPELINE_STEPS[activeStage].title}
                  </div>
                  <p className="mt-1.5 max-w-3xl text-sm text-slate-300">
                    {PIPELINE_STEPS[activeStage].detail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchDashboard('video')}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-[#3B82F6]/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Inspect Live Pipeline</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Asymmetric Bento Grid */}
        <section id="capabilities" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#22D3EE]">Core Capabilities</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Built for Real Classroom Pedagogy and Rigorous Model Evaluation
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-[#101827] p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  01. Dual-Panel Anonymisation &amp; Skeleton-Only Telemetry
                </h3>
                <EyeOff className="h-5 w-5 text-[#22D3EE]" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Compare local preview, blurred video, and pure 33-keypoint skeleton outputs side by
                side. Extract head yaw, pitch, roll, approximate gaze orientation, torso slouch, and
                raised-hand cues without storing a single recognizable face.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
                <div>
                  <span className="font-semibold text-white">Gaussian / Pixelate</span>
                  <p className="mt-0.5">Configurable pre-pose redaction</p>
                </div>
                <div>
                  <span className="font-semibold text-white">Head &amp; Gaze Vector</span>
                  <p className="mt-0.5">Clearly labeled proxy estimate</p>
                </div>
                <div>
                  <span className="font-semibold text-white">Raised-Hand Cue</span>
                  <p className="mt-0.5">Wrist-above-shoulder detection</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#101827] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  02. Classroom Engagement Pulse
                </h3>
                <Activity className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Track class-wide momentum over time with automatic Engagement Drop Detection
                highlighting significant dips and affected seating zones.
              </p>
              <button
                type="button"
                onClick={() => onLaunchDashboard('analytics')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#22D3EE] hover:text-cyan-300 cursor-pointer"
              >
                <span>Open Analytics View</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#101827] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  03. Zone-Aggregated Seating Heatmap
                </h3>
                <BarChart3 className="h-5 w-5 text-[#8B5CF6]" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Inspect Front, Middle, and Back rows split by Left and Right zones. High engagement
                renders Blue, low engagement Orange, and occluded/uncertain areas Grey.
              </p>
              <button
                type="button"
                onClick={() => onLaunchDashboard('heatmap')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#22D3EE] hover:text-cyan-300 cursor-pointer"
              >
                <span>Explore Seating Map</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#101827] p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  04. Transparent Baseline vs. Temporal LSTM Evaluation
                </h3>
                <Brain className="h-5 w-5 text-[#22C55E]" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Evaluate model predictions against human-annotated clips using Accuracy, Macro
                F1-score, Confusion Matrix, Per-Class Precision/Recall, and Cohen&apos;s Kappa.
                Demonstration data, baseline classifiers, and prototype LSTM weights are always
                distinguished transparently.
              </p>
              <button
                type="button"
                onClick={() => onLaunchDashboard('evaluation')}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#22D3EE] hover:text-cyan-300 cursor-pointer"
              >
                <span>View Model Evaluation</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Privacy-First Architecture Guarantee */}
        <section id="privacy" className="border-y border-slate-800/80 bg-[#0B1221] py-16">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium text-[#22D3EE]">Privacy-First Architecture</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Strict Architectural Safeguards Built Into Every Frame
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Unlike surveillance dashboards that upload classroom footage to cloud vision APIs,
                ClassSight AI enforces local pre-pose redaction and drops raw frames immediately
                from memory.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
                  <span>
                    Face detection and Gaussian blur run locally before pose estimation begins.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
                  <span>
                    Original identifiable classroom frames are never sent to Gemini or external AI
                    services.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
                  <span>
                    Zero student names, zero facial embeddings, and 0-second raw video retention.
                  </span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-800 bg-[#101827] p-6">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <Lock className="h-4 w-4 text-[#22D3EE]" />
                  <span>Data Firewall Boundary</span>
                </div>
                <div className="mt-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-400">Raw Frame Buffer</span>
                    <span className="text-amber-400">Local RAM Only (0s disk)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-400">Pose Input Source</span>
                    <span className="text-[#22D3EE]">Blurred Canvas Verified</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-400">SQLite Persistence</span>
                    <span className="text-[#22C55E]">Zone Aggregates Only</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">AI Summary Payload</span>
                    <span className="text-[#22C55E]">Numeric Percentages Only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section id="stack" className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-medium text-[#22D3EE]">Engineering Stack</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Full-Stack Web + Computer Vision Architecture
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onLaunchDashboard('overview')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Launch ClassSight AI</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <div className="text-xs font-medium text-[#22D3EE]">Frontend Interface</div>
              <div className="mt-2 text-base font-semibold text-white">React + TypeScript</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts, and jsPDF report export.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <div className="text-xs font-medium text-[#22D3EE]">Computer Vision</div>
              <div className="mt-2 text-base font-semibold text-white">MediaPipe &amp; OpenCV</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                BlazeFace redaction, 33-point PoseLandmarker, 5 FPS sampling, and skeleton canvas.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <div className="text-xs font-medium text-[#22D3EE]">Engagement AI</div>
              <div className="mt-2 text-base font-semibold text-white">Baseline &amp; LSTM</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                10-frame sliding temporal windows, Scikit-learn metrics, and PyTorch LSTM design.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <div className="text-xs font-medium text-[#22D3EE]">Backend &amp; Storage</div>
              <div className="mt-2 text-base font-semibold text-white">Express, FastAPI &amp; SQLite</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Local SQLite persistence plus included Python FastAPI CV service in /backend/.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080D19] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">ClassSight AI</span> · Privacy-Preserving
            Classroom Engagement Analytics · Understand Your Classroom. Protect Every Identity.
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => onLaunchDashboard('overview')}
              className="hover:text-white cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onLaunchDashboard('video')}
              className="hover:text-white cursor-pointer"
            >
              Video Lab
            </button>
            <button
              type="button"
              onClick={() => onLaunchDashboard('evaluation')}
              className="hover:text-white cursor-pointer"
            >
              Evaluation
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
