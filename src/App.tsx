import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Camera,
  EyeOff,
  FileText,
  Grid,
  Home,
  LayoutDashboard,
  Loader2,
  Menu,
  ScanFace,
  Settings,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import type {
  DashboardSection,
  EvaluationResult,
  PrivacyAuditEntry,
  PrivacySettings,
  SessionRecord,
} from './types/classsight';
import { LandingPage } from './components/LandingPage';
import { DashboardOverview } from './components/DashboardOverview';
import { VideoPipelineView } from './components/VideoPipelineView';
import { EngagementAnalyticsView, SeatingHeatmapView } from './components/AnalyticsAndHeatmapView';
import { ModelEvaluationView } from './components/ModelEvaluationView';
import { PrivacySettingsView, ReportsView } from './components/ReportsAndPrivacyView';

const NAV_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'live', label: 'Live Classroom', icon: Camera },
  { id: 'video', label: 'Video Analysis', icon: Video },
  { id: 'anonymisation', label: 'Face Anonymisation', icon: EyeOff },
  { id: 'pose', label: 'Pose Estimation', icon: ScanFace },
  { id: 'analytics', label: 'Engagement Analytics', icon: BarChart3 },
  { id: 'heatmap', label: 'Seating Heatmap', icon: Grid },
  { id: 'evaluation', label: 'Model Evaluation', icon: Award },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'privacy', label: 'Privacy Settings', icon: Settings },
];

const DEFAULT_PRIVACY: PrivacySettings = {
  anonymisationRequired: true,
  blurMode: 'gaussian',
  blurStrength: 28,
  skeletonOnlyMode: true,
  localProcessingOnly: true,
  consentConfirmed: true,
  consentInstructor: 'Dr. A. Mehta (Faculty Demo)',
  consentCourseRef: 'CS-401 / Fall Term',
  consentUpdatedAt: new Date().toISOString(),
  rawVideoRetentionSec: 0,
  pythonBackendUrl: 'http://localhost:8000',
};

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('landing');
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationResult[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [auditLog, setAuditLog] = useState<PrivacyAuditEntry[]>([]);
  const [pythonConnected, setPythonConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sessResp, evalResp, privResp, healthResp] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/evaluation'),
        fetch('/api/privacy'),
        fetch('/api/health'),
      ]);

      if (!sessResp.ok || !evalResp.ok || !privResp.ok) {
        throw new Error('Failed to load workspace data from SQLite backend.');
      }

      const sessData = await sessResp.json();
      const evalData = await evalResp.json();
      const privData = await privResp.json();
      const healthData = healthResp.ok ? await healthResp.json() : { pythonBackendReachable: false };

      const list: SessionRecord[] = sessData.sessions ?? [];
      setSessions(list);
      setSelectedSessionId((prev) =>
        prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? ''
      );
      setEvaluationRuns(evalData.runs ?? []);
      if (privData.settings) setPrivacySettings(privData.settings);
      setAuditLog(privData.auditLog ?? []);
      setPythonConnected(Boolean(healthData.pythonBackendReachable));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to connect to ClassSight backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const activeSession = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0];

  const handleLaunchDashboard = (initialSection: DashboardSection = 'overview') => {
    setActiveSection(initialSection);
    setViewMode('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdatePrivacy = async (updates: Partial<PrivacySettings>) => {
    const resp = await fetch('/api/privacy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Failed to update privacy settings.');
    }
    setPrivacySettings(data.settings);
    setAuditLog(data.auditLog);
  };

  const handleSaveSession = async (session: SessionRecord) => {
    const resp = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Failed to persist session.');
    }
    setSessions((prev) => [data.session, ...prev]);
    setSelectedSessionId(data.session.id);

    // Refresh privacy audit log
    const privResp = await fetch('/api/privacy');
    if (privResp.ok) {
      const privData = await privResp.json();
      setAuditLog(privData.auditLog ?? []);
    }
  };

  const handleDeleteSession = async (id: string) => {
    const resp = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (resp.ok) {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (selectedSessionId === id && next[0]) {
          setSelectedSessionId(next[0].id);
        }
        return next;
      });
      const privResp = await fetch('/api/privacy');
      if (privResp.ok) {
        const privData = await privResp.json();
        setAuditLog(privData.auditLog ?? []);
      }
    }
  };

  const handlePurgeUserSessions = async (): Promise<number> => {
    const resp = await fetch('/api/sessions', { method: 'DELETE' });
    const data = await resp.json();
    await fetchAllData();
    return Number(data.purgedCount ?? 0);
  };

  const handleSessionUpdated = (updated: SessionRecord) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleEvaluationRunCreated = (newRun: EvaluationResult) => {
    setEvaluationRuns((prev) => [newRun, ...prev]);
  };

  if (viewMode === 'landing') {
    return <LandingPage onLaunchDashboard={(sec) => handleLaunchDashboard(sec ?? 'overview')} />;
  }

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label ?? 'Overview';

  return (
    <div className="flex min-h-screen bg-[#080D19] text-slate-100">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/90 bg-[#0B1221] lg:flex">
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <button
            type="button"
            onClick={() => setViewMode('landing')}
            className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white cursor-pointer"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#22D3EE]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>ClassSight AI</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#3B82F6]/15 text-white border border-[#3B82F6]/40'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#22D3EE]' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-4 text-xs">
          <div className="rounded-lg border border-slate-800 bg-[#080D19] p-3">
            <div className="flex items-center gap-2 font-medium text-[#22C55E]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Pre-Pose Privacy On</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Blur: {privacySettings.blurMode} · 0s raw video stored
            </p>
            <button
              type="button"
              onClick={() => setViewMode('landing')}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
            >
              <Home className="h-3 w-3" />
              <span>Back to Landing Page</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-[#0B1221] border-r border-slate-800">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
              <span className="font-semibold text-white">ClassSight AI</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium ${
                      active
                        ? 'bg-[#3B82F6]/15 text-white border border-[#3B82F6]/40'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Contextual Dashboard Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800/90 bg-[#080D19]/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:text-white lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-400 truncate">
                Teacher Dashboard / <span className="text-slate-200">{currentNavLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {sessions.length > 0 && (
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                aria-label="Active classroom session"
                className="max-w-[240px] rounded-lg border border-slate-700 bg-[#101827] px-3 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none truncate"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.courseCode} · {s.isDemoData ? '[Demo] ' : ''}
                    {s.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setActiveSection('video')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Run CV Analysis</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-[#101827]">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Loader2 className="h-5 w-5 animate-spin text-[#22D3EE]" />
                  <span>Loading ClassSight AI SQLite workspace...</span>
                </div>
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={fetchAllData}
                  className="mt-3 rounded-lg bg-red-500/20 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500/30 cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            ) : !activeSession ? (
              <div className="rounded-xl border border-slate-800 bg-[#101827] p-8 text-center">
                <p className="text-sm text-slate-300">No classroom sessions stored yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveSection('video')}
                  className="mt-4 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white"
                >
                  Analyze First Classroom Video
                </button>
              </div>
            ) : (
              <>
                {activeSection === 'overview' && (
                  <DashboardOverview
                    session={activeSession}
                    allSessions={sessions}
                    onSelectSession={setSelectedSessionId}
                    onDeleteSession={handleDeleteSession}
                    onNavigate={setActiveSection}
                    onSessionUpdated={handleSessionUpdated}
                  />
                )}

                {(activeSection === 'live' ||
                  activeSection === 'video' ||
                  activeSection === 'anonymisation' ||
                  activeSection === 'pose') && (
                  <VideoPipelineView
                    activeTab={activeSection}
                    privacySettings={privacySettings}
                    onUpdatePrivacy={handleUpdatePrivacy}
                    onSaveSession={handleSaveSession}
                  />
                )}

                {activeSection === 'analytics' && (
                  <EngagementAnalyticsView session={activeSession} />
                )}

                {activeSection === 'heatmap' && <SeatingHeatmapView session={activeSession} />}

                {activeSection === 'evaluation' && (
                  <ModelEvaluationView
                    runs={evaluationRuns}
                    onRunCreated={handleEvaluationRunCreated}
                  />
                )}

                {activeSection === 'reports' && (
                  <ReportsView session={activeSession} evaluation={evaluationRuns[0]} />
                )}

                {activeSection === 'privacy' && (
                  <PrivacySettingsView
                    settings={privacySettings}
                    auditLog={auditLog}
                    pythonConnected={pythonConnected}
                    onUpdateSettings={handleUpdatePrivacy}
                    onPurgeUserSessions={handlePurgeUserSessions}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
