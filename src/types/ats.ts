export type PipelineStage = 'Applied' | 'Shortlisted' | 'Interview' | 'Offer' | 'Rejected';

export type JobType =
  | 'Hybrid'
  | 'Work from Home'
  | 'Online'
  | 'Office'
  | 'Remote'
  | 'On-Site';

export type ActiveModule =
  | 'jobs'
  | 'overview'
  | 'upload'
  | 'dashboard'
  | 'ranklist'
  | 'pipeline'
  | 'compare';

export interface CandidateProject {
  title: string;
  description: string;
  technologies?: string[];
}

export interface ProjectDeepAnalysis {
  title: string;
  description: string;
  technologies?: string[];
  uniquenessScore: number;     // 1-10 scale
  innovationScore: number;     // 1-10 scale
  societalImpactScore: number; // 1-10 scale
  feasibilityScore: number;    // 1-10 scale
  practicalityScore: number;   // 1-10 scale
  analysisSummary?: string;
}

export interface EvaluationWeights {
  skillsWeight: number;         // percentage (e.g. 25)
  projectsWeight: number;       // percentage (e.g. 25)
  experienceWeight: number;     // percentage (e.g. 20)
  academicsWeight: number;      // percentage (e.g. 15)
  achievementsWeight: number;   // percentage (e.g. 10)
  extracurricularWeight: number;// percentage (e.g. 5)
  weightRationale: string;      // subjective rationale why these weights fit the specific role
}

export interface CandidateEvaluationBreakdown {
  skillsScore: number;       // out of 30 (or weighted score)
  projectsScore: number;     // out of 25 (or weighted score)
  experienceScore: number;   // out of 20 (or weighted score)
  academicsScore: number;    // out of 15 (CGPA + 12th + 10th)
  achievementsScore: number; // out of 10
  extracurricularScore?: number; // out of 10
  projectDimensions?: {
    uniqueness: number;     // 1-10
    innovation: number;     // 1-10
    societalImpact: number; // 1-10
    feasibility: number;    // 1-10
    practicality: number;   // 1-10
  };
  academicsBreakdown?: {
    cgpaScore: number;
    twelfthScore: number;
    tenthScore: number;
    consistencyLabel: 'High Consistency' | 'Moderate Consistency' | 'Needs Attention';
  };
  weightsApplied?: EvaluationWeights;
}

export interface CandidateHolisticAnalysis {
  overallStrengths: string[];
  potentialRisksOrGaps: string[];
  roleSubjectiveFitSummary: string;
}

export type ResumeType = 'ATS-Friendly' | 'AI-Generated';

export interface ResumeAuthenticityAnalysis {
  isAiGenerated: boolean;
  resumeType: ResumeType;
  aiDetectionScore: number;
  atsFriendlinessScore: number;
  aiDetectionReasons: string[];
  rejectionReason?: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tenthPercent: number;
  twelfthPercent: number;
  cgpa: number;
  skills: string[];
  yearsOfExperience: number;
  city: string;
  graduationYear: number;
  college: string;
  currentRole: string;
  matchScore: number;
  aiSummary: string;
  matchedSkills: string[];
  missingSkills: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  stage: PipelineStage;
  resumeFileName: string;
  appliedAt: string;
  source?: 'sample' | 'uploaded';
  projects?: CandidateProject[];
  detailedProjects?: ProjectDeepAnalysis[];
  achievements?: string[];
  extracurriculars?: string[];
  scoreBreakdown?: CandidateEvaluationBreakdown;
  holisticAnalysis?: CandidateHolisticAnalysis;
  resumeType?: ResumeType;
  isAiGenerated?: boolean;
  aiDetectionScore?: number;
  atsFriendlinessScore?: number;
  aiDetectionReasons?: string[];
  rejectionReason?: string;
}

export interface AlternativeRoleFit {
  roleTitle: string;
  existingJobId?: string;
  templateId?: string;
  score: number;
  scoreDelta: number;
  matchedSkills: string[];
  reason: string;
}

export interface JobDescription {
  id: string;
  title: string;
  department: string;
  location: string;
  locationPlaceId?: string;
  jobType: JobType;
  experienceRange: string;
  minCgpa: number;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  status: 'Active' | 'Paused';
  createdAt: string;
}

export interface JdSkillSuggestion {
  skill: string;
  reason: string;
}

export interface JdIntelligenceResult {
  suggestedRequiredSkills: JdSkillSuggestion[];
  suggestedPreferredSkills: JdSkillSuggestion[];
  suggestedDescription: string;
  summaryNote: string;
}

export interface SkillValidationItem {
  input: string;
  isValid: boolean;
  canonicalName: string;
  reason: string;
  suggestions: string[];
}

export interface SkillValidationResponse {
  results: SkillValidationItem[];
}

export interface JobTemplate {
  id: string;
  label: string;
  category: string;
  title: string;
  department: string;
  location: string;
  locationPlaceId?: string;
  jobType: JobType;
  experienceRange: string;
  minCgpa: number;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
}

export interface FilterState {
  search: string;
  minCgpa: number;
  minTenth: string;
  minTwelfth: string;
  selectedSkills: string[];
  minExp: string;
  maxExp: string;
  city: string;
  graduationYear: string;
  stage: PipelineStage | 'All';
  onlyCrossRoleFit: boolean;
  resumeAuthenticityFilter?: 'All' | 'ATS-Friendly' | 'AI-Generated';
}

export interface QueuedResumeFile {
  id: string;
  file: File;
  name: string;
  size: number;
  extension: 'pdf' | 'docx';
  status?: 'queued' | 'processing' | 'done' | 'error';
  errorMessage?: string;
}

export interface ComparisonTradeOff {
  candidateId: string;
  candidateName: string;
  strength: string;
  caveat: string;
}

export interface ComparisonRecommendation {
  recommendedCandidateId: string;
  recommendedCandidateName: string;
  headline: string;
  rationale: string;
  tradeOffs: ComparisonTradeOff[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'info' | 'warning' | 'error';
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  roleTitle: string;
  message: string;
}

export interface SentinelChatImage {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface SentinelChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: SentinelChatImage[];
  timestamp: string;
  isError?: boolean;
}

export interface SentinelWorkspaceContext {
  currentView: 'landing' | ActiveModule;
  activeJob?: {
    title: string;
    department: string;
    location: string;
    jobType: string;
    experienceRange: string;
    minCgpa: number;
    requiredSkills: string[];
    preferredSkills: string[];
    description: string;
    status: string;
  };
  allJobsSummary: Array<{
    title: string;
    department: string;
    location: string;
    jobType: string;
    status: string;
    candidateCount: number;
  }>;
  activeCandidatesSummary: Array<{
    fullName: string;
    currentRole: string;
    matchScore: number;
    stage: string;
    yearsOfExperience: number;
    cgpa: number;
    city: string;
    matchedSkills: string[];
    missingSkills: string[];
    tenthPercent?: number;
    twelfthPercent?: number;
    college?: string;
    projects?: CandidateProject[];
    achievements?: string[];
    scoreBreakdown?: CandidateEvaluationBreakdown;
  }>;
}

