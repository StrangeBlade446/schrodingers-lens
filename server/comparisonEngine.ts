import { Type, ThinkingLevel } from '@google/genai';
import { generateContentWithFallback } from './gemini.ts';
import type { Candidate, ComparisonRecommendation, JobDescription } from '../src/types/ats.ts';

export async function generateComparisonEngine(
  jobDescription: JobDescription,
  candidates: Candidate[]
): Promise<ComparisonRecommendation> {
  const prompt = `Compare these ${candidates.length} candidates side-by-side against the active Job Description across holistic multi-parameters:
1. Technical Skills match & depth
2. Projects deep-dive: Uniqueness, Innovation, Societal Impact, Feasibility, and Practicality
3. Work Experience & role trajectory
4. Academic rigor & longitudinal consistency (CGPA, 10th %, 12th %)
5. Achievements, Honors, and Extracurricular Leadership

ACTIVE JOB DESCRIPTION:
Role: ${jobDescription.title} (${jobDescription.location} · ${jobDescription.jobType || 'Hybrid'}, ${jobDescription.experienceRange})
Min CGPA: ${jobDescription.minCgpa}
Required Skills: ${jobDescription.requiredSkills.join(', ')}
Preferred Skills: ${jobDescription.preferredSkills.join(', ')}

CANDIDATES:
${JSON.stringify(
  candidates.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    currentRole: c.currentRole,
    matchScore: c.matchScore,
    scoreBreakdown: c.scoreBreakdown,
    projects:
      c.detailedProjects?.slice(0, 3).map((p) => ({
        title: p.title,
        technologies: p.technologies,
        uniqueness: `${p.uniquenessScore}/10`,
        innovation: `${p.innovationScore}/10`,
        societalImpact: `${p.societalImpactScore}/10`,
        feasibility: `${p.feasibilityScore}/10`,
        practicality: `${p.practicalityScore}/10`,
      })) || c.projects?.slice(0, 3).map((p) => ({ title: p.title, technologies: p.technologies })),
    achievements: c.achievements?.slice(0, 3),
    extracurriculars: c.extracurriculars?.slice(0, 3),
    cgpa: c.cgpa,
    tenthPercent: c.tenthPercent,
    twelfthPercent: c.twelfthPercent,
    yearsOfExperience: c.yearsOfExperience,
    city: c.city,
    graduationYear: c.graduationYear,
    college: c.college,
    matchedSkills: c.matchedSkills,
    missingSkills: c.missingSkills,
    stage: c.stage,
  }))
)}

Identify the strongest fit, provide a 2-sentence executive rationale comparing trade-offs across all parameters (especially project innovation vs production feasibility and academic consistency), and list one comprehensive strength + one caveat per candidate.`;

  try {
    const rawAiResponse = await generateContentWithFallback({
      contents: prompt,
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendedCandidateId: { type: Type.STRING },
          recommendedCandidateName: { type: Type.STRING },
          headline: { type: Type.STRING },
          rationale: { type: Type.STRING },
          tradeOffs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                candidateId: { type: Type.STRING },
                candidateName: { type: Type.STRING },
                strength: { type: Type.STRING },
                caveat: { type: Type.STRING },
              },
              required: ['candidateId', 'candidateName', 'strength', 'caveat'],
            },
          },
        },
        required: [
          'recommendedCandidateId',
          'recommendedCandidateName',
          'headline',
          'rationale',
          'tradeOffs',
        ],
      },
    });

    if (rawAiResponse) {
      const parsed = JSON.parse(rawAiResponse) as ComparisonRecommendation;
      if (parsed?.headline && parsed?.recommendedCandidateName && Array.isArray(parsed?.tradeOffs)) {
        return parsed;
      }
    }
  } catch {
    // Fall back to local comparison analysis
  }

  // Built-in Executive Comparative Intelligence Engine
  return buildLocalComparisonRecommendation(candidates, jobDescription);
}

function buildLocalComparisonRecommendation(
  candidates: Candidate[],
  jd: JobDescription
): ComparisonRecommendation {
  const sorted = [...candidates].sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      b.matchedSkills.length - a.matchedSkills.length ||
      b.cgpa - a.cgpa ||
      b.yearsOfExperience - a.yearsOfExperience
  );
  const top = sorted[0];
  const runnerUp = sorted[1] ?? sorted[0];

  const tradeOffs = candidates.map((c) => {
    const topSkills = (c.matchedSkills && c.matchedSkills.length > 0
      ? c.matchedSkills.slice(0, 3)
      : c.skills.slice(0, 3)
    ).join(', ');

    const projNote = c.projects && c.projects.length > 0
      ? `, project portfolio with ${c.projects[0].title}`
      : '';
    const achieveNote = c.achievements && c.achievements.length > 0
      ? ` and achievements (${c.achievements[0].slice(0, 35)})`
      : '';

    const strength = `Scores ${c.matchScore}/100 across 5 holistic pillars (Skills, Projects, Experience, Academics, Achievements). Brings ${c.yearsOfExperience.toFixed(1)} yrs experience, CGPA ${c.cgpa.toFixed(2)} (12th: ${c.twelfthPercent}%, 10th: ${c.tenthPercent}%), ${topSkills || 'core technical stack'}${projNote}${achieveNote}.`;

    const caveat =
      c.missingSkills && c.missingSkills.length > 0
        ? `Lacks JD skills: ${c.missingSkills.slice(0, 3).join(', ')}; assess adaptability during system design evaluation.`
        : c.yearsOfExperience < 3
          ? `Covers all required competencies; calibrate compensation and mentorship needs for level alignment.`
          : `Full technical alignment across required JD skills; confirm immediate availability and team fit.`;

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
      : `leads on overall architectural alignment (${top.matchedSkills.length} matched skills)`;

  const runnerUpNote =
    runnerUp.id !== top.id
      ? ` ${runnerUp.fullName} (${runnerUp.matchScore}/100) provides a compelling alternative with ${runnerUp.yearsOfExperience.toFixed(1)} years of hands-on experience.`
      : '';

  return {
    recommendedCandidateId: top.id,
    recommendedCandidateName: top.fullName,
    headline: `${top.fullName} is the strongest fit for ${jd.title} (${top.matchScore}/100 match)`,
    rationale: `${top.fullName} leads candidate evaluation at ${top.matchScore}/100 and ${gapNote} with ${top.yearsOfExperience.toFixed(1)} years of professional experience and a strong ${top.cgpa.toFixed(2)} CGPA.${runnerUpNote}`,
    tradeOffs,
  };
}
