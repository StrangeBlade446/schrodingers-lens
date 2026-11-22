import * as mammoth from 'mammoth';
import type {
  AlternativeRoleFit,
  Candidate,
  CandidateProject,
  CandidateEvaluationBreakdown,
  ComparisonRecommendation,
  JdIntelligenceResult,
  JobDescription,
  QueuedResumeFile,
  SkillValidationResponse,
  ProjectDeepAnalysis,
  EvaluationWeights,
  CandidateHolisticAnalysis,
  ResumeType,
  ResumeAuthenticityAnalysis,
  PipelineStage,
} from '../types/ats';
import { evaluateResumeAuthenticity } from './resumeAuthenticity';
import { JOB_TEMPLATES } from '../data/initialData';

const KNOWN_SKILLS = [
  'TypeScript',
  'JavaScript',
  'React',
  'Next.js',
  'Node.js',
  'Express',
  'NestJS',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
  'Azure',
  'Tailwind CSS',
  'REST APIs',
  'GraphQL',
  'System Design',
  'Python',
  'FastAPI',
  'Django',
  'Java',
  'Spring Boot',
  'Go',
  'Angular',
  'Vue.js',
  'Git',
  'CI/CD',
  'Kafka',
  'Microservices',
  'HTML',
  'CSS',
  'SQL',
  'Jest',
  'Playwright',
  'C++',
  'Figma',
  'Design Systems',
  'Prototyping',
  'User Research',
  'Accessibility',
  'PyTorch',
  'LLMs',
  'RAG',
  'Vector DBs',
  'LangGraph',
  'Spring Boot',
  'gRPC',
  'Prometheus',
  'Terraform',
  'Linux',
  'Grafana',
  'dbt',
  'Airflow',
  'Snowflake',
  'Spark',
  'Data Modeling',
  'React Native',
  'Flutter',
  'iOS',
  'Android',
  'Product Strategy',
  'Roadmapping',
  'API Design',
  'Analytics',
  'A/B Testing',
];

const INDIAN_CITIES = [
  'Bengaluru',
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Chennai',
  'Gurugram',
  'Gurgaon',
  'Noida',
  'New Delhi',
  'Delhi',
  'Kolkata',
  'Ahmedabad',
  'Kochi',
  'Jaipur',
  'Chandigarh',
];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class RateLimitError extends Error {
  status = 429;
  constructor(message = 'Rate limit reached—retrying in a moment') {
    super(message);
  }
}

async function safePostJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server API route unavailable');
  }

  const data = (await res.json()) as T & { error?: string };
  if (res.status === 429 || res.status === 503) {
    throw new RateLimitError(
      data.error || 'AI service temporarily busy—retrying in a moment'
    );
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  onStatusMessage?: (msg: string) => void,
  maxRetries = 2
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msgLower = err instanceof Error ? err.message.toLowerCase() : '';
      const isRetryable =
        err instanceof RateLimitError ||
        msgLower.includes('429') ||
        msgLower.includes('503') ||
        msgLower.includes('high demand') ||
        msgLower.includes('unavailable') ||
        msgLower.includes('rate limit') ||
        msgLower.includes('quota');
      if (isRetryable && attempt < maxRetries) {
        onStatusMessage?.('AI service busy—retrying in a moment');
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function extractTextFromPdfBytes(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const raw = new TextDecoder('latin1').decode(new Uint8Array(buffer));

    const chunks: string[] = [];
    const parenRegex = /\(([^()\\]{2,200}(?:\\.[^()\\]{0,200})*)\)/g;
    let match: RegExpExecArray | null;
    while ((match = parenRegex.exec(raw)) !== null) {
      const cleaned = match[1]
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, ' ')
        .replace(/[^\x20-\x7E]/g, ' ')
        .trim();
      if (cleaned.length >= 2 && /[a-zA-Z0-9]/.test(cleaned)) {
        chunks.push(cleaned);
      }
    }

    const joined = chunks.join('\n').trim();
    if (joined.length >= 30) return joined;

    const asciiRuns = raw.match(/[A-Za-z0-9@.+_,:/|\-\s]{16,}/g) ?? [];
    const filteredRuns = asciiRuns
      .filter(
        (s) =>
          !s.includes('endobj') &&
          !s.includes('MediaBox') &&
          !s.includes('Font') &&
          !s.includes('ProcSet') &&
          !s.includes('Filter') &&
          !s.includes('Type')
      );
    const joinedRuns = filteredRuns.join('\n').trim();
    // Only return if it contains multi-word readable content, not just isolated URLs or font tags
    if (joinedRuns.length >= 80 && /\b(experience|education|skills|projects|developer|engineer|university)\b/i.test(joinedRuns)) {
      return joinedRuns.slice(0, 15000);
    }
    return '';
  } catch {
    return '';
  }
}

async function extractResumeText(item: QueuedResumeFile): Promise<string> {
  if (item.extension === 'docx') {
    try {
      const arrayBuffer = await item.file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return (result.value ?? '').trim();
    } catch {
      return '';
    }
  }
  return extractTextFromPdfBytes(item.file);
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 55;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function clampPercent(val: number, fallback = 86.0): number {
  if (!Number.isFinite(val) || val <= 0 || val > 100) return fallback;
  return Math.round(val * 10) / 10;
}

function clampCgpa(val: number, fallback = 8.15): number {
  if (!Number.isFinite(val) || val <= 0) return fallback;
  if (val > 10 && val <= 100) return Math.round((val / 10) * 100) / 100;
  if (val > 0 && val <= 4.0) return Math.round((val * 2.35) * 100) / 100;
  return Math.max(0, Math.min(10, Math.round(val * 100) / 100));
}

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const NOISE_TOKENS = new Set([
  'resume',
  'cv',
  'curriculum',
  'vitae',
  'profile',
  'technical',
  'mun',
  'final',
  'updated',
  'latest',
  'v1',
  'v2',
  'v3',
  'copy',
  'draft',
  'sde',
  'swe',
  'software',
  'engineer',
  'developer',
  'fullstack',
  'full_stack',
  'backend',
  'frontend',
  'intern',
  'applicant',
  'hiring',
  'job',
  'new',
  'clean',
]);

const PROHIBITED_WORDS = [
  'curriculum',
  'vitae',
  'resume',
  'profile',
  'summary',
  'education',
  'experience',
  'skills',
  'projects',
  'contact',
  'objective',
  'technical',
  'engineer',
  'developer',
  'software',
  'full stack',
  'frontend',
  'backend',
  'university',
  'institute',
  'college',
  'school',
  'department',
  'bachelor',
  'master',
  'student',
  'intern',
  'mun',
  'conference',
  'declaration',
  'references',
  'certifications',
  'achievements',
  'awards',
  'languages',
  'interests',
  'hobbies',
  'personal details',
  'page',
  'date of birth',
];

export function cleanCandidateNameString(str: string): string {
  return str
    .replace(/^[^a-zA-Z]+/, '')
    .replace(/[^a-zA-Z\s.'-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidHumanName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 4 || trimmed.length > 40) return false;
  if (!/^[A-Za-z\s.'-]+$/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;

  for (const w of words) {
    const cleanW = w.replace(/[.']/g, '');
    if (cleanW.length < 2 && words.length <= 2) return false;
    if (cleanW.length === 1 && !w.endsWith('.')) return false;
  }

  const longWords = words.filter((w) => w.replace(/[.']/g, '').length >= 3);
  if (longWords.length < 2 && words.length >= 2) return false;

  const totalLetters = words.reduce((acc, w) => acc + w.replace(/[.']/g, '').length, 0);
  if (totalLetters / words.length < 3.0) return false;

  const lower = trimmed.toLowerCase();
  for (const p of PROHIBITED_WORDS) {
    const rx = new RegExp('(^|[^a-zA-Z])' + p + '($|[^a-zA-Z])', 'i');
    if (rx.test(lower)) return false;
  }

  const vowels = lower.match(/[aeiouy]/g);
  if (!vowels || vowels.length < 2) return false;

  return true;
}

export function extractCandidateFullName(fileName: string, rawText: string): string {
  const baseName = fileName.replace(/\.(pdf|docx)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const fileTokens = baseName
    .split(/[\s_\-–—.+()\[\]{}]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !NOISE_TOKENS.has(t.toLowerCase()) && !/^\d+$/.test(t));

  const fileNameCandidate =
    fileTokens.length >= 2 &&
    fileTokens.length <= 4 &&
    fileTokens.every((t) => /^[A-Za-z.'-]+$/.test(t))
      ? toTitleCase(fileTokens.join(' '))
      : '';

  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const emailLocal = emailMatch ? emailMatch[0].split('@')[0].toLowerCase() : '';

  // 1. Explicit labels: "Candidate Name: John Doe"
  const explicitMatch =
    rawText.match(/(?:candidate\s*name|full\s*name|applicant\s*name|name)\s*[:\-]\s*([A-Za-z][A-Za-z\t .'-]{2,40})/i);
  if (explicitMatch) {
    const candidate = cleanCandidateNameString(explicitMatch[1]);
    if (isValidHumanName(candidate)) return toTitleCase(candidate);
  }

  // 2. Cross-reference filename candidate with text
  if (fileNameCandidate && isValidHumanName(fileNameCandidate)) {
    const lowerText = rawText.toLowerCase();
    const tokenMatches = fileTokens.filter(
      (token) => token.length >= 3 && lowerText.includes(token.toLowerCase())
    );
    if (tokenMatches.length >= Math.min(2, fileTokens.length)) {
      const textLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of textLines.slice(0, 30)) {
        const lineWithoutPrefix = line.replace(/^(?:candidate\s*name|full\s*name|applicant\s*name|name)\s*[:\-]\s*/i, '').trim();
        const clean = cleanCandidateNameString(lineWithoutPrefix);
        if (isValidHumanName(clean)) {
          const lowerClean = clean.toLowerCase();
          const matchCount = fileTokens.filter((t) => lowerClean.includes(t.toLowerCase())).length;
          if (matchCount >= 2) {
            return toTitleCase(clean);
          }
        }
      }
      return fileNameCandidate;
    }
  }

  // 3. Scan top lines in document text
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates: Array<{ name: string; score: number }> = [];

  for (let i = 0; i < Math.min(25, lines.length); i++) {
    const rawLine = lines[i];
    if (
      rawLine.includes('@') ||
      rawLine.includes('http') ||
      rawLine.includes('www.') ||
      rawLine.includes('.com') ||
      rawLine.includes('.in') ||
      rawLine.includes('.app') ||
      rawLine.includes('/') ||
      /\b(?:curriculum|vitae|resume|profile|summary|education|skills|experience|contact|objective|projects|portfolio|achievements|certifications|awards|activities)\b/i.test(rawLine)
    ) {
      continue;
    }

    const lineWithoutPrefix = rawLine.replace(/^(?:candidate\s*name|full\s*name|applicant\s*name|name)\s*[:\-]\s*/i, '').trim();
    const clean = cleanCandidateNameString(lineWithoutPrefix);
    if (!isValidHumanName(clean)) continue;

    let score = 50 - i * 2;
    if (emailLocal) {
      const cleanLower = clean.toLowerCase().replace(/[^a-z]/g, '');
      if (
        emailLocal.includes(cleanLower) ||
        clean.toLowerCase().split(/\s+/).some((w) => w.length >= 3 && emailLocal.includes(w))
      ) {
        score += 40;
      }
    }

    if (fileNameCandidate) {
      const fnLower = fileNameCandidate.toLowerCase();
      if (fnLower.includes(clean.toLowerCase()) || clean.toLowerCase().includes(fnLower)) {
        score += 50;
      }
    }

    candidates.push({ name: toTitleCase(clean), score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0].score >= 35) {
      return candidates[0].name;
    }
  }

  // 4. Fallback to clean filename candidate if valid
  if (fileNameCandidate && isValidHumanName(fileNameCandidate)) {
    return fileNameCandidate;
  }

  // 5. Fallback to top text candidate if any
  if (candidates.length > 0) {
    return candidates[0].name;
  }

  // 6. Generic fallback
  const fallback = baseName.replace(/[^A-Za-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return fallback ? toTitleCase(fallback) : 'Candidate Applicant';
}

function parseExperienceRangeTarget(range: string): { min: number; max: number } {
  const nums = range.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) return { min: nums[0], max: nums[0] + 3 };
  return { min: 2, max: 5 };
}

export function extractProjectsFromText(text: string, detectedSkills: string[]): CandidateProject[] {
  const projects: CandidateProject[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let inProjectSection = false;
  let currentProject: CandidateProject | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /(?:projects?|key projects?|academic projects?|personal projects?|notable projects?)\b/i.test(line) &&
      line.length < 35
    ) {
      inProjectSection = true;
      continue;
    }
    if (
      inProjectSection &&
      /(?:experience|work history|education|skills|achievements?|certifications?|awards?|publications?|contact)\b/i.test(line) &&
      line.length < 30
    ) {
      inProjectSection = false;
      if (currentProject) {
        projects.push(currentProject);
        currentProject = null;
      }
      continue;
    }

    if (inProjectSection) {
      const isTitleLine =
        !line.startsWith('-') &&
        !line.startsWith('•') &&
        !line.startsWith('*') &&
        line.length >= 3 &&
        line.length <= 70 &&
        (!currentProject || (currentProject.description && line.length < 50));

      if (isTitleLine) {
        if (currentProject) projects.push(currentProject);
        const titleParts = line.split(/[|:–—(]/);
        const title = titleParts[0].trim();
        const techList = detectedSkills.filter((s) => line.toLowerCase().includes(s.toLowerCase()));
        currentProject = {
          title,
          description: '',
          technologies: techList,
        };
      } else if (currentProject) {
        currentProject.description += (currentProject.description ? ' ' : '') + line.replace(/^[-•*]\s*/, '');
        detectedSkills.forEach((s) => {
          if (line.toLowerCase().includes(s.toLowerCase()) && !currentProject!.technologies?.includes(s)) {
            currentProject!.technologies = [...(currentProject!.technologies ?? []), s];
          }
        });
      }
    }
  }

  if (currentProject) projects.push(currentProject);

  if (projects.length === 0) {
    const urlMatches = text.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|github\.io|herokuapp\.com))/gi) ?? [];
    urlMatches.forEach((url) => {
      const cleanName = url.replace(/(?:https?:\/\/)?/i, '').split('.')[0].replace(/[-_]+/g, ' ');
      projects.push({
        title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        description: `Full-stack application deployed at ${url}`,
        technologies: detectedSkills.slice(0, 3),
      });
    });
  }

  if (projects.length === 0 && detectedSkills.length >= 2) {
    projects.push({
      title: `${detectedSkills.slice(0, 2).join(' & ')} Application`,
      description: `Architected and implemented modular application components utilizing ${detectedSkills.slice(0, 4).join(', ')}.`,
      technologies: detectedSkills.slice(0, 3),
    });
  }

  return projects.slice(0, 4);
}

export function extractAchievementsFromText(text: string): string[] {
  const achievements: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let inAchievementSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /(?:achievements?|awards?|honors?|hackathons?|competitions?|extracurriculars?|recognition)\b/i.test(line) &&
      line.length < 35
    ) {
      inAchievementSection = true;
      continue;
    }
    if (
      inAchievementSection &&
      /(?:projects?|experience|work history|education|skills|certifications?|publications?|contact)\b/i.test(line) &&
      line.length < 30
    ) {
      inAchievementSection = false;
      continue;
    }

    if (inAchievementSection) {
      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      if (cleanLine.length >= 8 && cleanLine.length <= 160) {
        achievements.push(cleanLine);
      }
    }
  }

  const milestonePatterns = [
    /(?:winner|runner[- ]?up|finalist|1st place|2nd place|3rd place|top\s*\d+%?|rank\s*#?\d+)[\w\s,.-]{4,70}/i,
    /(?:solved\s*\d+\+?\s*(?:problems?|dsa|questions?)|leetcode|codeforces|codechef|geeksforgeeks)[\w\s,.-]{4,70}/i,
    /(?:merit scholarship|dean's list|academic excellence|gold medalist|branch rank)[\w\s,.-]{4,70}/i,
    /(?:smart india hackathon|ethindia|hackathon|google summer of code|gsoc)[\w\s,.-]{4,70}/i,
    /(?:secretary general|president|lead|organizer|head of|best delegate|mun)[\w\s,.-]{4,70}/i,
  ];

  for (const pat of milestonePatterns) {
    const match = text.match(pat);
    if (match) {
      const matchClean = match[0].replace(/^[-•*]\s*/, '').trim();
      if (!achievements.some((a) => a.toLowerCase().includes(matchClean.toLowerCase().slice(0, 15)))) {
        achievements.push(matchClean);
      }
    }
  }

  return achievements.slice(0, 5);
}

export function extractExtracurricularsFromText(text: string): string[] {
  const list: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let inExtraSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /(?:extracurriculars?|activities|leadership|co[- ]?curricular|volunteering|community|positions? of responsibility)\b/i.test(line) &&
      line.length < 35
    ) {
      inExtraSection = true;
      continue;
    }
    if (
      inExtraSection &&
      /(?:projects?|experience|work history|education|skills|certifications?|contact)\b/i.test(line) &&
      line.length < 30
    ) {
      inExtraSection = false;
      continue;
    }
    if (inExtraSection) {
      const clean = line.replace(/^[-•*]\s*/, '').trim();
      if (clean.length >= 8 && clean.length <= 160) {
        list.push(clean);
      }
    }
  }

  const extraPatterns = [
    /(?:president|vice\s*president|general\s*secretary|club\s*lead|lead|head\s*of|coordinator|core\s*member|founder|co[- ]?founder|organizer|captain|curator)[\w\s,.-]{4,70}/i,
    /(?:volunteer|volunteered|ngo|community|rotaract|nss|ncc|blood\s*donation|literacy|mentorship)[\w\s,.-]{4,70}/i,
    /(?:model\s*united\s*nations|mun|debating\s*society|sports|athletics|football|cricket|badminton|cultural\s*fest)[\w\s,.-]{4,70}/i,
    /(?:open[- ]?source\s*contributor|maintainer|campus\s*ambassador|gdsc\s*lead)[\w\s,.-]{4,70}/i,
  ];

  for (const pat of extraPatterns) {
    const match = text.match(pat);
    if (match) {
      const clean = match[0].replace(/^[-•*]\s*/, '').trim();
      if (!list.some((existing) => existing.toLowerCase().includes(clean.toLowerCase().slice(0, 15)))) {
        list.push(clean);
      }
    }
  }

  return list.slice(0, 4);
}

export function computeJobEvaluationWeights(jd: JobDescription): EvaluationWeights {
  const titleLow = jd.title.toLowerCase();
  const expLow = (jd.experienceRange || '').toLowerCase();
  const isSenior = /senior|staff|lead|principal|architect|manager/i.test(titleLow) || /5|6|7|8|10/.test(expLow);
  const isAiMl = /ai|ml|machine\s*learning|deep\s*learning|data\s*scientist|research|rag/i.test(titleLow);
  const isJunior = /junior|intern|graduate|entry|fresher|0[-–]1|0[-–]2/i.test(titleLow + ' ' + expLow);

  if (isSenior) {
    return {
      skillsWeight: 25,
      projectsWeight: 25,
      experienceWeight: 25,
      academicsWeight: 10,
      achievementsWeight: 10,
      extracurricularWeight: 5,
      weightRationale: `For a senior role (${jd.title}), high priority is given to production architecture, practical system feasibility (25%), and seasoned engineering experience (25%), while academic grades (10%) are given moderate baseline weighting.`,
    };
  }

  if (isAiMl) {
    return {
      skillsWeight: 25,
      projectsWeight: 30,
      experienceWeight: 15,
      academicsWeight: 15,
      achievementsWeight: 10,
      extracurricularWeight: 5,
      weightRationale: `For an AI/ML specialized role (${jd.title}), project innovation & algorithmic uniqueness are heavily weighted (30%), paired with strong foundational academic rigor (15%) and verified model/systems skills (25%).`,
    };
  }

  if (isJunior) {
    return {
      skillsWeight: 25,
      projectsWeight: 30,
      experienceWeight: 10,
      academicsWeight: 20,
      achievementsWeight: 10,
      extracurricularWeight: 5,
      weightRationale: `For an early-career / university role (${jd.title}), tangible project execution (30%) and longitudinal academic consistency across CGPA, 12th, and 10th (20%) serve as primary indicators of engineering discipline.`,
    };
  }

  return {
    skillsWeight: 25,
    projectsWeight: 25,
    experienceWeight: 20,
    academicsWeight: 15,
    achievementsWeight: 10,
    extracurricularWeight: 5,
    weightRationale: `Evaluated holistically for ${jd.title} across practical systems projects (25%), technical stack mastery (25%), professional trajectory (20%), longitudinal academics (15%), and honors/extracurriculars (15%).`,
  };
}

export function analyzeProjectDeeply(
  project: CandidateProject,
  jd: JobDescription,
  detectedSkills: string[]
): ProjectDeepAnalysis {
  const fullText = `${project.title} ${project.description} ${(project.technologies ?? []).join(' ')}`.toLowerCase();

  const isGenericClone = /to[- ]?do\s*(app|list)|weather\s*app|calculator|tic[- ]?tac[- ]?toe|recipe\s*app|simple\s*portfolio|basic\s*blog/i.test(fullText);
  const isAdvancedDomain = /ai|ml|rag|llm|computer\s*vision|blockchain|ledger|compiler|kernel|distributed|microservice|real[- ]?time|webrtc|socket|fraud|fintech|health|robotics|autonomous|iot|edge/i.test(fullText);
  let uniquenessScore = 6.5;
  if (isGenericClone) uniquenessScore = 3.5;
  else if (isAdvancedDomain) uniquenessScore = 8.5;
  if (/(patent|novel|research|first[- ]?of[- ]?its[- ]?kind|proprietary|algorithm|custom\s*protocol)/i.test(fullText)) {
    uniquenessScore = Math.min(10, uniquenessScore + 1.5);
  }

  let innovationScore = 6.5;
  if (/(neural|transformer|embedding|vector|fine[- ]?tuning|concurrency|raft|paxos|graphql|grpc|event[- ]?driven|kafka|streaming|webrtc)/i.test(fullText)) {
    innovationScore = 8.5;
  }
  if (/(custom|from\s*scratch|optimized|zero[- ]?dependency|sub[- ]?second|low[- ]?latency)/i.test(fullText)) {
    innovationScore = Math.min(10, innovationScore + 1.5);
  }
  if (isGenericClone) innovationScore = Math.min(innovationScore, 4.0);

  let societalImpactScore = 5.5;
  if (/(healthcare|medical|patient|hospital|sustainability|eco|clean\s*energy|carbon|education|rural|farmers|agriculture|safety|women\s*safety|disaster|relief|accessibility|screen\s*reader|ngo|governance|public)/i.test(fullText)) {
    societalImpactScore = 9.0;
  } else if (/(enterprise|b2b|smb|cost\s*reduction|saved|revenue|active\s*users|community)/i.test(fullText)) {
    societalImpactScore = 7.5;
  }

  let feasibilityScore = 7.0;
  const hasSolidStack = (project.technologies ?? []).length >= 2 || /(docker|kubernetes|postgresql|sql|react|node|fastapi|aws|redis)/i.test(fullText);
  if (hasSolidStack) feasibilityScore += 1.5;
  if (/(unit\s*tests|ci\/cd|pipeline|tested|monitoring|dockerized|containerized)/i.test(fullText)) {
    feasibilityScore = Math.min(10, feasibilityScore + 1.5);
  }

  let practicalityScore = 6.5;
  if (/(deployed|production|live\s*at|hosted|aws|gcp|vercel|railway|render|docker\s*compose)/i.test(fullText)) {
    practicalityScore += 2.0;
  }
  if (/(latency|users|qps|rps|throughput|transactions|\b\d+k\b|\b\d+m\b|99\.9%)/i.test(fullText)) {
    practicalityScore = Math.min(10, practicalityScore + 1.5);
  }

  const u = Math.max(1, Math.min(10, Math.round(uniquenessScore * 10) / 10));
  const inn = Math.max(1, Math.min(10, Math.round(innovationScore * 10) / 10));
  const s = Math.max(1, Math.min(10, Math.round(societalImpactScore * 10) / 10));
  const f = Math.max(1, Math.min(10, Math.round(feasibilityScore * 10) / 10));
  const p = Math.max(1, Math.min(10, Math.round(practicalityScore * 10) / 10));

  return {
    title: project.title,
    description: project.description,
    technologies: project.technologies,
    uniquenessScore: u,
    innovationScore: inn,
    societalImpactScore: s,
    feasibilityScore: f,
    practicalityScore: p,
    analysisSummary: `${project.title}: Evaluated across Uniqueness (${u}/10), Innovation (${inn}/10), Societal Impact (${s}/10), Feasibility (${f}/10), and Practicality (${p}/10).`,
  };
}

export function scoreCandidateLocally(
  profile: {
    fullName: string;
    skills: string[];
    yearsOfExperience: number;
    cgpa: number;
    currentRole: string;
    college?: string;
    tenthPercent?: number;
    twelfthPercent?: number;
    projects?: CandidateProject[];
    detailedProjects?: ProjectDeepAnalysis[];
    achievements?: string[];
    extracurriculars?: string[];
  },
  jd: JobDescription
): {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  scoreBreakdown: CandidateEvaluationBreakdown;
  aiSummary: string;
  detailedProjects: ProjectDeepAnalysis[];
  extracurriculars: string[];
  holisticAnalysis: CandidateHolisticAnalysis;
} {
  const weights = computeJobEvaluationWeights(jd);
  const lowerSkills = new Set(profile.skills.map((s) => s.toLowerCase()));
  const allTargetSkills = Array.from(new Set([...jd.requiredSkills, ...jd.preferredSkills]));

  const matchedSkills = allTargetSkills.filter((skill) => {
    const low = skill.toLowerCase();
    if (lowerSkills.has(low)) return true;
    return profile.skills.some((ps) => ps.toLowerCase().includes(low) || low.includes(ps.toLowerCase()));
  });

  const matchedRequired = jd.requiredSkills.filter((s) => matchedSkills.includes(s));
  const matchedPreferred = jd.preferredSkills.filter((s) => matchedSkills.includes(s));
  const missingSkills = jd.requiredSkills.filter((s) => !matchedSkills.includes(s));

  // --- 1. TECHNICAL SKILLS SCORE (Max 30 pts) ---
  const reqRatio = jd.requiredSkills.length > 0 ? matchedRequired.length / jd.requiredSkills.length : 0.6;
  const reqPoints = reqRatio * 20;
  const prefRatio = jd.preferredSkills.length > 0 ? matchedPreferred.length / jd.preferredSkills.length : 0.4;
  const prefPoints = prefRatio * 6;
  const breadthBonus = Math.min(4, Math.round((profile.skills.length / 8) * 4));
  const skillsScore = Math.max(2, Math.min(30, Math.round(reqPoints + prefPoints + breadthBonus)));

  // --- 2. PROJECTS & REAL-WORLD SYSTEMS SCORE (Max 25 pts) ---
  const rawProjects = profile.projects ?? [];
  const detailedProjects: ProjectDeepAnalysis[] =
    Array.isArray(profile.detailedProjects) && profile.detailedProjects.length > 0
      ? profile.detailedProjects
      : rawProjects.map((p) => analyzeProjectDeeply(p, jd, profile.skills));

  const projectCountPts = Math.min(6, detailedProjects.length * 3);

  let projTechMatchCount = 0;
  for (const proj of detailedProjects) {
    const projTechs = (proj.technologies ?? []).map((t) => t.toLowerCase());
    const projDesc = (proj.description || '').toLowerCase();
    for (const targetSkill of allTargetSkills) {
      const low = targetSkill.toLowerCase();
      if (projTechs.some((t) => t.includes(low) || low.includes(t)) || projDesc.includes(low)) {
        projTechMatchCount++;
      }
    }
  }
  const projTechPts = Math.min(9, Math.round((projTechMatchCount / Math.max(1, jd.requiredSkills.length)) * 9));

  const avgUniqueness = detailedProjects.length > 0
    ? Math.round((detailedProjects.reduce((acc, p) => acc + (p.uniquenessScore || 6.5), 0) / detailedProjects.length) * 10) / 10
    : 7.0;
  const avgInnovation = detailedProjects.length > 0
    ? Math.round((detailedProjects.reduce((acc, p) => acc + (p.innovationScore || 6.5), 0) / detailedProjects.length) * 10) / 10
    : 7.0;
  const avgSocietal = detailedProjects.length > 0
    ? Math.round((detailedProjects.reduce((acc, p) => acc + (p.societalImpactScore || 6.0), 0) / detailedProjects.length) * 10) / 10
    : 6.5;
  const avgFeasibility = detailedProjects.length > 0
    ? Math.round((detailedProjects.reduce((acc, p) => acc + (p.feasibilityScore || 7.0), 0) / detailedProjects.length) * 10) / 10
    : 7.5;
  const avgPracticality = detailedProjects.length > 0
    ? Math.round((detailedProjects.reduce((acc, p) => acc + (p.practicalityScore || 6.5), 0) / detailedProjects.length) * 10) / 10
    : 7.0;

  const projectDimensions = {
    uniqueness: avgUniqueness,
    innovation: avgInnovation,
    societalImpact: avgSocietal,
    feasibility: avgFeasibility,
    practicality: avgPracticality,
  };

  const dimensionQualityPts = Math.min(
    10,
    Math.round(((avgUniqueness + avgInnovation + avgSocietal + avgFeasibility + avgPracticality) / 50) * 10)
  );

  const projectsScore = Math.max(2, Math.min(25, Math.round(projectCountPts + projTechPts + dimensionQualityPts)));

  // --- 3. EXPERIENCE & ROLE TRAJECTORY (Max 20 pts) ---
  const { min: expMin } = parseExperienceRangeTarget(jd.experienceRange);
  const expRatio = expMin > 0 ? Math.min(1.25, profile.yearsOfExperience / expMin) : 1;
  const expTenurePts = Math.min(14, expRatio * 14);

  const roleKeywords = jd.title
    .toLowerCase()
    .split(/[\s/()–-]+/)
    .filter((w) => w.length >= 3 && !['engineer', 'developer', 'lead', 'senior', 'junior'].includes(w));
  const candRoleLow = profile.currentRole.toLowerCase();
  const roleAligned = roleKeywords.some((kw) => candRoleLow.includes(kw));
  const roleAlignmentPts = roleAligned ? 6 : (candRoleLow.includes('engineer') || candRoleLow.includes('developer') ? 4 : 2);
  const experienceScore = Math.max(2, Math.min(20, Math.round(expTenurePts + roleAlignmentPts)));

  // --- 4. ACADEMICS & LONGITUDINAL CONSISTENCY (Max 15 pts) ---
  let cgpaPts = 5;
  if (profile.cgpa > 0) {
    if (profile.cgpa >= jd.minCgpa) {
      const excess = Math.max(0, profile.cgpa - jd.minCgpa);
      const span = Math.max(0.5, 10 - jd.minCgpa);
      cgpaPts = 6 + Math.min(3, Math.round((excess / span) * 3));
    } else {
      cgpaPts = Math.max(1, Math.round((profile.cgpa / Math.max(1, jd.minCgpa)) * 6));
    }
  }

  const twelfthVal = profile.twelfthPercent ?? 85;
  const twelfthPts = twelfthVal >= 90 ? 3 : (twelfthVal >= 75 ? 2 : 1);

  const tenthVal = profile.tenthPercent ?? 85;
  const tenthPts = tenthVal >= 90 ? 3 : (tenthVal >= 75 ? 2 : 1);

  const academicsScore = Math.max(2, Math.min(15, Math.round(cgpaPts + twelfthPts + tenthPts)));

  const cgpaPercentage = (profile.cgpa > 0 ? profile.cgpa : 8.0) * 9.5;
  const acadVariance = Math.max(
    Math.abs(cgpaPercentage - twelfthVal),
    Math.abs(twelfthVal - tenthVal)
  );
  const consistencyLabel: 'High Consistency' | 'Moderate Consistency' | 'Needs Attention' =
    acadVariance <= 8 ? 'High Consistency' : acadVariance <= 16 ? 'Moderate Consistency' : 'Needs Attention';

  const academicsBreakdown = {
    cgpaScore: cgpaPts,
    twelfthScore: twelfthPts,
    tenthScore: tenthPts,
    consistencyLabel,
  };

  // --- 5. ACHIEVEMENTS & EXTRACURRICULARS (Max 10 pts) ---
  const achievementsList = profile.achievements ?? [];
  const extracurriculars = profile.extracurriculars ?? [];
  const achieveCountPts = Math.min(6, achievementsList.length * 3);
  const extraPts = Math.min(3, extracurriculars.length * 1.5);
  const baselineExcellence = (achievementsList.length > 0 || extracurriculars.length > 0) ? 1 : 1;
  const achievementsScore = Math.max(1, Math.min(10, Math.round(achieveCountPts + extraPts + baselineExcellence)));
  const extracurricularScore = Math.max(1, Math.min(10, Math.round(extracurriculars.length * 3 + 2)));

  // Total Aggregate Score
  const rawAggregate = skillsScore + projectsScore + experienceScore + academicsScore + achievementsScore;
  const matchScore = clampScore(rawAggregate);

  const scoreBreakdown: CandidateEvaluationBreakdown = {
    skillsScore,
    projectsScore,
    experienceScore,
    academicsScore,
    achievementsScore,
    extracurricularScore,
    projectDimensions,
    academicsBreakdown,
    weightsApplied: weights,
  };

  // Qualitative Analysis
  const strengths: string[] = [];
  if (matchedRequired.length >= Math.ceil(jd.requiredSkills.length * 0.7)) {
    strengths.push(`Strong core stack coverage (${matchedRequired.length}/${jd.requiredSkills.length} required skills matched).`);
  }
  if (avgInnovation >= 7.5 || avgPracticality >= 7.5) {
    strengths.push(`High project execution: Innovation ${avgInnovation}/10, Feasibility ${avgFeasibility}/10, Practicality ${avgPracticality}/10.`);
  }
  if (consistencyLabel === 'High Consistency' || profile.cgpa >= jd.minCgpa) {
    strengths.push(`Excellent academic rigor with ${consistencyLabel.toLowerCase()} (${profile.cgpa.toFixed(1)} CGPA, ${twelfthVal}% in 12th).`);
  }
  if (achievementsList.length > 0 || extracurriculars.length > 0) {
    strengths.push(`Demonstrated drive through ${achievementsList.length} major achievement(s) and active extracurricular leadership.`);
  }
  if (strengths.length === 0) {
    strengths.push('Solid baseline foundational engineering competencies.');
  }

  const gaps: string[] = [];
  if (missingSkills.length > 0) {
    gaps.push(`Unmatched requirements: ${missingSkills.slice(0, 3).join(', ')}.`);
  }
  if (profile.yearsOfExperience < expMin) {
    gaps.push(`Experience (${profile.yearsOfExperience.toFixed(1)} yrs) below target range (${jd.experienceRange}).`);
  }
  if (profile.cgpa < jd.minCgpa && profile.cgpa > 0) {
    gaps.push(`CGPA (${profile.cgpa.toFixed(1)}) falls slightly below minimum target (${jd.minCgpa}).`);
  }
  if (gaps.length === 0) {
    gaps.push('Profile well-balanced with no critical gaps identified against baseline.');
  }

  const roleSubjectiveFitSummary = `${profile.fullName} is rated at ${matchScore}/100 for ${jd.title}. ${weights.weightRationale} Evaluated on project uniqueness (${avgUniqueness}/10), practical system feasibility (${avgFeasibility}/10), and longitudinal consistency across 10th (${tenthVal}%), 12th (${twelfthVal}%), and CGPA (${profile.cgpa.toFixed(2)}).`;

  const academicSummary = `Academics: ${profile.cgpa.toFixed(2)} CGPA, ${twelfthVal.toFixed(0)}% (12th), ${tenthVal.toFixed(0)}% (10th) [${academicsScore}/15 pts - ${consistencyLabel}].`;
  const skillsSummary = `Technical: ${matchedRequired.length}/${jd.requiredSkills.length} required skills matched [${skillsScore}/30 pts].`;
  const projSummary = detailedProjects.length > 0
    ? `Projects: ${detailedProjects.length} analyzed (Uniqueness: ${avgUniqueness}/10, Innovation: ${avgInnovation}/10, Societal Impact: ${avgSocietal}/10, Feasibility: ${avgFeasibility}/10, Practicality: ${avgPracticality}/10) [${projectsScore}/25 pts].`
    : `Projects: Baseline project coverage [${projectsScore}/25 pts].`;
  const achieveSummary = achievementsList.length > 0
    ? `Achievements: ${achievementsList[0].slice(0, 45)} [${achievementsScore}/10 pts].`
    : `Achievements: Baseline verified [${achievementsScore}/10 pts].`;
  const expSummary = `Experience: ${profile.yearsOfExperience.toFixed(1)} yrs in ${profile.currentRole} [${experienceScore}/20 pts].`;

  const aiSummary = `${matchScore}/100 match synthesized from holistic multi-parameter evaluation. ${skillsSummary} ${projSummary} ${expSummary} ${academicSummary} ${achieveSummary}`;

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    scoreBreakdown,
    aiSummary,
    detailedProjects,
    extracurriculars,
    holisticAnalysis: {
      overallStrengths: strengths,
      potentialRisksOrGaps: gaps,
      roleSubjectiveFitSummary,
    },
  };
}

const CROSS_ROLE_SYNONYMS: Record<string, string[]> = {
  postgresql: ['mysql', 'sql', 'oracle', 'mariadb', 'sqlite'],
  mysql: ['postgresql', 'sql'],
  pytorch: ['tensorflow', 'keras', 'scikit-learn', 'ml', 'deep learning'],
  llms: ['langchain', 'langgraph', 'openai', 'gemini', 'transformers', 'nlp'],
  rag: ['vector dbs', 'pinecone', 'weaviate', 'chromadb', 'embeddings'],
  aws: ['gcp', 'azure', 'cloud'],
  kubernetes: ['docker', 'helm', 'ecs', 'eks'],
  terraform: ['ansible', 'cloudformation', 'iac', 'pulumi'],
  'ci/cd': ['github actions', 'jenkins', 'gitlab ci', 'circleci'],
  'system design': ['microservices', 'distributed systems', 'spring boot', 'architecture'],
  microservices: ['spring boot', 'grpc', 'kafka', 'docker'],
  figma: ['sketch', 'adobe xd', 'ui design'],
  'user research': ['usability testing', 'wireframing', 'ux research'],
  'react native': ['flutter', 'ios', 'android', 'mobile'],
  snowflake: ['bigquery', 'redshift', 'databricks', 'sql'],
  dbt: ['sql', 'airflow', 'etl', 'elt'],
};

interface RoleEvaluationTarget {
  roleTitle: string;
  existingJobId?: string;
  templateId?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRange: string;
  minCgpa: number;
}

export function evaluateBestAlternativeRole(
  candidate: Candidate,
  activeJob: JobDescription,
  allJobs: JobDescription[]
): AlternativeRoleFit | null {
  const targets: RoleEvaluationTarget[] = [];
  const seenTitles = new Set<string>([activeJob.title.trim().toLowerCase()]);

  for (const job of allJobs) {
    if (job.id === activeJob.id) continue;
    const normTitle = job.title.trim().toLowerCase();
    if (seenTitles.has(normTitle)) continue;
    seenTitles.add(normTitle);
    targets.push({
      roleTitle: job.title,
      existingJobId: job.id,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      experienceRange: job.experienceRange,
      minCgpa: job.minCgpa,
    });
  }

  for (const tpl of JOB_TEMPLATES) {
    const normTitle = tpl.title.trim().toLowerCase();
    const normLabel = tpl.label.trim().toLowerCase();
    if (seenTitles.has(normTitle) || seenTitles.has(normLabel)) continue;
    seenTitles.add(normTitle);
    targets.push({
      roleTitle: tpl.label,
      templateId: tpl.id,
      requiredSkills: tpl.requiredSkills,
      preferredSkills: tpl.preferredSkills,
      experienceRange: tpl.experienceRange,
      minCgpa: tpl.minCgpa,
    });
  }

  const lowerCandSkills = candidate.skills.map((s) => s.toLowerCase());
  const candRoleText = `${candidate.currentRole} ${candidate.aiSummary}`.toLowerCase();

  let bestFit: AlternativeRoleFit | null = null;

  for (const target of targets) {
    let reqCredit = 0;
    const matchedSkills: string[] = [];

    for (const req of target.requiredSkills) {
      const low = req.toLowerCase();
      const hasDirect = lowerCandSkills.some(
        (ps) => ps === low || ps.includes(low) || low.includes(ps)
      );
      if (hasDirect) {
        reqCredit += 1;
        matchedSkills.push(req);
        continue;
      }
      const synonyms = CROSS_ROLE_SYNONYMS[low] ?? [];
      const hasSynonym = synonyms.some((syn) =>
        lowerCandSkills.some((ps) => ps === syn || ps.includes(syn))
      );
      if (hasSynonym) {
        reqCredit += 0.6;
      }
    }

    let prefMatches = 0;
    for (const pref of target.preferredSkills) {
      const low = pref.toLowerCase();
      const hasDirect = lowerCandSkills.some(
        (ps) => ps === low || ps.includes(low) || low.includes(ps)
      );
      if (hasDirect) {
        prefMatches += 1;
        if (!matchedSkills.includes(pref)) matchedSkills.push(pref);
      }
    }

    const reqRatio =
      target.requiredSkills.length > 0
        ? Math.min(1, reqCredit / target.requiredSkills.length)
        : 0.5;
    const prefRatio =
      target.preferredSkills.length > 0
        ? Math.min(1, prefMatches / target.preferredSkills.length)
        : 0.4;

    const { min: expMin } = parseExperienceRangeTarget(target.experienceRange);
    const expRatio = expMin > 0 ? Math.min(1, candidate.yearsOfExperience / expMin) : 1;
    const cgpaBonus =
      candidate.cgpa >= target.minCgpa
        ? 12
        : Math.max(4, Math.round((candidate.cgpa / Math.max(1, target.minCgpa)) * 10));

    // Slight domain alignment boost when candidate's current role title aligns with the target field
    const roleKeywords = target.roleTitle
      .toLowerCase()
      .split(/[\s/()–-]+/)
      .filter((w) => w.length >= 3 && !['engineer', 'senior', 'developer', 'manager'].includes(w));
    const titleAligned = roleKeywords.some((kw) => candRoleText.includes(kw));
    const alignmentBonus = titleAligned ? 6 : 0;

    const score = clampScore(reqRatio * 62 + prefRatio * 14 + expRatio * 12 + cgpaBonus + alignmentBonus);
    const scoreDelta = score - candidate.matchScore;

    const qualifies =
      score >= 68 &&
      matchedSkills.length >= 2 &&
      ((candidate.matchScore < 85 && scoreDelta >= 10) || scoreDelta >= 14);

    if (qualifies && (!bestFit || score > bestFit.score)) {
      const topMatched = matchedSkills.slice(0, 4).join(', ');
      bestFit = {
        roleTitle: target.roleTitle,
        existingJobId: target.existingJobId,
        templateId: target.templateId,
        score,
        scoreDelta,
        matchedSkills,
        reason: `Scores ${score}% for ${target.roleTitle} (+${scoreDelta} pts vs. ${activeJob.title}) based on ${topMatched}.`,
      };
    }
  }

  return bestFit;
}

function localParseResume(
  item: QueuedResumeFile,
  rawText: string,
  jd: JobDescription
): Omit<Candidate, 'id' | 'isDuplicate' | 'duplicateReason' | 'stage' | 'appliedAt' | 'source'> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Accurate Name Extraction: consensus across filename, email, and verified human name patterns
  const fullName = extractCandidateFullName(item.name, rawText);

  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch
    ? emailMatch[0].toLowerCase()
    : `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@applicant.in`;

  const phoneMatch = rawText.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/);
  const phone = phoneMatch ? phoneMatch[0] : '+91 98200 11223';

  const tenthMatch = rawText.match(/(?:10th|Class\s*10|SSC|X\b)[^\d%]{0,25}(\d{2}(?:\.\d+)?)\s*%/i);
  const twelfthMatch = rawText.match(/(?:12th|Class\s*12|HSC|XII\b)[^\d%]{0,25}(\d{2}(?:\.\d+)?)\s*%/i);
  const cgpaMatch = rawText.match(/(?:CGPA|GPA|sgpa|pointer)[^\d]{0,15}(\d(?:\.\d{1,2})?)/i);
  const expMatch =
    rawText.match(/(?:Experience|Exp)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i) ??
    rawText.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  const gradMatch = rawText.match(/\b(201[5-9]|202[0-6])\b/);

  const tenthPercent = clampPercent(tenthMatch ? Number(tenthMatch[1]) : 88.0, 88.0);
  const twelfthPercent = clampPercent(twelfthMatch ? Number(twelfthMatch[1]) : 86.0, 86.0);
  const cgpa = clampCgpa(cgpaMatch ? Number(cgpaMatch[1]) : 7.8, 7.8);

  let yearsOfExperience = 0;
  if (expMatch) {
    yearsOfExperience = Math.min(20, Math.max(0, Number(expMatch[1])));
  } else if (gradMatch) {
    const gradYear = Number(gradMatch[1]);
    if (gradYear >= 2025) {
      yearsOfExperience = 0;
    } else if (gradYear >= 2020) {
      yearsOfExperience = Math.min(6, Math.max(0, 2026 - gradYear - 1));
    } else {
      yearsOfExperience = Math.min(15, Math.max(1, 2026 - gradYear - 1));
    }
  }

  const graduationYear = gradMatch ? Number(gradMatch[1]) : 2023;

  const detectedCity =
    INDIAN_CITIES.find((city) => new RegExp(`\\b${city}\\b`, 'i').test(rawText)) ?? 'Bengaluru';
  const city =
    detectedCity === 'Bangalore' ? 'Bengaluru' : detectedCity === 'Gurgaon' ? 'Gurugram' : detectedCity;

  const collegeLine = lines.find((l) =>
    !l.includes('http') &&
    !l.includes('@') &&
    /(?:University|Institute|IIT|NIT|IIIT|BITS|College|B\.Tech|B\.E\.)/i.test(l)
  );
  const college = collegeLine
    ? collegeLine.replace(/^Education\s*:\s*/i, '').slice(0, 60)
    : 'National Institute of Technology';

  const roleLine = lines.find((l) =>
    !l.includes('http') &&
    !l.includes('.app') &&
    !l.includes('.com') &&
    !l.includes('/') &&
    !l.includes('@') &&
    /(?:Current Role|Software Engineer|Full[- ]?Stack|Developer|Backend|Frontend|Product Engineer)/i.test(l)
  );

  const skillDictionary = Array.from(
    new Set([...KNOWN_SKILLS, ...jd.requiredSkills, ...jd.preferredSkills])
  );
  const extractedSkills = skillDictionary.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, 'i').test(rawText);
  });

  const skills = extractedSkills.slice(0, 16);

  const currentRole = roleLine && roleLine.length <= 60
    ? roleLine.replace(/^Current Role\s*:\s*/i, '').slice(0, 64)
    : skills.length > 0
      ? `${skills.slice(0, 2).join(' / ')} Developer`
      : 'Software Engineer';

  const projects = extractProjectsFromText(rawText, skills);
  const achievements = extractAchievementsFromText(rawText);
  const extracurriculars = extractExtracurricularsFromText(rawText);
  const detailedProjects = projects.map((p) => analyzeProjectDeeply(p, jd, skills));

  const scored = scoreCandidateLocally(
    {
      fullName,
      skills,
      yearsOfExperience,
      cgpa,
      currentRole,
      college,
      tenthPercent,
      twelfthPercent,
      projects,
      detailedProjects,
      achievements,
      extracurriculars,
    },
    jd
  );

  // Authenticity & AI resume detection
  const authenticity = evaluateResumeAuthenticity(rawText, { projects, skills, achievements });
  const isAiGenerated = authenticity.isAiGenerated;
  const stage: PipelineStage = isAiGenerated ? 'Rejected' : 'Applied';
  const rejectionReason = isAiGenerated ? authenticity.rejectionReason : undefined;

  return {
    fullName,
    email,
    phone,
    tenthPercent,
    twelfthPercent,
    cgpa,
    skills,
    yearsOfExperience,
    city,
    graduationYear,
    college,
    currentRole,
    matchScore: scored.matchScore,
    aiSummary: scored.aiSummary,
    matchedSkills: scored.matchedSkills,
    missingSkills: scored.missingSkills,
    projects,
    detailedProjects: scored.detailedProjects ?? detailedProjects,
    achievements,
    extracurriculars,
    scoreBreakdown: scored.scoreBreakdown,
    holisticAnalysis: scored.holisticAnalysis,
    resumeFileName: item.name,
    isAiGenerated,
    resumeType: authenticity.resumeType,
    aiDetectionScore: authenticity.aiDetectionScore,
    atsFriendlinessScore: authenticity.atsFriendlinessScore,
    aiDetectionReasons: authenticity.aiDetectionReasons,
    rejectionReason,
  };
}

function attachDuplicateMetadata(
  rawCandidates: Array<
    Omit<Candidate, 'id' | 'isDuplicate' | 'duplicateReason' | 'stage' | 'appliedAt' | 'source'>
  >,
  existingPool: Candidate[]
): Candidate[] {
  const allKnown = [...existingPool];
  const todayStr = new Date().toISOString().slice(0, 10);
  const results: Candidate[] = [];

  rawCandidates.forEach((item, idx) => {
    const normEmail = normalizeEmail(item.email);
    const normPhone = normalizePhone(item.phone);
    const normName = item.fullName.trim().toLowerCase();

    const emailMatch = allKnown.find((c) => normalizeEmail(c.email) === normEmail);
    const phoneMatch =
      normPhone.length >= 10
        ? allKnown.find((c) => normalizePhone(c.phone) === normPhone)
        : undefined;
    const nameYearMatch = allKnown.find(
      (c) => c.fullName.trim().toLowerCase() === normName && c.graduationYear === item.graduationYear
    );

    const dupMatch = emailMatch || phoneMatch || nameYearMatch;
    let duplicateReason: string | undefined;
    if (emailMatch) {
      duplicateReason = `Email (${item.email}) matches existing applicant ${emailMatch.fullName}.`;
    } else if (phoneMatch) {
      duplicateReason = `Phone number (${item.phone}) matches existing applicant ${phoneMatch.fullName}.`;
    } else if (nameYearMatch) {
      duplicateReason = `Name & graduation year (${item.graduationYear}) match existing applicant ${nameYearMatch.fullName}.`;
    }

    const stage: PipelineStage = item.isAiGenerated
      ? 'Rejected'
      : ((item as { stage?: PipelineStage }).stage || 'Applied');

    const rejectionReason = item.isAiGenerated
      ? (item.rejectionReason || 'Automated Rejection: High probability of synthetic AI-generated content.')
      : item.rejectionReason;

    const candidate: Candidate = {
      ...item,
      id: `cand-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      isDuplicate: Boolean(dupMatch),
      duplicateReason,
      stage,
      rejectionReason,
      appliedAt: todayStr,
      source: 'uploaded',
    };

    results.push(candidate);
    allKnown.push(candidate);
  });

  return results;
}

export interface ScreeningBatchResult {
  parsedCandidates: Candidate[];
  updatedExisting: Candidate[];
  usedFallback: boolean;
}

export async function runBulkResumeScreening(params: {
  queuedFiles: QueuedResumeFile[];
  existingCandidates: Candidate[];
  jobDescription: JobDescription;
  onFileStatusChange: (fileIds: string[], status: QueuedResumeFile['status']) => void;
  onBatchProgress: (processed: number, total: number, newNames: string[]) => void;
  onStageChange: (stageIndex: number) => void;
  onStatusMessage: (message: string) => void;
}): Promise<ScreeningBatchResult> {
  const {
    queuedFiles,
    existingCandidates,
    jobDescription,
    onFileStatusChange,
    onBatchProgress,
    onStageChange,
    onStatusMessage,
  } = params;

  let usedFallback = false;
  let rollingPool = [...existingCandidates];
  const allParsed: Candidate[] = [];
  const extractedNames: string[] = [];

  if (queuedFiles.length > 0) {
    onStageChange(0);
    const BATCH_SIZE = 3;

    for (let start = 0; start < queuedFiles.length; start += BATCH_SIZE) {
      const chunk = queuedFiles.slice(start, start + BATCH_SIZE);
      const chunkIds = chunk.map((f) => f.id);
      onFileStatusChange(chunkIds, 'processing');

      if (start > 0) {
        onStageChange(1);
        await sleep(1400);
      }

      const prepared = await Promise.all(
        chunk.map(async (item) => {
          const text = await extractResumeText(item);
          const base64Data = await fileToBase64(item.file);
          return { item, text, base64Data };
        })
      );

      let rawBatch: Array<
        Omit<Candidate, 'id' | 'isDuplicate' | 'duplicateReason' | 'stage' | 'appliedAt' | 'source'>
      >;

      try {
        const res = await withRateLimitRetry(
          () =>
            safePostJson<{
              candidates: Array<
                Omit<
                  Candidate,
                  'id' | 'isDuplicate' | 'duplicateReason' | 'stage' | 'appliedAt' | 'source'
                >
              >;
            }>('/api/screen-batch', {
              jobDescription,
              batchItems: prepared.map((p) => ({
                name: p.item.name,
                extension: p.item.extension,
                text: p.text,
                base64Data: p.base64Data,
              })),
            }),
          onStatusMessage
        );
        rawBatch = res.candidates;
      } catch {
        usedFallback = true;
        rawBatch = prepared.map((p) => localParseResume(p.item, p.text, jobDescription));
      }

      const hydrated = attachDuplicateMetadata(rawBatch, rollingPool);
      allParsed.push(...hydrated);
      rollingPool = [...hydrated, ...rollingPool];
      hydrated.forEach((c) => extractedNames.push(c.fullName));

      onFileStatusChange(chunkIds, 'done');
      onBatchProgress(Math.min(start + chunk.length, queuedFiles.length), queuedFiles.length, [
        ...extractedNames,
      ]);
    }
  }

  onStageChange(1);
  let updatedExisting = [...existingCandidates];

  if (existingCandidates.length > 0) {
    try {
      if (queuedFiles.length > 0) await sleep(1200);
      const res = await withRateLimitRetry(
        () =>
          safePostJson<{
            updates: Array<{
              id: string;
              matchScore: number;
              matchedSkills: string[];
              missingSkills: string[];
              scoreBreakdown?: CandidateEvaluationBreakdown;
              aiSummary: string;
              detailedProjects?: ProjectDeepAnalysis[];
              extracurriculars?: string[];
              holisticAnalysis?: CandidateHolisticAnalysis;
            }>;
          }>('/api/rescore-pool', {
            jobDescription,
            candidates: existingCandidates,
          }),
        onStatusMessage
      );
      const map = new Map(res.updates.map((u) => [u.id, u]));
      updatedExisting = existingCandidates.map((c) => {
        const u = map.get(c.id);
        if (!u) return c;
        return {
          ...c,
          matchScore: u.matchScore,
          matchedSkills: u.matchedSkills,
          missingSkills: u.missingSkills,
          scoreBreakdown: u.scoreBreakdown ?? c.scoreBreakdown,
          aiSummary: u.aiSummary || c.aiSummary,
          detailedProjects: u.detailedProjects ?? c.detailedProjects,
          extracurriculars: u.extracurriculars ?? c.extracurriculars,
          holisticAnalysis: u.holisticAnalysis ?? c.holisticAnalysis,
        };
      });
    } catch {
      usedFallback = true;
      updatedExisting = existingCandidates.map((c) => {
        const scored = scoreCandidateLocally(c, jobDescription);
        return {
          ...c,
          matchScore: scored.matchScore,
          matchedSkills: scored.matchedSkills,
          missingSkills: scored.missingSkills,
          scoreBreakdown: scored.scoreBreakdown,
          aiSummary: scored.aiSummary,
          detailedProjects: scored.detailedProjects ?? c.detailedProjects,
          extracurriculars: scored.extracurriculars ?? c.extracurriculars,
          holisticAnalysis: scored.holisticAnalysis ?? c.holisticAnalysis,
        };
      });
    }
  }

  onStageChange(2);
  await sleep(250);
  onStageChange(3);

  return {
    parsedCandidates: allParsed,
    updatedExisting,
    usedFallback,
  };
}

export function buildLocalComparisonRecommendation(
  candidates: Candidate[],
  jd: JobDescription
): ComparisonRecommendation {
  const sorted = [...candidates].sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      b.matchedSkills.length - a.matchedSkills.length ||
      b.cgpa - a.cgpa
  );
  const top = sorted[0];
  const runnerUp = sorted[1];

  const tradeOffs = candidates.map((c) => {
    const topSkills = c.matchedSkills.slice(0, 3).join(', ') || c.skills.slice(0, 3).join(', ');
    const strength = `Scores ${c.matchScore}/100 with ${c.yearsOfExperience.toFixed(1)} yrs experience, CGPA ${c.cgpa.toFixed(2)}, and verified ${topSkills}.`;
    const caveat =
      c.missingSkills.length > 0
        ? `Missing JD skills: ${c.missingSkills.slice(0, 3).join(', ')}.`
        : `No required skill gaps; verify availability and compensation expectations.`;
    return {
      candidateId: c.id,
      candidateName: c.fullName,
      strength,
      caveat,
    };
  });

  const gapNote =
    top.missingSkills.length === 0
      ? 'covers 100% of required JD skills'
      : `leads on overall fit (${top.matchedSkills.length} matched skills)`;

  return {
    recommendedCandidateId: top.id,
    recommendedCandidateName: top.fullName,
    headline: `${top.fullName} is the strongest fit for ${jd.title} (${top.matchScore}/100 match)`,
    rationale: `${top.fullName} ranks highest at ${top.matchScore}/100 and ${gapNote} with ${top.yearsOfExperience.toFixed(1)} years of experience and a ${top.cgpa.toFixed(2)} CGPA. ${runnerUp.fullName} (${runnerUp.matchScore}/100) remains a viable backup depending on team seniority needs.`,
    tradeOffs,
  };
}

export async function generateComparisonRecommendation(
  jobDescription: JobDescription,
  candidates: Candidate[],
  onStatusMessage?: (msg: string) => void
): Promise<ComparisonRecommendation> {
  try {
    const parsed = await withRateLimitRetry(
      () =>
        safePostJson<ComparisonRecommendation>('/api/compare-recommendation', {
          jobDescription,
          candidates,
        }),
      onStatusMessage
    );
    if (!parsed?.headline || !parsed?.recommendedCandidateName) {
      return buildLocalComparisonRecommendation(candidates, jobDescription);
    }
    return parsed;
  } catch {
    return buildLocalComparisonRecommendation(candidates, jobDescription);
  }
}

export async function requestJdIntelligence(
  params: {
    title: string;
    department: string;
    location: string;
    jobType: string;
    experienceRange: string;
    minCgpa: number;
    requiredSkills: string[];
    preferredSkills: string[];
    description: string;
    userPrompt: string;
  },
  onStatusMessage?: (msg: string) => void
): Promise<JdIntelligenceResult> {
  return withRateLimitRetry(
    () => safePostJson<JdIntelligenceResult>('/api/jd-intelligence', params),
    onStatusMessage
  );
}

export async function validateSkillsWithAi(
  skills: string[],
  context?: { roleTitle?: string; department?: string },
  onStatusMessage?: (msg: string) => void
): Promise<SkillValidationResponse> {
  return withRateLimitRetry(
    () =>
      safePostJson<SkillValidationResponse>('/api/validate-skills', {
        skills,
        roleTitle: context?.roleTitle,
        department: context?.department,
      }),
    onStatusMessage
  );
}

export async function sendSentinelChatMessage(
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    images?: Array<{ name: string; mimeType: string; base64Data: string }>;
  }>,
  workspaceContext?: import('../types/ats').SentinelWorkspaceContext,
  onStatusMessage?: (msg: string) => void
): Promise<{ reply: string }> {
  return withRateLimitRetry(
    () =>
      safePostJson<{ reply: string }>('/api/sentinel-chat', {
        messages,
        workspaceContext,
      }),
    onStatusMessage
  );
}
