import type { StudioProject } from '../utils/projectFilters';

import inkFluidPrimary from '../assets/images/ink_fluid_primary_1795339066062.jpg';
import inkFluidSecondary from '../assets/images/ink_fluid_secondary_1795339066701.jpg';
import workKuroda from '../assets/images/work_kuroda_ceramics_1795339067158.jpg';
import workSolis from '../assets/images/work_solis_acoustics_1795339067313.jpg';
import workVelour from '../assets/images/work_velour_type_1795339067918.jpg';
import workAether from '../assets/images/work_aether_pavilion_1795339066802.jpg';

export interface InkPlate {
  id: string;
  label: string;
  description: string;
  imageSrc: string;
  fallbackGradient: string;
  swatchHex: string;
}

export interface StudioCapability {
  index: string;
  title: string;
  summary: string;
  deliverables: string[];
  timeline: string;
  benchmark: string;
}

export interface ClientTestimonial {
  quote: string;
  author: string;
  role: string;
  organization: string;
  outcome: string;
}

export const INK_PLATES: InkPlate[] = [
  {
    id: 'ultramarine-flame',
    label: 'Quantum Ultramarine',
    description: 'Deep cobalt, high-contrast violet, and radiant tangerine quantum interference.',
    imageSrc: inkFluidPrimary,
    fallbackGradient:
      'radial-gradient(circle at 22% 52%, #1D2CE0 0%, #7C148A 38%, #E11D48 68%, #F97316 100%)',
    swatchHex: '#1D4ED8',
  },
  {
    id: 'vermilion-ochre',
    label: 'Obsidian & Amber',
    description: 'Stark obsidian, molten amber, and midnight emerald algorithmic resonance.',
    imageSrc: inkFluidSecondary,
    fallbackGradient:
      'radial-gradient(circle at 30% 45%, #B91C1C 0%, #D97706 42%, #0F766E 74%, #1E1B4B 100%)',
    swatchHex: '#B91C1C',
  },
];

export const STUDIO_PROJECTS: StudioProject[] = [
  {
    id: 'holistic-evaluation-engine',
    title: 'Holistic Multi-Parameter Evaluation Engine',
    client: 'Engineering & Research Intake',
    category: 'Identity',
    year: '2026',
    metric: '5-Pillar Holistic Scoring Matrix',
    summary:
      'Deep-reading AI intelligence analyzing real candidate projects across Uniqueness, Innovation, Societal Impact, Feasibility, and Practicality alongside weighted academic records.',
    challenge:
      'Legacy ATS platforms rely on rudimentary keyword frequency, erroneously shortlisting keyword-stuffed templates while discarding elite engineers who describe authentic technical solutions.',
    craftNote:
      'Engineered holistic subjective weighting where project uniqueness, verified CGPA milestones, and extracurricular leadership form a composite talent score rather than binary keyword filters.',
    deliverables: [
      'Multi-Parameter Project Analyzer',
      'Innovation & Feasibility Scorer',
      'Academic Record Normalization',
      'Subjective Weight Tuning Controls',
    ],
    image: workKuroda,
    imageAlt: 'Tactile visualization of multi-parameter candidate evaluation scoring and verification',
    aspect: '16/9',
    featured: true,
  },
  {
    id: 'ai-detection-sentinel',
    title: 'Synthetic AI Detection & Auto-Rejection',
    client: 'Integrity & Verification Sentinel',
    category: 'Motion',
    year: '2026',
    metric: '99.4% AI Detection · Instant Disqualification',
    summary:
      'Real-time syntactic, stylistic, and semantic entropy fingerprinting that detects LLM-generated applicant artifacts and auto-rejects synthetic submissions.',
    challenge:
      'Mass generative AI resume tools flood requisition queues with artificially optimized resumes, creating massive recruiter review fatigue and false positive shortlists.',
    craftNote:
      'Constructed a multi-layer stylistic variance and perplexity detector that separates authentic human achievement from synthetic prompt outputs at point of upload.',
    deliverables: [
      'Synthetic Resume Classifier',
      'Instant Auto-Rejection Rules',
      'ATS-Friendly Certification',
      'Full Audit Trail & Confidence Logs',
    ],
    image: workSolis,
    imageAlt: 'Streamlined acoustic and neural visualization representing precision AI detection filters',
    aspect: '4/3',
  },
  {
    id: 'ats-friendly-certification',
    title: 'ATS-Friendly Architecture Certification',
    client: 'Parsing & Extraction Standard',
    category: 'Identity',
    year: '2025',
    metric: '100% Parsing Fidelity Across Formats',
    summary:
      'Structural document layout verification guaranteeing zero-loss parsing across PDF, DOCX, and complex typographic layouts.',
    challenge:
      'Candidates formatting resumes with clean modern typography or columnar layouts are penalized by legacy regex parsers, corrupting critical project records.',
    craftNote:
      'Implemented dual-pass AST extraction with bounding coordinate mapping, preserving complex mathematical expressions, live repository links, and chronological progression.',
    deliverables: [
      'Document Hierarchy Validator',
      'ATS Compliance Verification',
      'Coordinate-Aware AST Parser',
      'Scanned OCR Fallback Engine',
    ],
    image: workVelour,
    imageAlt: 'Typographic print geometry representing clean parsing structure and ATS architecture',
    aspect: '4/3',
  },
  {
    id: 'quantum-finalist-matrix',
    title: 'Quantum Finalist Comparison Matrix',
    client: 'Talent Acquisition Decision Room',
    category: 'Digital',
    year: '2025',
    metric: '4.6× Accelerated Finalist Selection Velocity',
    summary:
      'Side-by-side dimensional candidate comparison matrix with Google Maps commute grounding and automated executive interview briefing dossiers.',
    challenge:
      'Hiring managers struggle to compare top finalists across distinct dimensions, relying on disjointed spreadsheets and subjective impression notes.',
    craftNote:
      'Designed an interactive quantum comparison room with live parameter re-weighting, geocoded commute validation, and exportable decision dossiers.',
    deliverables: [
      'Side-by-Side Finalist Matrix',
      'Google Maps Location Grounding',
      'Candidate Ranklist Podium',
      'Executive Briefing Generation',
    ],
    image: workAether,
    imageAlt: 'Architectural contemporary space symbolizing clarity and structure in finalist evaluation',
    aspect: '4/3',
  },
];

export const STUDIO_CAPABILITIES: StudioCapability[] = [
  {
    index: '01.',
    title: 'Holistic Multi-Parameter Scoring',
    summary:
      'Evaluates the candidate as a cohesive whole: projects (uniqueness, innovation, societal impact, feasibility, practicality), verified experience, CGPA, 10th/12th marks, and leadership.',
    deliverables: [
      'Project Uniqueness & Innovation Scoring',
      'Societal Impact & Practicality Assessment',
      'Academic Record & CGPA Verification',
      'Subjective Requisition Weight Tuning',
    ],
    timeline: 'Instant Live Screening',
    benchmark: 'Zero reliance on keyword frequency; 100% deep semantic and holistic evaluation.',
  },
  {
    index: '02.',
    title: 'Synthetic AI Detection & Instant Rejection',
    summary:
      'Detects LLM-hallucinated resumes, auto-generated cover letters, and keyword stuffing. Disqualifies synthetic submissions instantly while safeguarding genuine human talent.',
    deliverables: [
      'Stylistic Entropy & Perplexity Analysis',
      'Automated Disqualification Workflow',
      'Recruiter Confidence Breakdown',
      'Explainable AI Audit Documentation',
    ],
    timeline: 'Real-Time at Upload',
    benchmark: '99.4% precision in isolating AI-generated templates and artificial claims.',
  },
  {
    index: '03.',
    title: 'ATS-Friendly Certification Engine',
    summary:
      'Structural document layout verification ensuring candidate resumes parse with 100% fidelity across modern and legacy applicant tracking systems.',
    deliverables: [
      'Document AST Parsing & Normalization',
      'Font & Column Hierarchy Checking',
      'Keyword Context Preservation',
      'Exportable ATS Compliance Badge',
    ],
    timeline: 'Sub-second parsing',
    benchmark: '100% schema consistency across multi-page PDF and Word documents.',
  },
  {
    index: '04.',
    title: 'Quantum Finalist Matrix & Location Grounding',
    summary:
      'Direct side-by-side comparison matrix with interactive radar charts, Google Maps verified commuting distances, and candidate calibration podiums.',
    deliverables: [
      'Multi-Candidate Matrix View',
      'Google Maps Places Grounding',
      'Scorecard Calibration Sliders',
      'Interview Briefing Dossiers',
    ],
    timeline: 'Instant Collaboration',
    benchmark: '4.6× faster consensus among cross-functional hiring committees.',
  },
];

export const STUDIO_METRICS = [
  { value: '100k+', label: 'Resumes deeply analyzed' },
  { value: '99.4%', label: 'AI detection precision' },
  { value: '0', label: 'False shortlists from keyword spam' },
];

export const CLIENT_TESTIMONIALS: ClientTestimonial[] = [
  {
    quote:
      'Before Schrodinger’s Lens, our engineering inbox was inundated with AI-generated resumes that matched every keyword on paper but lacked real execution. Schrodinger’s Lens filtered out 100% of the synthetic spam and surfaced engineers who built genuinely innovative projects.',
    author: 'Marcus Vance',
    role: 'VP of Engineering',
    organization: 'QuantumCloud Systems',
    outcome: '99.4% AI Rejection Precision',
  },
  {
    quote:
      'The multi-parameter project evaluation is unlike any ATS we’ve tested. It doesn’t just tally up keywords—it gauges the innovation, societal impact, and feasibility of actual work. Our hiring managers reached consensus in days rather than weeks.',
    author: 'Elena Rostova',
    role: 'Head of Technical Talent Acquisition',
    organization: 'CyberneX Labs',
    outcome: '4.6× Shortlist Decision Speed',
  },
];

export const ENQUIRY_SCOPES = [
  'Enterprise ATS Deployment',
  'AI Screening & Rejection Pilot',
  'Custom Parameter Weights Consultation',
  'Full Pipeline Integration',
];

export const ENQUIRY_BUDGETS = [
  '1–500 Resumes/mo',
  '500–5,000 Resumes/mo',
  '5,000+ Resumes/mo (Enterprise)',
];
