import { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type {
  ActiveModule,
  ActivityEvent,
  AlternativeRoleFit,
  Candidate,
  FilterState,
  JobDescription,
  JobTemplate,
  PipelineStage,
  QueuedResumeFile,
  SentinelChatMessage,
  SentinelWorkspaceContext,
  ToastMessage,
} from './types/ats';
import {
  INITIAL_CANDIDATES_BY_JOB,
  INITIAL_FILTERS,
  INITIAL_JOB_DESCRIPTIONS,
  JOB_TEMPLATES,
} from './data/initialData';
import {
  evaluateBestAlternativeRole,
  runBulkResumeScreening,
  scoreCandidateLocally,
} from './services/aiScreening';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { JobDescriptionsHub } from './components/JobDescriptionsHub';
import { FrontDashboard } from './components/FrontDashboard';
import { UploadJdModule } from './components/UploadJdModule';
import { CandidateDashboard } from './components/CandidateDashboard';
import { RankListScreen } from './components/RankListScreen';
import { CandidateDrawer } from './components/CandidateDrawer';
import { HiringPipeline } from './components/HiringPipeline';
import { SideBySideComparison } from './components/SideBySideComparison';
import { ToastContainer } from './components/ToastContainer';
import { JobDescriptionModal } from './components/JobDescriptionModal';
import { LandingPage } from './components/LandingPage';
import { SentinelChatPanel } from './components/SentinelChatPanel';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [sentinelChatOpen, setSentinelChatOpen] = useState(false);
  const [sentinelMessages, setSentinelMessages] = useState<SentinelChatMessage[]>([
    {
      id: 'sentinel-welcome',
      role: 'assistant',
      content: "Hi! I'm **Schrodinger's cat**. How can I help?",
      timestamp: 'Ready',
    },
  ]);
  const [activeModule, setActiveModule] = useState<ActiveModule>('jobs');
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>(INITIAL_JOB_DESCRIPTIONS);
  const [activeJobId, setActiveJobId] = useState<string>(INITIAL_JOB_DESCRIPTIONS[0].id);
  const [candidatesByJob, setCandidatesByJob] = useState<Record<string, Candidate[]>>(
    INITIAL_CANDIDATES_BY_JOB
  );

  const [queuedFiles, setQueuedFiles] = useState<QueuedResumeFile[]>([]);
  const [autoShortlistOnUpload, setAutoShortlistOnUpload] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([
    'cand-101',
    'cand-104',
    'cand-102',
  ]);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(null);
  const [pendingClearJobId, setPendingClearJobId] = useState<string | null>(null);
  const [jdModal, setJdModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    job: JobDescription | null;
  }>({ open: false, mode: 'create', job: null });
  const [navHistory, setNavHistory] = useState<Array<{ module: ActiveModule; jobId: string }>>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [isScreening, setIsScreening] = useState(false);
  const [screeningStageIndex, setScreeningStageIndex] = useState(0);
  const [screeningStatusMessage, setScreeningStatusMessage] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{
    processed: number;
    total: number;
    recentNames: string[];
  }>({ processed: 0, total: 0, recentNames: [] });
  const [screeningError, setScreeningError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    if (mapsApiKey) return;
    let active = true;
    fetch('/api/maps-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { apiKey?: string } | null) => {
        if (active && data?.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      })
      .catch(() => {
        // Silent fallback if endpoint unavailable
      });
    return () => {
      active = false;
    };
  }, [mapsApiKey]);

  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([
    {
      id: 'act-init-1',
      timestamp: 'Just now',
      roleTitle: INITIAL_JOB_DESCRIPTIONS[0].title,
      message: 'Workspace initialized with 4 active Job Descriptions and candidate pools.',
    },
  ]);

  const activeJobDescription = useMemo(
    () => jobDescriptions.find((j) => j.id === activeJobId) ?? jobDescriptions[0],
    [jobDescriptions, activeJobId]
  );

  const candidates = useMemo(
    () => candidatesByJob[activeJobId] ?? [],
    [candidatesByJob, activeJobId]
  );

  const totalWorkspaceCandidates = useMemo(
    () => Object.values(candidatesByJob).reduce((sum, list) => sum + list.length, 0),
    [candidatesByJob]
  );

  const sentinelWorkspaceContext = useMemo<SentinelWorkspaceContext>(
    () => ({
      currentView: showLanding ? 'landing' : activeModule,
      activeJob: activeJobDescription
        ? {
            title: activeJobDescription.title,
            department: activeJobDescription.department,
            location: activeJobDescription.location,
            jobType: activeJobDescription.jobType || 'Hybrid',
            experienceRange: activeJobDescription.experienceRange,
            minCgpa: activeJobDescription.minCgpa,
            requiredSkills: activeJobDescription.requiredSkills,
            preferredSkills: activeJobDescription.preferredSkills,
            description: activeJobDescription.description,
            status: activeJobDescription.status,
          }
        : undefined,
      allJobsSummary: jobDescriptions.map((jd) => ({
        title: jd.title,
        department: jd.department,
        location: jd.location,
        jobType: jd.jobType || 'Hybrid',
        status: jd.status,
        candidateCount: (candidatesByJob[jd.id] ?? []).length,
      })),
      activeCandidatesSummary: candidates.map((c) => ({
        fullName: c.fullName,
        currentRole: c.currentRole,
        matchScore: c.matchScore,
        stage: c.stage,
        yearsOfExperience: c.yearsOfExperience,
        cgpa: c.cgpa,
        city: c.city,
        matchedSkills: c.matchedSkills,
        missingSkills: c.missingSkills,
        tenthPercent: c.tenthPercent,
        twelfthPercent: c.twelfthPercent,
        college: c.college,
        projects: c.projects,
        achievements: c.achievements,
        scoreBreakdown: c.scoreBreakdown,
      })),
    }),
    [showLanding, activeModule, activeJobDescription, jobDescriptions, candidatesByJob, candidates]
  );

  const pushActivity = useCallback((roleTitle: string, message: string) => {
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivityLog((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: timeLabel,
        roleTitle,
        message,
      },
      ...prev.slice(0, 29),
    ]);
  }, []);

  const pushToast = useCallback(
    (title: string, description?: string, tone: ToastMessage['tone'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setActiveCandidates = useCallback(
    (updater: (prev: Candidate[]) => Candidate[]) => {
      setCandidatesByJob((prev) => ({
        ...prev,
        [activeJobId]: updater(prev[activeJobId] ?? []),
      }));
    },
    [activeJobId]
  );


  const navigateTo = useCallback(
    (targetModule: ActiveModule, targetJobId?: string) => {
      const resolvedJobId = targetJobId ?? activeJobId;
      if (targetModule === activeModule && resolvedJobId === activeJobId) {
        return;
      }

      setNavHistory((prev) => [
        ...prev.slice(-29),
        { module: activeModule, jobId: activeJobId },
      ]);
      setDrawerCandidateId(null);

      if (resolvedJobId !== activeJobId) {
        setActiveJobId(resolvedJobId);
        setFilters(INITIAL_FILTERS);
        const nextPool = candidatesByJob[resolvedJobId] ?? [];
        setSelectedCompareIds(
          [...nextPool]
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3)
            .map((c) => c.id)
        );
      }

      setActiveModule(targetModule);
    },
    [activeJobId, activeModule, candidatesByJob]
  );

  const handleGoBack = useCallback(() => {
    setDrawerCandidateId(null);
    if (navHistory.length > 0) {
      const previous = navHistory[navHistory.length - 1];
      setNavHistory((prev) => prev.slice(0, -1));
      const validJobId = jobDescriptions.some((j) => j.id === previous.jobId)
        ? previous.jobId
        : activeJobId;
      if (validJobId !== activeJobId) {
        setActiveJobId(validJobId);
        setFilters(INITIAL_FILTERS);
        const nextPool = candidatesByJob[validJobId] ?? [];
        setSelectedCompareIds(
          [...nextPool]
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3)
            .map((c) => c.id)
        );
      }
      setActiveModule(previous.module);
      return;
    }

    if (activeModule !== 'jobs') {
      setActiveModule(activeModule === 'overview' ? 'jobs' : 'overview');
    }
  }, [activeJobId, activeModule, candidatesByJob, jobDescriptions, navHistory]);

  const canGoBack = navHistory.length > 0 || activeModule !== 'jobs';

  const previousPageLabel = useMemo(() => {
    const labels: Record<ActiveModule, string> = {
      jobs: 'All Job Descriptions',
      overview: 'Role Overview',
      upload: 'Upload Resumes',
      dashboard: 'Candidate Dashboard',
      ranklist: 'Candidate Rank List',
      pipeline: 'Hiring Pipeline',
      compare: 'Side-by-Side Comparison',
    };
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      return labels[prev.module];
    }
    if (activeModule === 'overview') return labels.jobs;
    if (activeModule !== 'jobs') return labels.overview;
    return undefined;
  }, [activeModule, navHistory]);

  const handleSwitchJob = useCallback(
    (jobId: string, targetModule?: ActiveModule) => {
      navigateTo(targetModule ?? activeModule, jobId);
    },
    [activeModule, navigateTo]
  );

  const handleCreateJobFromTemplate = useCallback(
    (tpl: JobTemplate) => {
      const newId = `jd-${Date.now()}`;
      const newJob: JobDescription = {
        id: newId,
        title: tpl.title,
        department: tpl.department,
        location: tpl.location,
        locationPlaceId: tpl.locationPlaceId,
        jobType: tpl.jobType,
        experienceRange: tpl.experienceRange,
        minCgpa: tpl.minCgpa,
        requiredSkills: [...tpl.requiredSkills],
        preferredSkills: [...tpl.preferredSkills],
        description: tpl.description,
        status: 'Active',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setNavHistory((prev) => [
        ...prev.slice(-29),
        { module: activeModule, jobId: activeJobId },
      ]);
      setJobDescriptions((prev) => [newJob, ...prev]);
      setCandidatesByJob((prev) => ({ ...prev, [newId]: [] }));
      setActiveJobId(newId);
      setFilters(INITIAL_FILTERS);
      setSelectedCompareIds([]);
      setActiveModule('overview');
      pushActivity(newJob.title, `Created role from "${tpl.label}" template.`);
      pushToast('Job Description Created', `Opened workspace for ${newJob.title}.`, 'success');
    },
    [activeJobId, activeModule, pushActivity, pushToast]
  );

  const handleCreateCustomJob = useCallback(
    (payload: Omit<JobDescription, 'id' | 'createdAt' | 'status'>) => {
      const newId = `jd-${Date.now()}`;
      const newJob: JobDescription = {
        ...payload,
        id: newId,
        status: 'Active',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setNavHistory((prev) => [
        ...prev.slice(-29),
        { module: activeModule, jobId: activeJobId },
      ]);
      setJobDescriptions((prev) => [newJob, ...prev]);
      setCandidatesByJob((prev) => ({ ...prev, [newId]: [] }));
      setActiveJobId(newId);
      setFilters(INITIAL_FILTERS);
      setSelectedCompareIds([]);
      setActiveModule('upload');
      pushActivity(newJob.title, 'Created custom Job Description.');
      pushToast('Custom Role Created', `Ready to upload resumes for ${newJob.title}.`, 'success');
    },
    [activeJobId, activeModule, pushActivity, pushToast]
  );

  const handleToggleJobStatus = useCallback(
    (jobId: string) => {
      setJobDescriptions((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: j.status === 'Active' ? 'Paused' : 'Active' } : j
        )
      );
    },
    []
  );

  const handleSaveUpdatedJob = useCallback(
    (updated: JobDescription, rescorePool: boolean) => {
      setJobDescriptions((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));

      const pool = candidatesByJob[updated.id] ?? [];
      if (rescorePool && pool.length > 0) {
        const rescored = pool.map((cand) => {
          const nextScore = scoreCandidateLocally(cand, updated);
          return {
            ...cand,
            matchScore: nextScore.matchScore,
            matchedSkills: nextScore.matchedSkills,
            missingSkills: nextScore.missingSkills,
            aiSummary: nextScore.aiSummary,
          };
        });
        setCandidatesByJob((prev) => ({
          ...prev,
          [updated.id]: rescored,
        }));
      }

      pushActivity(
        updated.title,
        rescorePool && pool.length > 0
          ? `Updated Job Description and recalculated scores for ${pool.length} candidate(s).`
          : 'Updated Job Description criteria and skills.'
      );
      pushToast(
        'Job Description Updated',
        rescorePool && pool.length > 0
          ? `Saved changes to "${updated.title}" and re-scored ${pool.length} candidate${pool.length === 1 ? '' : 's'}.`
          : `Saved changes to "${updated.title}".`,
        'success'
      );
    },
    [candidatesByJob, pushActivity, pushToast]
  );

  const pendingClearJob = useMemo(
    () => (pendingClearJobId ? jobDescriptions.find((j) => j.id === pendingClearJobId) ?? null : null),
    [jobDescriptions, pendingClearJobId]
  );

  const pendingClearCount = useMemo(
    () => (pendingClearJobId ? (candidatesByJob[pendingClearJobId] ?? []).length : 0),
    [candidatesByJob, pendingClearJobId]
  );

  const handleConfirmClearCandidates = useCallback(() => {
    if (!pendingClearJobId) return;
    const targetJob = jobDescriptions.find((j) => j.id === pendingClearJobId);
    const removedCount = (candidatesByJob[pendingClearJobId] ?? []).length;

    setCandidatesByJob((prev) => ({
      ...prev,
      [pendingClearJobId]: [],
    }));

    if (pendingClearJobId === activeJobId) {
      setSelectedCompareIds([]);
      setDrawerCandidateId(null);
      setFilters(INITIAL_FILTERS);
    }

    if (targetJob) {
      pushActivity(
        targetJob.title,
        `Removed all ${removedCount} candidate(s) to reset workspace for reuse.`
      );
      pushToast(
        'Workspace Candidates Removed',
        `Cleared ${removedCount} candidate${removedCount === 1 ? '' : 's'} from "${targetJob.title}". Job Description criteria remain intact.`,
        'info'
      );
    }
    setPendingClearJobId(null);
  }, [activeJobId, candidatesByJob, jobDescriptions, pendingClearJobId, pushActivity, pushToast]);

  const drawerCandidate = useMemo(
    () => candidates.find((c) => c.id === drawerCandidateId) ?? null,
    [candidates, drawerCandidateId]
  );

  const drawerAlternativeFit = useMemo(
    () =>
      drawerCandidate
        ? evaluateBestAlternativeRole(drawerCandidate, activeJobDescription, jobDescriptions)
        : null,
    [drawerCandidate, activeJobDescription, jobDescriptions]
  );

  const handleTransferToAlternativeRole = useCallback(
    (candidate: Candidate, target: AlternativeRoleFit) => {
      let targetJob = target.existingJobId
        ? jobDescriptions.find((j) => j.id === target.existingJobId)
        : jobDescriptions.find(
            (j) => j.title.trim().toLowerCase() === target.roleTitle.trim().toLowerCase()
          );

      let createdNewWorkspace = false;
      if (!targetJob) {
        const tpl =
          JOB_TEMPLATES.find((t) => t.id === target.templateId) ??
          JOB_TEMPLATES.find(
            (t) =>
              t.label.trim().toLowerCase() === target.roleTitle.trim().toLowerCase() ||
              t.title.trim().toLowerCase() === target.roleTitle.trim().toLowerCase()
          );
        if (!tpl) return;

        targetJob = {
          id: `jd-${Date.now()}`,
          title: tpl.title,
          department: tpl.department,
          location: tpl.location,
          locationPlaceId: tpl.locationPlaceId,
          jobType: tpl.jobType,
          experienceRange: tpl.experienceRange,
          minCgpa: tpl.minCgpa,
          requiredSkills: [...tpl.requiredSkills],
          preferredSkills: [...tpl.preferredSkills],
          description: tpl.description,
          status: 'Active',
          createdAt: new Date().toISOString().slice(0, 10),
        };
        createdNewWorkspace = true;
        setJobDescriptions((prev) => [targetJob!, ...prev]);
      }

      const existingTargetPool = candidatesByJob[targetJob.id] ?? [];
      const alreadyInTarget = existingTargetPool.some(
        (c) => c.email.trim().toLowerCase() === candidate.email.trim().toLowerCase()
      );

      if (alreadyInTarget) {
        pushToast(
          `Already in ${targetJob.title}`,
          `${candidate.fullName} is already present in the ${targetJob.title} workspace.`,
          'info'
        );
        return;
      }

      const rescored = scoreCandidateLocally(candidate, targetJob);
      const transferredCandidate: Candidate = {
        ...candidate,
        id: `cand-xfer-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        matchScore: Math.max(target.score, rescored.matchScore),
        matchedSkills:
          rescored.matchedSkills.length >= target.matchedSkills.length
            ? rescored.matchedSkills
            : target.matchedSkills,
        missingSkills: rescored.missingSkills,
        aiSummary: `Routed from ${activeJobDescription.title} due to strong cross-role alignment. ${rescored.aiSummary}`,
        stage: 'Shortlisted',
        isDuplicate: false,
        duplicateReason: undefined,
      };

      setCandidatesByJob((prev) => ({
        ...prev,
        [targetJob!.id]: [transferredCandidate, ...(prev[targetJob!.id] ?? [])],
      }));

      pushActivity(
        targetJob.title,
        `Routed ${candidate.fullName} from ${activeJobDescription.title} (${transferredCandidate.matchScore}% match, Shortlisted).`
      );
      pushToast(
        `Routed ${candidate.fullName} to ${targetJob.title}`,
        createdNewWorkspace
          ? `Opened new "${targetJob.title}" workspace and shortlisted candidate at ${transferredCandidate.matchScore}% match.`
          : `Added to "${targetJob.title}" workspace as Shortlisted (${transferredCandidate.matchScore}% match).`,
        'success'
      );
    },
    [activeJobDescription.title, candidatesByJob, jobDescriptions, pushActivity, pushToast]
  );

  const handleStageChange = useCallback(
    (id: string, nextStage: PipelineStage) => {
      let targetName = '';
      setActiveCandidates((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            targetName = c.fullName;
            return { ...c, stage: nextStage };
          }
          return c;
        })
      );
      if (targetName) {
        pushActivity(activeJobDescription.title, `Moved ${targetName} to ${nextStage}.`);
        pushToast(`Moved ${targetName} to ${nextStage}`, undefined, 'info');
      }
    },
    [activeJobDescription.title, pushActivity, pushToast, setActiveCandidates]
  );

  const handleToggleCompare = useCallback(
    (id: string) => {
      setSelectedCompareIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((item) => item !== id);
        }
        if (prev.length >= 3) {
          pushToast(
            'Comparison limit reached',
            'You can compare up to 3 candidates simultaneously. Deselect one first.',
            'warning'
          );
          return prev;
        }
        return [...prev, id];
      });
    },
    [pushToast]
  );

  const handleSmartShortlist = useCallback(() => {
    const qualifying = candidates.filter((c) => c.stage === 'Applied' && c.matchScore >= 80);
    if (qualifying.length === 0) {
      pushToast(
        'No new candidates promoted',
        'All candidates with AI Match Score >= 80 are already Shortlisted or further along.',
        'info'
      );
      return;
    }

    const qualifyingIds = new Set(qualifying.map((c) => c.id));
    setActiveCandidates((prev) =>
      prev.map((c) => (qualifyingIds.has(c.id) ? { ...c, stage: 'Shortlisted' } : c))
    );
    pushActivity(
      activeJobDescription.title,
      `Smart Shortlist promoted ${qualifying.length} candidate(s) with score >= 80.`
    );
    pushToast(
      `Smart Shortlist promoted ${qualifying.length} candidate${qualifying.length === 1 ? '' : 's'}`,
      qualifying.map((c) => c.fullName).join(', '),
      'success'
    );
  }, [activeJobDescription.title, candidates, pushActivity, pushToast, setActiveCandidates]);

  const handleRunScreening = useCallback(async () => {
    setIsScreening(true);
    setScreeningError(null);
    setScreeningStatusMessage(null);
    setScreeningStageIndex(0);

    const totalFiles = queuedFiles.length;
    setBulkProgress({ processed: 0, total: totalFiles, recentNames: [] });

    try {
      const result = await runBulkResumeScreening({
        queuedFiles,
        existingCandidates: candidates,
        jobDescription: activeJobDescription,
        onFileStatusChange: (fileIds, status) => {
          const idSet = new Set(fileIds);
          setQueuedFiles((prev) =>
            prev.map((f) => (idSet.has(f.id) ? { ...f, status } : f))
          );
        },
        onBatchProgress: (processed, total, newNames) => {
          setBulkProgress({ processed, total, recentNames: newNames });
        },
        onStageChange: (idx) => setScreeningStageIndex(idx),
        onStatusMessage: (msg) => {
          setScreeningStatusMessage(msg);
          pushToast(msg, 'Automatically pacing requests for free-tier stability.', 'warning');
        },
      });

      const stagedParsed = result.parsedCandidates.map((c) =>
        autoShortlistOnUpload && c.matchScore >= 80
          ? { ...c, stage: 'Shortlisted' as PipelineStage }
          : c
      );

      setActiveCandidates(() => [...stagedParsed, ...result.updatedExisting]);
      setQueuedFiles([]);

      const dupCount = stagedParsed.filter((c) => c.isDuplicate).length;
      const autoShortlistedCount = stagedParsed.filter((c) => c.stage === 'Shortlisted').length;

      pushActivity(
        activeJobDescription.title,
        stagedParsed.length > 0
          ? `Screened ${stagedParsed.length} uploaded resume(s)${
              autoShortlistedCount > 0 ? ` (${autoShortlistedCount} auto-shortlisted)` : ''
            }.`
          : `Re-evaluated ${result.updatedExisting.length} candidates against updated JD.`
      );

      pushToast(
        'Screening Complete',
        stagedParsed.length > 0
          ? `Added & ranked ${stagedParsed.length} resume(s)${
              dupCount > 0 ? ` (${dupCount} duplicate flagged)` : ''
            } against "${activeJobDescription.title}".`
          : `Recalculated match scores for ${result.updatedExisting.length} candidates.`,
        'success'
      );

      setTimeout(() => {
        navigateTo(stagedParsed.length > 0 ? 'ranklist' : 'dashboard');
      }, 260);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete resume screening.';
      setScreeningError(msg);
      pushToast('Screening Notice', msg, 'error');
    } finally {
      setIsScreening(false);
      setScreeningStatusMessage(null);
    }
  }, [
    activeJobDescription,
    autoShortlistOnUpload,
    candidates,
    navigateTo,
    pushActivity,
    pushToast,
    queuedFiles,
    setActiveCandidates,
  ]);

  const appShell = (
    <div
      className={`min-h-screen flex flex-col bg-[#FAF9F6] text-[#111936] ${
        sentinelChatOpen ? 'pb-[56dvh] md:pb-0' : ''
      }`}
    >
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <div className="flex-1 flex min-w-0">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => navigateTo(mod)}
        candidateCount={candidates.length}
        jobCount={jobDescriptions.length}
        compareCount={selectedCompareIds.length}
        jobDescription={activeJobDescription}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        compactHalfScreen={sentinelChatOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeModule={activeModule}
          jobDescription={activeJobDescription}
          allJobDescriptions={jobDescriptions}
          onSwitchJob={(id) => handleSwitchJob(id)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          canGoBack={canGoBack}
          previousLabel={previousPageLabel}
          onGoBack={handleGoBack}
          sentinelChatOpen={sentinelChatOpen}
          onToggleSentinelChat={() => setSentinelChatOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {activeModule === 'jobs' && (
            <JobDescriptionsHub
              jobDescriptions={jobDescriptions}
              activeJobId={activeJobId}
              candidatesByJob={candidatesByJob}
              onSelectJobAndNavigate={(jobId, target) => handleSwitchJob(jobId, target)}
              onCreateJobFromTemplate={handleCreateJobFromTemplate}
              onRequestCreateJob={() => setJdModal({ open: true, mode: 'create', job: null })}
              onRequestEditJob={(job) => setJdModal({ open: true, mode: 'edit', job })}
              onToggleJobStatus={handleToggleJobStatus}
              onRequestClearCandidates={setPendingClearJobId}
            />
          )}

          {activeModule === 'overview' && (
            <FrontDashboard
              candidates={candidates}
              jobDescription={activeJobDescription}
              activityLog={activityLog}
              onNavigate={(mod) => navigateTo(mod)}
              onOpenCandidate={(c) => setDrawerCandidateId(c.id)}
              onRequestClearCandidates={() => setPendingClearJobId(activeJobId)}
              onRequestEditJob={() =>
                setJdModal({ open: true, mode: 'edit', job: activeJobDescription })
              }
            />
          )}

          {activeModule === 'upload' && (
            <UploadJdModule
              jobDescription={activeJobDescription}
              queuedFiles={queuedFiles}
              onAddFiles={(files) => setQueuedFiles((prev) => [...prev, ...files])}
              onRemoveFile={(id) =>
                setQueuedFiles((prev) => prev.filter((item) => item.id !== id))
              }
              onClearFiles={() => setQueuedFiles([])}
              onRunScreening={handleRunScreening}
              isScreening={isScreening}
              screeningStageIndex={screeningStageIndex}
              screeningStatusMessage={screeningStatusMessage}
              bulkProgress={bulkProgress}
              screeningError={screeningError}
              candidateCount={candidates.length}
              autoShortlistOnUpload={autoShortlistOnUpload}
              onToggleAutoShortlist={setAutoShortlistOnUpload}
            />
          )}

          {activeModule === 'dashboard' && (
            <CandidateDashboard
              candidates={candidates}
              activeJobDescription={activeJobDescription}
              allJobDescriptions={jobDescriptions}
              filters={filters}
              onChangeFilters={setFilters}
              onResetFilters={() => setFilters(INITIAL_FILTERS)}
              selectedCompareIds={selectedCompareIds}
              onToggleCompare={handleToggleCompare}
              onGoToCompare={() => navigateTo('compare')}
              onStageChange={handleStageChange}
              onSmartShortlist={handleSmartShortlist}
              onOpenCandidate={(c) => setDrawerCandidateId(c.id)}
              onRequestClearCandidates={() => setPendingClearJobId(activeJobId)}
              onGoToUpload={() => navigateTo('upload')}
              onTransferToAlternativeRole={handleTransferToAlternativeRole}
            />
          )}

          {activeModule === 'ranklist' && (
            <RankListScreen
              candidates={candidates}
              jobDescription={activeJobDescription}
              onNavigate={(mod) => navigateTo(mod)}
              onOpenCandidate={(c) => setDrawerCandidateId(c.id)}
              onStageChange={handleStageChange}
              onSmartShortlist={handleSmartShortlist}
              onCompareTopThree={(ids) => {
                setSelectedCompareIds(ids);
                navigateTo('compare');
              }}
              onRequestClearCandidates={() => setPendingClearJobId(activeJobId)}
            />
          )}

          {activeModule === 'pipeline' && (
            <HiringPipeline
              candidates={candidates}
              jobDescription={activeJobDescription}
              onStageChange={handleStageChange}
              onOpenCandidate={(c) => setDrawerCandidateId(c.id)}
              onBulkEmailSent={(count, subject) => {
                pushActivity(
                  activeJobDescription.title,
                  `Sent bulk outreach ("${subject}") to ${count} shortlisted candidate(s).`
                );
                pushToast(
                  `Interview invitations queued for ${count} candidate${count === 1 ? '' : 's'}`,
                  `Subject: "${subject}"`,
                  'success'
                );
              }}
            />
          )}

          {activeModule === 'compare' && (
            <SideBySideComparison
              candidates={candidates}
              selectedCompareIds={selectedCompareIds}
              onSetCompareIds={setSelectedCompareIds}
              jobDescription={activeJobDescription}
              onOpenCandidate={(c) => setDrawerCandidateId(c.id)}
            />
          )}
        </main>
      </div>

      <CandidateDrawer
        candidate={drawerCandidate}
        activeJobTitle={activeJobDescription.title}
        alternativeFit={drawerAlternativeFit}
        onClose={() => setDrawerCandidateId(null)}
        onStageChange={handleStageChange}
        isSelectedForCompare={
          drawerCandidate ? selectedCompareIds.includes(drawerCandidate.id) : false
        }
        onToggleCompare={handleToggleCompare}
        onTransferToAlternativeRole={handleTransferToAlternativeRole}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <JobDescriptionModal
        open={jdModal.open}
        mode={jdModal.mode}
        initialJob={jdModal.job}
        existingCandidateCount={jdModal.job ? (candidatesByJob[jdModal.job.id] ?? []).length : 0}
        mapsAvailable={Boolean(mapsApiKey)}
        onClose={() => setJdModal((prev) => ({ ...prev, open: false }))}
        onCreate={handleCreateCustomJob}
        onUpdate={handleSaveUpdatedJob}
      />

      {pendingClearJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111936]/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-workspace-title"
        >
          <div className="bg-white border border-[#C2C7D6] rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E4EC] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 id="clear-workspace-title" className="font-display text-sm font-bold text-[#111936]">
                  Remove All Candidates?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingClearJobId(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#111936] hover:bg-[#FAF9F6] cursor-pointer"
                aria-label="Close confirmation modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-[#334155] leading-relaxed">
                This will remove all{' '}
                <span className="font-semibold font-mono-tabular text-[#111936]">
                  {pendingClearCount}
                </span>{' '}
                candidate{pendingClearCount === 1 ? '' : 's'} from{' '}
                <span className="font-semibold text-[#111936]">{pendingClearJob.title}</span>.
              </p>
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC] text-xs text-[#4B5563] leading-relaxed">
                The Job Description, required skills, and CGPA criteria remain intact so your team can immediately reuse this workspace for a new hiring batch.
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#FAF9F6] border-t border-[#E2E4EC] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingClearJobId(null)}
                className="px-4 py-2 text-xs font-medium text-[#334155] bg-white border border-[#E2E4EC] hover:bg-[#FAF9F6] hover:border-[#B8BDCE] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCandidates}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove All Candidates
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );

  const activeScreen = showLanding ? (
    <LandingPage
      totalJobs={jobDescriptions.length}
      totalCandidates={totalWorkspaceCandidates}
      sentinelChatOpen={sentinelChatOpen}
      onToggleSentinelChat={() => setSentinelChatOpen((prev) => !prev)}
      onGetStarted={(targetModule) => {
        if (targetModule) {
          setActiveModule(targetModule);
        }
        setShowLanding(false);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }}
    />
  ) : (
    appShell
  );

  const content = (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      <div className={sentinelChatOpen ? 'w-full md:w-1/2 min-w-0' : 'w-full min-w-0'}>
        {activeScreen}
      </div>

      {sentinelChatOpen && (
        <SentinelChatPanel
          messages={sentinelMessages}
          setMessages={setSentinelMessages}
          workspaceContext={sentinelWorkspaceContext}
          onClose={() => setSentinelChatOpen(false)}
        />
      )}
    </div>
  );

  if (mapsApiKey) {
    return <APIProvider apiKey={mapsApiKey}>{content}</APIProvider>;
  }

  return content;
}
