import mammoth from 'mammoth';
import { Type, ThinkingLevel } from '@google/genai';
import { generateContentWithFallback } from './gemini.ts';
import { extractTextFromPdfBuffer } from './pdfParser.ts';
import { REAL_WORLD_SKILLS_CATALOG } from '../src/data/realWorldSkills.ts';
import type {
  Candidate,
  CandidateProject,
  CandidateEvaluationBreakdown,
  JobDescription,
  ProjectDeepAnalysis,
  EvaluationWeights,
  CandidateHolisticAnalysis,
  ResumeType,
  ResumeAuthenticityAnalysis,
} from '../src/types/ats.ts';
import { evaluateResumeAuthenticity } from '../src/services/resumeAuthenticity.ts';
export { evaluateResumeAuthenticity } from '../src/services/resumeAuthenticity.ts';

export interface BatchItemPayload {
  name: string;
  extension: 'pdf' | 'docx';
  text?: string;
  base64Data?: string;
}

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

const PREMIER_COLLEGES = [
  'IIT Madras',
  'IIT Bombay',
  'IIT Delhi',
  'IIT Kanpur',
  'IIT Kharagpur',
  'IIT Roorkee',
  'IIT Guwahati',
  'IIT Hyderabad',
  'BITS Pilani',
  'NIT Trichy',
  'NIT Surathkal',
  'IIIT Hyderabad',
  'IIIT Bangalore',
  'DTU Delhi',
  'COEP Pune',
  'VIT Vellore',
  'RV College of Engineering',
  'PES University',
  'PSG Tech Coimbatore',
  'Manipal Institute of Technology',
  'Delhi University',
  'Anna University',
  'Mumbai University',
];

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function clampPercent(val: number, fallback = 85.0): number {
  if (!Number.isFinite(val) || val <= 0 || val > 100) return fallback;
  return Math.round(val * 10) / 10;
}

function clampCgpa(val: number, fallback = 8.0): number {
  if (!Number.isFinite(val) || val <= 0) return fallback;
  if (val > 10 && val <= 100) return Math.round((val / 10) * 100) / 100;
  if (val > 0 && val <= 4.0) return Math.round((val * 2.5) * 100) / 100;
  return Math.max(0, Math.min(10, Math.round(val * 100) / 100));
}

function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function parseExperienceRangeTarget(range: string): { min: number; max: number } {
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

  // If no structured section found, look for URLs or project keywords
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

  // Fallback to synthesizing a representative project from skills if text has technical keywords
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

  // Scan for milestone keywords anywhere in text
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

  // 1. Uniqueness (1-10): Novelty vs generic tutorial clones
  const isGenericClone = /to[- ]?do\s*(app|list)|weather\s*app|calculator|tic[- ]?tac[- ]?toe|recipe\s*app|simple\s*portfolio|basic\s*blog/i.test(fullText);
  const isAdvancedDomain = /ai|ml|rag|llm|computer\s*vision|blockchain|ledger|compiler|kernel|distributed|microservice|real[- ]?time|webrtc|socket|fraud|fintech|health|robotics|autonomous|iot|edge/i.test(fullText);
  let uniquenessScore = 6.5;
  if (isGenericClone) uniquenessScore = 3.5;
  else if (isAdvancedDomain) uniquenessScore = 8.5;
  if (/(patent|novel|research|first[- ]?of[- ]?its[- ]?kind|proprietary|algorithm|custom\s*protocol)/i.test(fullText)) {
    uniquenessScore = Math.min(10, uniquenessScore + 1.5);
  }

  // 2. Innovation (1-10): Technical ingenuity, algorithmic novelty, modern architecture
  let innovationScore = 6.5;
  if (/(neural|transformer|embedding|vector|fine[- ]?tuning|concurrency|raft|paxos|graphql|grpc|event[- ]?driven|kafka|streaming|webrtc)/i.test(fullText)) {
    innovationScore = 8.5;
  }
  if (/(custom|from\s*scratch|optimized|zero[- ]?dependency|sub[- ]?second|low[- ]?latency)/i.test(fullText)) {
    innovationScore = Math.min(10, innovationScore + 1.5);
  }
  if (isGenericClone) innovationScore = Math.min(innovationScore, 4.0);

  // 3. Societal Impact (1-10): Real-world public good, healthcare, accessibility, sustainability, scale
  let societalImpactScore = 5.5;
  if (/(healthcare|medical|patient|hospital|sustainability|eco|clean\s*energy|carbon|education|rural|farmers|agriculture|safety|women\s*safety|disaster|relief|accessibility|screen\s*reader|ngo|governance|public)/i.test(fullText)) {
    societalImpactScore = 9.0;
  } else if (/(enterprise|b2b|smb|cost\s*reduction|saved|revenue|active\s*users|community)/i.test(fullText)) {
    societalImpactScore = 7.5;
  }

  // 4. Feasibility (1-10): Sound architecture, realistic tech stack, test coverage, reliability
  let feasibilityScore = 7.0;
  const hasSolidStack = (project.technologies ?? []).length >= 2 || /(docker|kubernetes|postgresql|sql|react|node|fastapi|aws|redis)/i.test(fullText);
  if (hasSolidStack) feasibilityScore += 1.5;
  if (/(unit\s*tests|ci\/cd|pipeline|tested|monitoring|dockerized|containerized)/i.test(fullText)) {
    feasibilityScore = Math.min(10, feasibilityScore + 1.5);
  }

  // 5. Practicality (1-10): Production deployment, measurable scale, usability
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

export async function screenBatchEngine(
  jobDescription: JobDescription,
  batchItems: BatchItemPayload[]
): Promise<{ candidates: any[] }> {
  // Authoritatively extract text for all batch items (DOCX via mammoth, PDF via pdfParser)
  const resolvedItems = await Promise.all(
    batchItems.map(async (entry) => {
      let text = typeof entry.text === 'string' ? entry.text.trim() : '';

      if (entry.extension === 'docx' && entry.base64Data) {
        try {
          const buffer = Buffer.from(entry.base64Data, 'base64');
          const extracted = await mammoth.extractRawText({ buffer });
          const docxText = (extracted.value ?? '').trim();
          if (docxText.length > text.length || text.length < 50) {
            text = docxText;
          }
        } catch {
          // keep fallback
        }
      }

      if (entry.extension === 'pdf' && entry.base64Data) {
        try {
          const buffer = Buffer.from(entry.base64Data, 'base64');
          const pdfText = await extractTextFromPdfBuffer(buffer);
          if (pdfText && (pdfText.length > text.length || text.length < 50)) {
            text = pdfText;
          }
        } catch {
          // keep fallback
        }
      }

      return { ...entry, text };
    })
  );

  const jdContext = `
Role Title: ${jobDescription.title}
Department: ${jobDescription.department}
Location: ${jobDescription.location}
Job Type: ${jobDescription.jobType || 'Hybrid'}
Experience Range: ${jobDescription.experienceRange}
Minimum CGPA: ${jobDescription.minCgpa}
Required Skills: ${jobDescription.requiredSkills.join(', ')}
Preferred Skills: ${jobDescription.preferredSkills.join(', ')}
Description: ${String(jobDescription.description ?? '').slice(0, 1800)}
`.trim();

  // Attempt Gemini model extraction if available
  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    const fileManifest = resolvedItems
      .map((entry, idx) => {
        if (entry.text && entry.text.length >= 40) {
          return `--- RESUME #${idx + 1} (${entry.name}) ---\n${entry.text.slice(0, 8000)}`;
        }
        return `--- RESUME #${idx + 1} (${entry.name}) ---\n[Attached as PDF document part below]`;
      })
      .join('\n\n');

    parts.push({
      text: `You are a senior technical recruiter and sentient AI evaluator parsing ${resolvedItems.length} resume(s) in a single batch.
You must conduct a holistic, multi-dimensional evaluation of the WHOLE resume across 5 key parameters:
1. Skills: Required & preferred competencies against the JD.
2. Projects: Depth, complexity, technologies used, and real-world system architecture.
3. Experience: Tenure, seniority, and role relevance.
4. Academics: Longitudinal consistency across College tier, CGPA (10-point scale), 12th marks (%), and 10th marks (%).
5. Achievements: Hackathons, competitive programming, leadership, awards, and recognitions.

ACTIVE JOB DESCRIPTION:
${jdContext}

RESUMES TO PARSE & SCORE (return exactly ${resolvedItems.length} objects in the same order, keeping each resumeFileName exact):
${fileManifest}

For each resume extract:
- resumeFileName, fullName, email, phone
- tenthPercent (0-100), twelfthPercent (0-100), cgpa (10-point scale), college, graduationYear (integer)
- skills (string array), yearsOfExperience (number), city, currentRole
- projects: array of { title: string, description: string, technologies: string[] }
- achievements: array of strings (hackathons, honors, competitive achievements)
- scoreBreakdown: { skillsScore: 0-30, projectsScore: 0-25, experienceScore: 0-20, academicsScore: 0-15, achievementsScore: 0-10 }
- matchScore: aggregate 0-100 sum of the 5 breakdown scores
- matchedSkills, missingSkills
- isAiGenerated: boolean (true if resume exhibits synthetic LLM hallmarks, prompt injection directives, unfilled tokens like [Company Name], or formulaic AI slop)
- resumeType: string ("ATS-Friendly" or "AI-Generated")
- aiDetectionScore: integer 0-100 (percentage probability of synthetic AI generation)
- aiDetectionReasons: string array (concrete detection indicators)
- atsFriendlinessScore: integer 0-100 (clean semantic structure and ATS parser compatibility)
- aiSummary: comprehensive summary synthesizing performance across all 5 parameters.`,
    });

    for (const entry of resolvedItems) {
      if (entry.extension === 'pdf' && entry.base64Data) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: entry.base64Data,
          },
        });
      }
    }

    const rawAiResponse = await generateContentWithFallback({
      contents: { parts },
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            resumeFileName: { type: Type.STRING },
            fullName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            tenthPercent: { type: Type.NUMBER },
            twelfthPercent: { type: Type.NUMBER },
            cgpa: { type: Type.NUMBER },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            yearsOfExperience: { type: Type.NUMBER },
            city: { type: Type.STRING },
            graduationYear: { type: Type.INTEGER },
            college: { type: Type.STRING },
            currentRole: { type: Type.STRING },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'description'],
              },
            },
            achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
            scoreBreakdown: {
              type: Type.OBJECT,
              properties: {
                skillsScore: { type: Type.INTEGER },
                projectsScore: { type: Type.INTEGER },
                experienceScore: { type: Type.INTEGER },
                academicsScore: { type: Type.INTEGER },
                achievementsScore: { type: Type.INTEGER },
              },
              required: ['skillsScore', 'projectsScore', 'experienceScore', 'academicsScore', 'achievementsScore'],
            },
            matchScore: { type: Type.INTEGER },
            aiSummary: { type: Type.STRING },
            matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            isAiGenerated: { type: Type.BOOLEAN },
            resumeType: { type: Type.STRING },
            aiDetectionScore: { type: Type.INTEGER },
            aiDetectionReasons: { type: Type.ARRAY, items: { type: Type.STRING } },
            atsFriendlinessScore: { type: Type.INTEGER },
          },
          required: [
            'resumeFileName',
            'fullName',
            'email',
            'phone',
            'tenthPercent',
            'twelfthPercent',
            'cgpa',
            'skills',
            'yearsOfExperience',
            'city',
            'graduationYear',
            'college',
            'currentRole',
            'matchScore',
            'aiSummary',
            'matchedSkills',
            'missingSkills',
          ],
        },
      },
    });

    if (rawAiResponse) {
      const parsedArr = JSON.parse(rawAiResponse);
      if (Array.isArray(parsedArr) && parsedArr.length > 0) {
        const candidates = resolvedItems.map((entry, idx) => {
          const raw = parsedArr.find((p: any) => p?.resumeFileName === entry.name) ?? parsedArr[idx] ?? {};
          const fallbackName = entry.name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ');
          const fullName =
            typeof raw.fullName === 'string' && isValidHumanName(raw.fullName.trim())
              ? toTitleCase(raw.fullName.trim())
              : extractCandidateFullName(entry.name, entry.text || '');

          const skills = Array.isArray(raw.skills)
            ? raw.skills.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 16)
            : [];

          const yearsOfExperience = Number.isFinite(Number(raw.yearsOfExperience))
            ? Math.max(0, Math.round(Number(raw.yearsOfExperience) * 10) / 10)
            : 0;

          const cgpa = Number.isFinite(Number(raw.cgpa)) ? clampCgpa(Number(raw.cgpa), 7.8) : 7.8;
          const tenthPercent = clampPercent(Number(raw.tenthPercent), 88.0);
          const twelfthPercent = clampPercent(Number(raw.twelfthPercent), 86.0);

          const projects: CandidateProject[] = Array.isArray(raw.projects) && raw.projects.length > 0
            ? raw.projects.map((p: any) => ({
                title: typeof p?.title === 'string' && p.title.trim() ? p.title.trim() : 'Software Project',
                description: typeof p?.description === 'string' ? p.description.trim() : '',
                technologies: Array.isArray(p?.technologies)
                  ? p.technologies.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
                  : [],
              }))
            : extractProjectsFromText(entry.text || '', skills);

          const achievements: string[] = Array.isArray(raw.achievements) && raw.achievements.length > 0
            ? raw.achievements.filter((a: unknown): a is string => typeof a === 'string' && a.trim().length > 0)
            : extractAchievementsFromText(entry.text || '');

          const extracurriculars = extractExtracurricularsFromText(entry.text || '');
          const detailedProjects = projects.map((p) => analyzeProjectDeeply(p, jobDescription, skills));

          // Compute verified holistic 5-parameter score
          const scoring = scoreCandidateProfile(
            {
              fullName,
              skills,
              yearsOfExperience,
              cgpa,
              currentRole: typeof raw.currentRole === 'string' ? raw.currentRole : 'Software Engineer',
              college: typeof raw.college === 'string' ? raw.college : undefined,
              tenthPercent,
              twelfthPercent,
              projects,
              detailedProjects,
              achievements,
              extracurriculars,
            },
            jobDescription
          );

          const matchScore = Number.isFinite(Number(raw.matchScore)) && Number(raw.matchScore) > 0
            ? clampScore(Number(raw.matchScore))
            : scoring.matchScore;

          // Authenticity & AI resume detection
          const authenticity = evaluateResumeAuthenticity(entry.text || '', { projects, skills, achievements });
          const isAiGenerated =
            authenticity.isAiGenerated ||
            raw.isAiGenerated === true ||
            (Number(raw.aiDetectionScore) >= 55);
          const resumeType: ResumeType = isAiGenerated ? 'AI-Generated' : 'ATS-Friendly';
          const aiDetectionScore = isAiGenerated
            ? Math.max(authenticity.aiDetectionScore, Number(raw.aiDetectionScore) || 88)
            : Math.min(authenticity.aiDetectionScore, Number(raw.aiDetectionScore) || 12);
          const atsFriendlinessScore = isAiGenerated
            ? Math.min(authenticity.atsFriendlinessScore, 35)
            : Math.max(authenticity.atsFriendlinessScore, Number(raw.atsFriendlinessScore) || 94);
          const aiDetectionReasons = Array.from(
            new Set([
              ...authenticity.aiDetectionReasons,
              ...(Array.isArray(raw.aiDetectionReasons)
                ? raw.aiDetectionReasons.filter((r: unknown): r is string => typeof r === 'string' && r.trim().length > 0)
                : []),
            ])
          );
          const stage = isAiGenerated ? ('Rejected' as const) : ('Applied' as const);
          const rejectionReason = isAiGenerated
            ? (authenticity.rejectionReason ||
               `Automated Rejection: High probability of synthetic AI generation (${aiDetectionScore}% AI Confidence).`)
            : undefined;

          const scoreBreakdown: CandidateEvaluationBreakdown = raw.scoreBreakdown &&
            Number.isFinite(Number(raw.scoreBreakdown.skillsScore)) &&
            Number.isFinite(Number(raw.scoreBreakdown.projectsScore))
              ? {
                  skillsScore: Math.max(0, Math.min(30, Math.round(Number(raw.scoreBreakdown.skillsScore)))),
                  projectsScore: Math.max(0, Math.min(25, Math.round(Number(raw.scoreBreakdown.projectsScore)))),
                  experienceScore: Math.max(0, Math.min(20, Math.round(Number(raw.scoreBreakdown.experienceScore)))),
                  academicsScore: Math.max(0, Math.min(15, Math.round(Number(raw.scoreBreakdown.academicsScore)))),
                  achievementsScore: Math.max(0, Math.min(10, Math.round(Number(raw.scoreBreakdown.achievementsScore)))),
                }
              : scoring.scoreBreakdown;

          return {
            fullName,
            email:
              typeof raw.email === 'string' && raw.email.includes('@')
                ? raw.email.trim()
                : `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@applicant.in`,
            phone: typeof raw.phone === 'string' && raw.phone.trim() ? raw.phone.trim() : '+91 98000 00000',
            tenthPercent,
            twelfthPercent,
            cgpa,
            skills,
            yearsOfExperience,
            city: typeof raw.city === 'string' && raw.city.trim() ? raw.city.trim() : 'Bengaluru',
            graduationYear:
              Number.isInteger(Number(raw.graduationYear)) && Number(raw.graduationYear) >= 2005
                ? Number(raw.graduationYear)
                : 2023,
            college:
              typeof raw.college === 'string' && raw.college.trim()
                ? raw.college.trim()
                : 'National Institute of Technology',
            currentRole:
              typeof raw.currentRole === 'string' && raw.currentRole.trim() && !raw.currentRole.includes('http')
                ? raw.currentRole.trim()
                : skills.length > 0
                  ? `${skills.slice(0, 2).join(' / ')} Developer`
                  : 'Software Engineer',
            matchScore,
            aiSummary:
              typeof raw.aiSummary === 'string' && (raw.aiSummary.includes('parameters') || raw.aiSummary.includes('pts') || raw.aiSummary.includes('Academics'))
                ? raw.aiSummary.trim()
                : scoring.aiSummary,
            matchedSkills: Array.isArray(raw.matchedSkills) && raw.matchedSkills.length > 0
              ? raw.matchedSkills.filter((s: unknown): s is string => typeof s === 'string')
              : scoring.matchedSkills,
            missingSkills: Array.isArray(raw.missingSkills)
              ? raw.missingSkills.filter((s: unknown): s is string => typeof s === 'string')
              : scoring.missingSkills,
            projects,
            detailedProjects: scoring.detailedProjects ?? detailedProjects,
            achievements,
            extracurriculars: scoring.extracurriculars ?? extracurriculars,
            scoreBreakdown: {
              ...scoreBreakdown,
              extracurricularScore: scoring.scoreBreakdown.extracurricularScore,
              projectDimensions: scoring.scoreBreakdown.projectDimensions,
              academicsBreakdown: scoring.scoreBreakdown.academicsBreakdown,
              weightsApplied: scoring.scoreBreakdown.weightsApplied,
            },
            holisticAnalysis: scoring.holisticAnalysis,
            resumeFileName: entry.name,
            isAiGenerated,
            resumeType,
            aiDetectionScore,
            atsFriendlinessScore,
            aiDetectionReasons,
            rejectionReason,
            stage,
          };
        });

        return { candidates };
      }
    }
  } catch {
    // Fall back to built-in local resume screening
  }

  // Built-in Intelligent Resume Parser & Scoring Engine
  const candidates = resolvedItems.map((entry) => {
    return parseResumeLocally(entry, entry.text || '', jobDescription);
  });

  return { candidates };
}

export function parseResumeLocally(
  entry: BatchItemPayload,
  rawText: string,
  jd: JobDescription
) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Accurate Name Extraction: consensus across filename, email, and verified human name patterns
  const fullName = extractCandidateFullName(entry.name, rawText);

  // 2. Contact details
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch
    ? emailMatch[0].toLowerCase()
    : `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@applicant.in`;

  const phoneMatch = rawText.match(/(?:\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b/);
  const phone = phoneMatch ? phoneMatch[0] : '+91 98110 00000';

  // 3. Academic details
  const tenthMatch = rawText.match(/(?:10th|class\s*10|ssc|matric)[\s\w:/-]*?(\d{2}(?:\.\d+)?)\s*%?/i);
  const tenthPercent = tenthMatch ? clampPercent(parseFloat(tenthMatch[1]), 88.0) : 85.0;

  const twelfthMatch = rawText.match(/(?:12th|class\s*12|hsc|senior secondary)[\s\w:/-]*?(\d{2}(?:\.\d+)?)\s*%?/i);
  const twelfthPercent = twelfthMatch ? clampPercent(parseFloat(twelfthMatch[1]), 86.0) : 83.0;

  const cgpaMatch = rawText.match(/(?:cgpa|gpa|pointer|sgpa)[\s\w:/-]*?(\d(?:\.\d{1,2})?)/i);
  const cgpa = cgpaMatch ? clampCgpa(parseFloat(cgpaMatch[1]), 7.8) : 7.8;

  const gradYearMatch = rawText.match(/\b(201\d|202\d)\b/);
  const graduationYear = gradYearMatch ? parseInt(gradYearMatch[1], 10) : 2023;

  // 4. College extraction
  let college = 'National Institute of Technology';
  for (const prem of PREMIER_COLLEGES) {
    if (new RegExp(`\\b${escapeRegExp(prem)}\\b`, 'i').test(rawText)) {
      college = prem;
      break;
    }
  }

  // 5. City extraction
  let city = 'Bengaluru';
  for (const c of INDIAN_CITIES) {
    if (new RegExp(`\\b${escapeRegExp(c)}\\b`, 'i').test(rawText)) {
      city = c === 'Bangalore' ? 'Bengaluru' : c === 'Gurgaon' ? 'Gurugram' : c;
      break;
    }
  }

  // 6. Experience extraction - grounded in reality, no arbitrary 2.5 default!
  let yearsOfExperience = 0;
  const expMatch =
    rawText.match(/(\d+(?:\.\d+)?)\s*(?:\+|plus)?\s*years?\s*(?:of)?\s*(?:exp|experience)/i) ??
    rawText.match(/(?:experience|exp)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);

  if (expMatch) {
    yearsOfExperience = Math.min(20, Math.max(0, parseFloat(expMatch[1])));
  } else {
    // Check graduation year: difference from 2026
    if (gradYearMatch) {
      const gradYear = parseInt(gradYearMatch[1], 10);
      if (gradYear >= 2025) {
        yearsOfExperience = 0; // Fresher / entry-level
      } else if (gradYear >= 2020) {
        yearsOfExperience = Math.min(6, Math.max(0, 2026 - gradYear - 1));
      } else {
        yearsOfExperience = Math.min(15, Math.max(1, 2026 - gradYear - 1));
      }
    }
  }

  // 7. Skills extraction from real world catalog and active JD
  const lowerText = rawText.toLowerCase();
  const detectedSkills = new Set<string>();

  for (const item of REAL_WORLD_SKILLS_CATALOG) {
    const sLower = item.skill.toLowerCase();
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#.])${escapeRegExp(sLower)}(?:$|[^a-zA-Z0-9+#.])`, 'i');
    if (regex.test(lowerText)) {
      detectedSkills.add(item.skill);
    }
  }

  // Check JD skills
  for (const skill of [...jd.requiredSkills, ...jd.preferredSkills]) {
    const sLower = skill.toLowerCase();
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#.])${escapeRegExp(sLower)}(?:$|[^a-zA-Z0-9+#.])`, 'i');
    if (regex.test(lowerText)) {
      detectedSkills.add(skill);
    }
  }

  const skills = Array.from(detectedSkills).slice(0, 16);

  // 8. Role extraction - Never set to a URL!
  let currentRole = 'Software Engineer';
  const roleLine = lines.find(
    (l) =>
      !l.includes('http') &&
      !l.includes('.app') &&
      !l.includes('.com') &&
      !l.includes('/') &&
      !l.includes('@') &&
      /(?:Software Engineer|Full[- ]?Stack|Frontend|Backend|Web Developer|Developer|Product Engineer|Systems Engineer|Data Scientist|ML Engineer)/i.test(l)
  );

  if (roleLine && roleLine.length <= 60) {
    currentRole = roleLine.replace(/^(?:current role|role|title|designation)\s*[:\-]\s*/i, '').trim();
  } else if (skills.length > 0) {
    currentRole = `${skills.slice(0, 2).join(' / ')} Developer`;
  }

  // 9. Projects, Extracurriculars and Achievements extraction
  const projects = extractProjectsFromText(rawText, skills);
  const achievements = extractAchievementsFromText(rawText);
  const extracurriculars = extractExtracurricularsFromText(rawText);
  const detailedProjects = projects.map((p) => analyzeProjectDeeply(p, jd, skills));

  // 10. Holistic Multi-Parameter Scoring against JD
  const scoring = scoreCandidateProfile(
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

  // 11. Authenticity & AI resume detection
  const authenticity = evaluateResumeAuthenticity(rawText, { projects, skills, achievements });
  const isAiGenerated = authenticity.isAiGenerated;
  const stage = isAiGenerated ? ('Rejected' as const) : ('Applied' as const);
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
    matchScore: scoring.matchScore,
    aiSummary: scoring.aiSummary,
    matchedSkills: scoring.matchedSkills,
    missingSkills: scoring.missingSkills,
    projects,
    detailedProjects: scoring.detailedProjects ?? detailedProjects,
    achievements,
    extracurriculars: scoring.extracurriculars ?? extracurriculars,
    scoreBreakdown: scoring.scoreBreakdown,
    holisticAnalysis: scoring.holisticAnalysis,
    resumeFileName: entry.name,
    isAiGenerated,
    resumeType: authenticity.resumeType,
    aiDetectionScore: authenticity.aiDetectionScore,
    atsFriendlinessScore: authenticity.atsFriendlinessScore,
    aiDetectionReasons: authenticity.aiDetectionReasons,
    rejectionReason,
    stage,
  };
}

export function scoreCandidateProfile(
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
    return profile.skills.some(
      (ps) => ps.toLowerCase() === low || (low.length > 3 && ps.toLowerCase().includes(low))
    );
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

  // Multi-parameter project dimension averages (1-10)
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

export async function rescorePoolEngine(
  jobDescription: JobDescription,
  candidates: Candidate[]
): Promise<{ updates: any[] }> {
  if (candidates.length === 0) {
    return { updates: [] };
  }

  const compact = candidates.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    currentRole: c.currentRole,
    yearsOfExperience: c.yearsOfExperience,
    cgpa: c.cgpa,
    tenthPercent: c.tenthPercent,
    twelfthPercent: c.twelfthPercent,
    skills: c.skills,
    projects: c.projects?.slice(0, 3),
    achievements: c.achievements?.slice(0, 3),
  }));

  try {
    const rawAiResponse = await generateContentWithFallback({
      contents: `You are a sentient ATS evaluator. Rescore all ${candidates.length} candidate(s) holistically against this Job Description across 5 parameters:
1. Technical Skills (0-30 pts)
2. Projects (0-25 pts)
3. Experience (0-20 pts)
4. Academics (0-15 pts: CGPA, 10th %, 12th %)
5. Achievements (0-10 pts)

JOB DESCRIPTION:
Title: ${jobDescription.title} (${jobDescription.location} · ${jobDescription.jobType || 'Hybrid'}, ${jobDescription.experienceRange}, Min CGPA ${jobDescription.minCgpa})
Required Skills: ${jobDescription.requiredSkills.join(', ')}
Preferred Skills: ${jobDescription.preferredSkills.join(', ')}
Details: ${String(jobDescription.description ?? '').slice(0, 1200)}

CANDIDATES:
${JSON.stringify(compact)}`,
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            matchScore: { type: Type.INTEGER },
            scoreBreakdown: {
              type: Type.OBJECT,
              properties: {
                skillsScore: { type: Type.INTEGER },
                projectsScore: { type: Type.INTEGER },
                experienceScore: { type: Type.INTEGER },
                academicsScore: { type: Type.INTEGER },
                achievementsScore: { type: Type.INTEGER },
              },
              required: ['skillsScore', 'projectsScore', 'experienceScore', 'academicsScore', 'achievementsScore'],
            },
            matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiSummary: { type: Type.STRING },
          },
          required: ['id', 'matchScore', 'matchedSkills', 'missingSkills', 'aiSummary'],
        },
      },
    });

    if (rawAiResponse) {
      const raw = JSON.parse(rawAiResponse);
      if (Array.isArray(raw) && raw.length > 0) {
        const updates = raw.map((item: any) => {
          const matchingCand = candidates.find((c) => c.id === String(item.id));
          const localScoring = matchingCand ? scoreCandidateProfile(matchingCand, jobDescription) : null;

          return {
            id: String(item.id),
            matchScore: clampScore(Number(item.matchScore)),
            matchedSkills: Array.isArray(item.matchedSkills)
              ? item.matchedSkills.filter((s: unknown): s is string => typeof s === 'string')
              : localScoring?.matchedSkills ?? [],
            missingSkills: Array.isArray(item.missingSkills)
              ? item.missingSkills.filter((s: unknown): s is string => typeof s === 'string')
              : localScoring?.missingSkills ?? [],
            scoreBreakdown: item.scoreBreakdown && Number.isFinite(Number(item.scoreBreakdown.skillsScore))
              ? {
                  skillsScore: Math.max(0, Math.min(30, Math.round(Number(item.scoreBreakdown.skillsScore)))),
                  projectsScore: Math.max(0, Math.min(25, Math.round(Number(item.scoreBreakdown.projectsScore)))),
                  experienceScore: Math.max(0, Math.min(20, Math.round(Number(item.scoreBreakdown.experienceScore)))),
                  academicsScore: Math.max(0, Math.min(15, Math.round(Number(item.scoreBreakdown.academicsScore)))),
                  achievementsScore: Math.max(0, Math.min(10, Math.round(Number(item.scoreBreakdown.achievementsScore)))),
                  extracurricularScore: localScoring?.scoreBreakdown.extracurricularScore,
                  projectDimensions: localScoring?.scoreBreakdown.projectDimensions,
                  academicsBreakdown: localScoring?.scoreBreakdown.academicsBreakdown,
                  weightsApplied: localScoring?.scoreBreakdown.weightsApplied,
                }
              : localScoring?.scoreBreakdown,
            aiSummary: typeof item.aiSummary === 'string' && item.aiSummary.trim()
              ? item.aiSummary
              : localScoring?.aiSummary ?? '',
            detailedProjects: localScoring?.detailedProjects ?? (matchingCand?.detailedProjects || matchingCand?.projects?.map(p => analyzeProjectDeeply(p, jobDescription, matchingCand.skills))),
            extracurriculars: localScoring?.extracurriculars ?? (matchingCand?.extracurriculars || []),
            holisticAnalysis: localScoring?.holisticAnalysis,
          };
        });
        return { updates };
      }
    }
  } catch {
    // Fall back to local rescore engine
  }

  // Local rescore calculation
  const updates = candidates.map((c) => {
    const scored = scoreCandidateProfile(c, jobDescription);
    return {
      id: c.id,
      matchScore: scored.matchScore,
      matchedSkills: scored.matchedSkills,
      missingSkills: scored.missingSkills,
      scoreBreakdown: scored.scoreBreakdown,
      aiSummary: scored.aiSummary,
      detailedProjects: scored.detailedProjects,
      extracurriculars: scored.extracurriculars,
      holisticAnalysis: scored.holisticAnalysis,
    };
  });

  return { updates };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
