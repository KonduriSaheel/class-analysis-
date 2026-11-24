import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  EyeOff,
  Loader2,
  Pause,
  Play,
  Save,
  ScanFace,
  ShieldCheck,
  Square,
  Upload,
  Video,
} from 'lucide-react';
import { sharedCVEngine } from '../cv/cvEngine';
import { buildSessionFromFrames } from '../utils/sessionBuilder';
import type {
  BlurMode,
  DashboardSection,
  ModelType,
  PipelineFrameResult,
  PrivacySettings,
  SessionRecord,
} from '../types/classsight';
import { EngagementPulse, PrivacyPipelineMonitor } from './EngagementPulse';

interface VideoPipelineViewProps {
  activeTab: Extract<DashboardSection, 'live' | 'video' | 'anonymisation' | 'pose'>;
  privacySettings: PrivacySettings;
  onUpdatePrivacy: (updates: Partial<PrivacySettings>) => Promise<void>;
  onSaveSession: (session: SessionRecord) => Promise<void>;
}

const DEMO_FEED_SRC = '/src/assets/images/demo_classroom_feed_1795436913738.jpg';

export function VideoPipelineView({
  activeTab,
  privacySettings,
  onUpdatePrivacy,
  onSaveSession,
}: VideoPipelineViewProps) {
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const anonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const skelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElemRef = useRef<HTMLVideoElement | null>(null);
  const demoImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const frameIndexRef = useRef(0);
  const framesBufferRef = useRef<PipelineFrameResult[]>([]);

  const [sourceType, setSourceType] = useState<'demo' | 'upload' | 'webcam'>('demo');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [modelType, setModelType] = useState<ModelType>('baseline');
  const [engineStatus, setEngineStatus] = useState<{ ready: boolean; label: string }>({
    ready: false,
    label: 'Initializing MediaPipe Tasks Vision...',
  });
  const [runState, setRunState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [pipelineStage, setPipelineStage] = useState<number>(1);
  const [latestFrame, setLatestFrame] = useState<PipelineFrameResult | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<
    Array<{ frame: number; time: string; score: number; att: number; dis: number; part: number; unc: number }>
  >([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Save session form
  const [courseCode, setCourseCode] = useState('CS-401');
  const [sessionTitle, setSessionTitle] = useState('Recorded Lecture Engagement Scan');
  const [roomName, setRoomName] = useState('Seminar Room 204');
  const [saving, setSaving] = useState(false);

  // Initialize MediaPipe & preload demo classroom image
  useEffect(() => {
    let mounted = true;
    sharedCVEngine.init().then((status) => {
      if (mounted) setEngineStatus(status);
    });

    const img = new Image();
    img.src = DEMO_FEED_SRC;
    img.onload = () => {
      demoImgRef.current = img;
      // Run one initial preview frame so the 3 panels aren't blank on arrival
      if (mounted && rawCanvasRef.current && anonCanvasRef.current && skelCanvasRef.current) {
        const res = sharedCVEngine.processFrame(
          img,
          rawCanvasRef.current,
          anonCanvasRef.current,
          skelCanvasRef.current,
          {
            frameIndex: 0,
            timestampSec: 0,
            blurMode: privacySettings.blurMode,
            blurStrength: privacySettings.blurStrength,
            modelType,
            isDemoScene: true,
          }
        );
        setLatestFrame(res);
        setPipelineStage(6);
      }
    };

    return () => {
      mounted = false;
      stopCapture();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run single preview frame when blur settings change while idle in demo mode
  useEffect(() => {
    if (
      runState === 'idle' &&
      sourceType === 'demo' &&
      demoImgRef.current &&
      rawCanvasRef.current &&
      anonCanvasRef.current &&
      skelCanvasRef.current
    ) {
      const res = sharedCVEngine.processFrame(
        demoImgRef.current,
        rawCanvasRef.current,
        anonCanvasRef.current,
        skelCanvasRef.current,
        {
          frameIndex: frameIndexRef.current,
          timestampSec: Number((frameIndexRef.current * 0.2).toFixed(1)),
          blurMode: privacySettings.blurMode,
          blurStrength: privacySettings.blurStrength,
          modelType,
          isDemoScene: true,
        }
      );
      setLatestFrame(res);
    }
  }, [privacySettings.blurMode, privacySettings.blurStrength, modelType, runState, sourceType]);

  const stopCapture = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoElemRef.current && !videoElemRef.current.paused) {
      videoElemRef.current.pause();
    }
    setRunState('idle');
    setPipelineStage(1);
  };

  const handleUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file (.mp4, .webm, .mov).');
      return;
    }
    stopCapture();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const nextUrl = URL.createObjectURL(file);
    setVideoUrl(nextUrl);
    setUploadedFileName(file.name);
    setSourceType('upload');
    sharedCVEngine.resetTemporalWindows();
    frameIndexRef.current = 0;
    framesBufferRef.current = [];
    setPredictionHistory([]);
  };

  const startWebcam = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    stopCapture();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Browser camera access is not available in this context. Use Video Upload or Demo Mode.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      });
      streamRef.current = stream;
      setSourceType('webcam');
      if (videoElemRef.current) {
        videoElemRef.current.srcObject = stream;
        await videoElemRef.current.play();
      }
      begin5FpsLoop('webcam');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Webcam permission denied or no camera device detected.';
      setErrorMsg(`Camera unavailable: ${msg}. You can upload a video or run Sample Classroom Demo Mode.`);
    }
  };

  const begin5FpsLoop = (mode: 'demo' | 'upload' | 'webcam') => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (runState === 'idle') {
      sharedCVEngine.resetTemporalWindows();
      frameIndexRef.current = 0;
      framesBufferRef.current = [];
      setPredictionHistory([]);
    }

    if (mode === 'upload' && videoElemRef.current) {
      videoElemRef.current.play().catch(() => {
        setErrorMsg('Could not play uploaded video file.');
      });
    }

    setRunState('running');

    const tick = () => {
      const rawC = rawCanvasRef.current;
      const anonC = anonCanvasRef.current;
      const skelC = skelCanvasRef.current;
      if (!rawC || !anonC || !skelC) return;

      let feedSource: HTMLVideoElement | HTMLImageElement | null = null;
      let tsSec = Number((frameIndexRef.current * 0.2).toFixed(1));

      if (mode === 'demo') {
        feedSource = demoImgRef.current;
      } else {
        const vid = videoElemRef.current;
        if (!vid || vid.readyState < 2) return;
        if (mode === 'upload' && vid.ended) {
          stopCapture();
          setSuccessMsg(
            `Completed 5 FPS analysis of ${framesBufferRef.current.length} anonymised frames. Save session to SQLite below.`
          );
          return;
        }
        feedSource = vid;
        if (mode === 'upload') tsSec = Number(vid.currentTime.toFixed(1));
      }

      if (!feedSource) return;

      const idx = frameIndexRef.current++;
      setPipelineStage(3);
      const res = sharedCVEngine.processFrame(feedSource, rawC, anonC, skelC, {
        frameIndex: idx,
        timestampSec: tsSec,
        blurMode: privacySettings.blurMode,
        blurStrength: privacySettings.blurStrength,
        modelType,
        isDemoScene: mode === 'demo',
      });
      setPipelineStage(6);

      framesBufferRef.current.push(res);
      if (framesBufferRef.current.length > 600) {
        framesBufferRef.current.shift();
      }
      setLatestFrame(res);
      setPredictionHistory((prev) => [
        {
          frame: idx + 1,
          time: `${tsSec.toFixed(1)}s`,
          score: res.overallScore,
          att: res.classCounts.attentive,
          dis: res.classCounts.distracted,
          part: res.classCounts.participating,
          unc: res.classCounts.uncertain,
        },
        ...prev.slice(0, 14),
      ]);
    };

    tick();
    timerRef.current = window.setInterval(tick, 200); // 5 FPS sampling
  };

  const handlePause = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (videoElemRef.current && !videoElemRef.current.paused) {
      videoElemRef.current.pause();
    }
    setRunState('paused');
  };

  const handleSaveSessionToDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!courseCode.trim() || !sessionTitle.trim()) {
      setErrorMsg('Please enter both a Course Code and Session Title before saving.');
      return;
    }
    if (framesBufferRef.current.length === 0) {
      setErrorMsg('Run at least one 5 FPS analysis pass before saving a session.');
      return;
    }

    setSaving(true);
    try {
      const built = buildSessionFromFrames({
        title: sessionTitle.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        room: roomName.trim() || 'Classroom Feed',
        sourceType,
        modelType,
        blurMode: privacySettings.blurMode,
        frames: framesBufferRef.current,
      });
      await onSaveSession(built);
      setSuccessMsg(
        `Saved "${built.courseCode}" (${built.framesProcessed} frames) to SQLite. Switched active dashboard session.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save session.');
    } finally {
      setSaving(false);
    }
  };

  const people = latestFrame?.people ?? [];

  return (
    <div className="space-y-6">
      {/* Hidden offscreen video element for upload / webcam capture */}
      <video
        ref={videoElemRef}
        src={sourceType === 'upload' ? videoUrl ?? undefined : undefined}
        playsInline
        muted
        onLoadedMetadata={() => {
          setErrorMsg(null);
        }}
        onError={() => {
          if (sourceType === 'upload') {
            setErrorMsg('This video codec could not be decoded by the browser. Export it as H.264 MP4 or WebM and upload it again.');
            setRunState('idle');
          }
        }}
        className="hidden"
      />

      {/* Top Controls Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs font-medium text-[#22D3EE]">
              {activeTab === 'live'
                ? 'Live Classroom Stream Monitor'
                : activeTab === 'anonymisation'
                  ? 'Module 1 · Pre-Pose Face Anonymisation Inspector'
                  : activeTab === 'pose'
                    ? 'Module 2 & 3 · Pose, Gaze Proxy & Temporal Classification'
                    : 'Module 1 · 5 FPS Video Ingestion & Anonymisation'}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Privacy-Preserving Vision Workspace
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Engine: {engineStatus.label} · Sample Rate: 5 FPS (200ms)
            </p>
          </div>

          {/* Input Source & Playback Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                stopCapture();
                setSourceType('demo');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                sourceType === 'demo'
                  ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white'
                  : 'border-slate-700 bg-[#080D19] text-slate-300 hover:border-slate-500'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Demo Classroom</span>
            </button>

            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors cursor-pointer whitespace-nowrap">
              <Upload className="h-3.5 w-3.5 text-[#22D3EE]" />
              <span>{uploadedFileName ? uploadedFileName.slice(0, 18) : 'Upload Video'}</span>
              <input type="file" accept="video/*" onChange={handleUploadVideo} className="hidden" />
            </label>

            <button
              type="button"
              onClick={startWebcam}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                sourceType === 'webcam'
                  ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-200'
                  : 'border-slate-700 bg-[#080D19] text-slate-200 hover:border-slate-500'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Webcam</span>
            </button>

            <div className="mx-1 h-6 w-px bg-slate-800" />

            {runState !== 'running' ? (
              <button
                type="button"
                onClick={() => begin5FpsLoop(sourceType)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{runState === 'paused' ? 'Resume 5 FPS' : 'Start 5 FPS'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={stopCapture}
              disabled={runState === 'idle'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-500/50 hover:text-red-300 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Classifier & Blur Configuration Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400">Classifier Model:</span>
            <div className="flex items-center gap-1 rounded-lg bg-[#080D19] p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setModelType('baseline')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  modelType === 'baseline' ? 'bg-[#3B82F6] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Baseline (Rule + Logistic)
              </button>
              <button
                type="button"
                onClick={() => setModelType('lstm')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  modelType === 'lstm' ? 'bg-[#8B5CF6] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                LSTM Sequence (Prototype)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400">Redaction Mode:</span>
            <div className="flex items-center gap-1 rounded-lg bg-[#080D19] p-1 border border-slate-800">
              {(['gaussian', 'pixelate', 'solid'] as BlurMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdatePrivacy({ blurMode: mode })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                    privacySettings.blurMode === mode
                      ? 'bg-[#22D3EE]/20 text-[#22D3EE]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-slate-300">
              <span>Blur:</span>
              <input
                type="range"
                min={12}
                max={56}
                value={privacySettings.blurStrength}
                onChange={(e) => onUpdatePrivacy({ blurStrength: Number(e.target.value) })}
                className="w-24 accent-[#22D3EE]"
              />
              <span className="font-mono tabular-nums">{privacySettings.blurStrength}px</span>
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Live Processing Monitor & Pulse when on Live tab */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <EngagementPulse
              score={latestFrame?.overallScore ?? 0}
              label={
                runState === 'running'
                  ? `Streaming ${sourceType} input @ 5 FPS`
                  : 'Press Start 5 FPS or Webcam to monitor live'
              }
              studentsDetected={people.length}
              isLive={runState === 'running'}
            />
          </div>
          <div className="lg:col-span-7">
            <PrivacyPipelineMonitor
              currentStage={pipelineStage}
              blurMode={privacySettings.blurMode}
              anonymisedBeforePose={true}
            />
          </div>
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-3.5">
          <div className="text-[11px] text-slate-400">Detected Faces</div>
          <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
            {latestFrame?.facesDetected ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-3.5">
          <div className="text-[11px] text-slate-400">Anonymisation Status</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#22C55E]">
            <ShieldCheck className="h-4 w-4" />
            <span>Pre-Pose Verified</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-3.5">
          <div className="text-[11px] text-slate-400">Frames Processed</div>
          <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
            {framesBufferRef.current.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-3.5">
          <div className="text-[11px] text-slate-400">Processing Speed</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#22D3EE] tabular-nums">
            {latestFrame ? `${latestFrame.effectiveFps} FPS` : '5.0 FPS'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-3.5">
          <div className="text-[11px] text-slate-400">Privacy Boundary</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">
            Local RAM Only
          </div>
        </div>
      </div>

      {/* Three Mandatory Panels: Original (Local Only), Anonymised, Skeleton-Only */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101827]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs">
            <span className="font-semibold text-white">1. Original Input (Local Preview Only)</span>
            <span className="text-amber-300">Never Transmitted</span>
          </div>
          <div className="aspect-video bg-[#080D19]">
            <canvas ref={rawCanvasRef} className="h-full w-full object-contain" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#22D3EE]/40 bg-[#101827]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs">
            <span className="font-semibold text-white">2. Anonymised Video</span>
            <span className="inline-flex items-center gap-1 text-[#22D3EE]">
              <EyeOff className="h-3.5 w-3.5" />
              <span>Pre-Pose Input</span>
            </span>
          </div>
          <div className="aspect-video bg-[#080D19]">
            <canvas ref={anonCanvasRef} className="h-full w-full object-contain" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#3B82F6]/40 bg-[#101827]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs">
            <span className="font-semibold text-white">3. Skeleton-Only Output</span>
            <span className="inline-flex items-center gap-1 text-[#22C55E]">
              <ScanFace className="h-3.5 w-3.5" />
              <span>Zero Face Pixels</span>
            </span>
          </div>
          <div className="aspect-video bg-[#080D19]">
            <canvas ref={skelCanvasRef} className="h-full w-full object-contain" />
          </div>
        </div>
      </div>

      {/* Pose, Head Orientation, Gaze Proxy & Engagement Classification Table */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                Anonymous Pose &amp; Engagement Kinematics
              </h3>
              <p className="text-xs text-slate-400">
                Gaze direction is explicitly labeled as an approximate head-pose orientation proxy
                (no eye-tracking hardware required).
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {modelType === 'lstm'
                ? 'Temporal LSTM (Prototype Weights)'
                : 'Baseline Logistic Classifier'}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3 font-medium">Subject</th>
                  <th className="py-2 pr-3 font-medium">Zone</th>
                  <th className="py-2 pr-3 font-medium text-right">Yaw / Pitch / Roll</th>
                  <th className="py-2 pr-3 font-medium">Approx. Gaze Proxy</th>
                  <th className="py-2 pr-3 font-medium">Posture</th>
                  <th className="py-2 pr-3 font-medium">Hand</th>
                  <th className="py-2 text-right font-medium">Prediction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {people.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Start 5 FPS analysis to extract pose kinematics and engagement predictions.
                    </td>
                  </tr>
                ) : (
                  people.map((p) => {
                    const clsColor =
                      p.engagementClass === 'Participating'
                        ? 'text-[#22C55E]'
                        : p.engagementClass === 'Distracted'
                          ? 'text-[#F59E0B]'
                          : p.engagementClass === 'Uncertain'
                            ? 'text-slate-400'
                            : 'text-[#3B82F6]';
                    return (
                      <tr key={p.anonymousId}>
                        <td className="py-2.5 pr-3 font-mono font-semibold text-white">
                          {p.anonymousId}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-300 capitalize">
                          {p.zoneId.replace('-', ' ')}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-200">
                          {p.headYawDeg}° / {p.headPitchDeg}° / {p.headRollDeg}°
                        </td>
                        <td className="py-2.5 pr-3 text-slate-300">
                          <div>{p.gazeEstimate}</div>
                          <div className="text-[10px] text-slate-500">Head-Vector Proxy</div>
                        </td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-300">
                          {p.isSlouching ? 'Slouch (' : 'Upright ('}
                          {p.torsoLeanDeg}°)
                        </td>
                        <td className="py-2.5 pr-3">
                          {p.handRaised ? (
                            <span className="font-semibold text-[#22C55E]">Raised</span>
                          ) : (
                            <span className="text-slate-500">Down</span>
                          )}
                        </td>
                        <td className={`py-2.5 text-right font-semibold ${clsColor}`}>
                          {p.engagementClass}{' '}
                          <span className="font-mono text-[11px] tabular-nums text-slate-400">
                            ({Math.round(p.confidence * 100)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prediction History + Save to SQLite */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
            <h3 className="text-base font-semibold text-white">Save Session to SQLite</h3>
            <p className="mt-1 text-xs text-slate-400">
              Persists anonymized timelines &amp; seating aggregates only—zero video frames.
            </p>
            <form onSubmit={handleSaveSessionToDb} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300">Course Code</label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  required
                  maxLength={32}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 text-white focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300">Session Title</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  required
                  maxLength={120}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 text-white focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300">Classroom / Room</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={64}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#080D19] px-3 py-2 text-white focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Anonymized Session</span>
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
            <h3 className="text-sm font-semibold text-white">Recent Frame Predictions</h3>
            <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto font-mono text-[11px] tabular-nums">
              {predictionHistory.length === 0 ? (
                <div className="text-slate-500">No sampled frames logged yet.</div>
              ) : (
                predictionHistory.map((h) => (
                  <div
                    key={h.frame}
                    className="flex items-center justify-between rounded border border-slate-800/80 bg-[#080D19] px-2.5 py-1.5 text-slate-300"
                  >
                    <span>
                      #{h.frame} ({h.time})
                    </span>
                    <span className="text-white">{h.score}%</span>
                    <span className="text-slate-400">
                      A:{h.att} P:{h.part} D:{h.dis}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
