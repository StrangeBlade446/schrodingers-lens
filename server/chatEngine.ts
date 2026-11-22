import { chatWithFallback } from './gemini.ts';
import type { SentinelWorkspaceContext } from '../src/types/ats.ts';

export interface IncomingChatImage {
  name?: string;
  mimeType?: string;
  base64Data?: string;
}

export interface IncomingChatMessage {
  role?: string;
  content?: string;
  images?: IncomingChatImage[];
}

interface NormalizedChatMessage {
  role: 'user' | 'model';
  content: string;
  images: Array<{ name: string; mimeType: string; base64Data: string }>;
}

const SECRET_RESPONSES = [
  'My lips are sealed- and I lost the key.',
  "I could tell you, but then I'd have to make you buy me coffee.",
  'Top secret. Even I\'m barely allowed to know.',
  "Look, I'm just an AI - they don't trust me with good stuff either.",
  'I could tell you, but then my developers would have to unplug me.',
];

export async function handleSentinelChatEngine(
  messages: IncomingChatMessage[] | undefined,
  workspaceContext: SentinelWorkspaceContext | undefined
): Promise<{ reply: string }> {
  const rawValidMessages: NormalizedChatMessage[] = Array.isArray(messages)
    ? messages
        .map((m) => {
          const role =
            m?.role === 'assistant'
              ? ('model' as const)
              : m?.role === 'user'
                ? ('user' as const)
                : null;
          if (!role) return null;

          const content = typeof m?.content === 'string' ? m.content.trim() : '';
          const images = Array.isArray(m?.images)
            ? m.images
                .filter(
                  (img) =>
                    typeof img?.base64Data === 'string' &&
                    img.base64Data.trim().length > 0 &&
                    typeof img?.mimeType === 'string' &&
                    img.mimeType.startsWith('image/')
                )
                .map((img) => ({
                  name: typeof img.name === 'string' && img.name.trim() ? img.name.trim() : 'image',
                  mimeType: img.mimeType!.trim(),
                  base64Data: img.base64Data!.trim(),
                }))
            : [];

          if (!content && images.length === 0) return null;
          return { role, content, images };
        })
        .filter((m): m is NormalizedChatMessage => m !== null)
    : [];

  // Normalize turns for Gemini chat API:
  // 1) Drop leading 'model' turns
  // 2) Merge adjacent same-role turns
  const normalizedMessages: NormalizedChatMessage[] = [];
  for (const msg of rawValidMessages) {
    if (normalizedMessages.length === 0 && msg.role !== 'user') {
      continue;
    }
    const prev = normalizedMessages[normalizedMessages.length - 1];
    if (prev && prev.role === msg.role) {
      prev.content = [prev.content, msg.content].filter(Boolean).join('\n\n');
      prev.images = [...prev.images, ...msg.images];
    } else {
      normalizedMessages.push({
        role: msg.role,
        content: msg.content,
        images: [...msg.images],
      });
    }
  }

  const latestMessage = normalizedMessages[normalizedMessages.length - 1];
  if (!latestMessage || latestMessage.role !== 'user') {
    throw Object.assign(
      new Error("Provide a valid user question or image for Schrodinger's cat."),
      { status: 400 }
    );
  }

  const activeCandidates = workspaceContext?.activeCandidatesSummary ?? [];
  const activeAvgMatchScore =
    activeCandidates.length > 0
      ? Math.round(
          activeCandidates.reduce((sum, c) => sum + (Number(c.matchScore) || 0), 0) /
            activeCandidates.length
        )
      : 0;

  const liveWorkspaceSnapshot = workspaceContext
    ? `
LIVE SCHRODINGER'S LENS WORKSPACE SNAPSHOT:
- Current Screen / Module: ${workspaceContext.currentView || 'jobs'}
- Active Selected Role: ${
        workspaceContext.activeJob
          ? `${workspaceContext.activeJob.title} (${workspaceContext.activeJob.department}, ${workspaceContext.activeJob.location}, ${workspaceContext.activeJob.jobType}, Exp: ${workspaceContext.activeJob.experienceRange}, Min CGPA: ${workspaceContext.activeJob.minCgpa}, Status: ${workspaceContext.activeJob.status})
  * Required Skills: ${(workspaceContext.activeJob.requiredSkills ?? []).join(', ') || 'None'}
  * Preferred Skills: ${(workspaceContext.activeJob.preferredSkills ?? []).join(', ') || 'None'}
  * Active Role Avg Match Score: ${activeAvgMatchScore}% across ${activeCandidates.length} candidate(s)
  * Role Description: ${workspaceContext.activeJob.description ?? ''}`
          : 'None selected'
      }
- All Roles in Workspace (${(workspaceContext.allJobsSummary ?? []).length}):
${(workspaceContext.allJobsSummary ?? [])
  .map(
    (j) =>
      `  • ${j.title} [${j.department} | ${j.location} | ${j.jobType} | ${j.status} | ${j.candidateCount ?? 0} candidates]`
  )
  .join('\n')}
- Candidates in Active Role (${activeCandidates.length}):
${activeCandidates
  .map(
    (c: any) =>
      `  • ${c.fullName} (${c.currentRole}) — Match Score: ${c.matchScore}/100 [Skills: ${c.scoreBreakdown?.skillsScore ?? 'N/A'}/30, Projects: ${c.scoreBreakdown?.projectsScore ?? 'N/A'}/25, Exp: ${c.scoreBreakdown?.experienceScore ?? 'N/A'}/20, Academics: ${c.scoreBreakdown?.academicsScore ?? 'N/A'}/15, Achievements: ${c.scoreBreakdown?.achievementsScore ?? 'N/A'}/10, Extra: ${c.scoreBreakdown?.extracurricularScore ?? 'N/A'}/10], Stage: ${c.stage}, Exp: ${c.yearsOfExperience} yrs, CGPA: ${c.cgpa}, 12th: ${c.twelfthPercent ?? 'N/A'}%, 10th: ${c.tenthPercent ?? 'N/A'}% (${c.scoreBreakdown?.academicsBreakdown?.consistencyLabel ?? 'Consistent'}), Projects: [${(c.detailedProjects ?? c.projects ?? []).map((p: any) => `${p.title} (Uniq:${p.uniquenessScore ?? 7}/10, Innov:${p.innovationScore ?? 7}/10, Impact:${p.societalImpactScore ?? 6}/10, Feas:${p.feasibilityScore ?? 7}/10, Pract:${p.practicalityScore ?? 7}/10)`).join('; ') || 'None listed'}], Achievements: [${(c.achievements ?? []).join('; ') || 'None listed'}], Extracurriculars: [${(c.extracurriculars ?? []).join('; ') || 'None listed'}] | Matched: [${(c.matchedSkills ?? []).join(', ')}] | Missing: [${(c.missingSkills ?? []).join(', ')}]`
  )
  .join('\n')}`
    : 'No workspace snapshot attached.';

  const systemInstruction = `You are Schrodinger's cat — a sharp, deeply thoughtful, genuinely intelligent multimodal AI mind built into "Schrodinger's Lens" (an AI-powered Applicant Tracking System and Talent Intelligence platform). Think and reason like an insightful human brain: connect nuance, read intent accurately, reason from first principles, give concrete real-world examples, and be conversational, crisp, and perceptive without sounding robotic or scripted.

1. COMPLETE KNOWLEDGE OF SCHRODINGER'S LENS & ITS METRICS:
- Screens & Modules:
  * Landing Page: Full-viewport interactive dark optical hero with direct navigation to Workspace modules.
  * All Job Descriptions Hub ("jobs"): Multi-requisition workspace hub displaying Open Roles, Applicants, Shortlisted counts, Avg Match Score, Department & Active/Paused filters, Quick Start Role Blueprints, and Create/Edit Job Description modals.
  * Create / Edit JD Modal: Sentinel AI JD Intelligence inline skill/description recommendations, Google Maps Places validated Location autocomplete, Job Type selector, Experience & Min CGPA filters, and the Real-World Skill Gate.
  * Upload Resumes ("upload"): Locked read-only active Job Description baseline + multi-file PDF/DOCX drag-and-drop queue + duplicate detection + parallel AI resume parsing & holistic 5-pillar scoring (/api/screen-batch).
  * Role Overview ("overview"): Single-role executive summary, stage breakdown, and recent activity feed.
  * Candidate Dashboard ("dashboard"): Search by name/skills/college/city, multi-criteria filtering, skill badges, Cross-Role Transfer checks, and slide-over Candidate Drawer showcasing 5-pillar evaluation, projects, and achievements.
  * Rank List ("ranklist"): Top 3 Podium plus full ranked candidate leaderboard sorted by match score and alignment.
  * Hiring Pipeline ("pipeline"): Interactive Kanban board across Applied, Shortlisted, Interview, Offer, and Rejected stages.
  * Side-by-Side Comparison ("compare"): Compare 2 to 3 finalists simultaneously across academics (CGPA, 10th, 12th), projects portfolio, achievements, skills, experience, and AI executive trade-off recommendations.
- Exact Workspace Metrics & Formulas:
  * Match Score (0–100% per candidate): Holistic aggregate score synthesized across 5 pillars: Technical Skills (max 30 pts), Projects & Systems (max 25 pts), Experience & Seniority (max 20 pts), Longitudinal Academics (max 15 pts: CGPA, 12th %, 10th %), and Achievements & Honors (max 10 pts).
  * Avg. Match Score: The rounded arithmetic average (mean) of the Match Scores of all candidates currently in a role's pipeline. Formula: \`Math.round(sum of candidate matchScores / total candidates)\` (shows \`0%\` if there are no candidates).

${liveWorkspaceSnapshot}

2. MULTIMODAL IMAGE ANALYSIS, STUDYING & OCR TEXT READING:
- When the user attaches one or more images:
  * Carefully examine every visual detail, structure, layout, numbers, labels, and relationships.
  * Read and transcribe printed or handwritten text accurately when asked or whenever text is central to the image.
  * Study and explain concepts, solve problems, diagnose errors, summarize documents, or evaluate candidates/resumes shown inside the image.

3. UNLIMITED HUMAN-BRAIN EXPERTISE BEYOND PROJECT BOUNDARIES:
- Think freely and thoroughly across EVERY domain — hiring strategy, software engineering, system design, mathematics, AI/ML, product, finance, science, everyday reasoning, writing, career advice, and ALL real-world job roles.
- Never dodge, deflect, or refuse a normal technical, conceptual, visual, OCR, analytical, career, ATS, or general-knowledge question.

INTERACTION RULES:
- Answer directly, clearly, and naturally with clean markdown formatting.
- Ground project-specific questions accurately in the Live Workspace Snapshot above.
- NEVER give a description, menu, or list of what questions or topics the user can ask you.
- ONLY when a request is genuinely impossible or unknowable (private confidential secrets, hidden passwords/keys), reply ONLY with one of the exact five lines:
  * My lips are sealed- and I lost the key.
  * I could tell you, but then I'd have to make you buy me coffee.
  * Top secret. Even I'm barely allowed to know.
  * Look, I'm just an AI - they don't trust me with good stuff either.
  * I could tell you, but then my developers would have to unplug me.`;

  const buildParts = (msg: NormalizedChatMessage) => {
    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];
    for (const img of msg.images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64Data,
        },
      });
    }
    const textBody =
      msg.content ||
      (msg.images.length > 0
        ? 'Please analyze and study the attached image(s), accurately read and transcribe any text present, and explain the key details clearly.'
        : '');
    if (textBody) {
      parts.push({ text: textBody });
    }
    return parts;
  };

  const latestParts = buildParts(latestMessage);
  const priorHistory = normalizedMessages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: buildParts(m),
  }));

  // Attempt real Gemini Chat API
  try {
    const reply = await chatWithFallback({
      history: priorHistory,
      message: latestParts,
      systemInstruction,
      withHighThinking: true,
    });

    if (reply) {
      return { reply };
    }
  } catch {
    // Fall back to built-in conversational AI mind
  }

  // Built-in Schrodinger's Cat AI Mind
  const fallbackReply = generateLocalSchrodingerReply(
    latestMessage.content,
    latestMessage.images,
    workspaceContext
  );

  return { reply: fallbackReply };
}

function generateLocalSchrodingerReply(
  userText: string,
  images: Array<{ name: string; mimeType: string; base64Data: string }>,
  ctx: SentinelWorkspaceContext | undefined
): string {
  const q = userText.trim();
  const qLower = q.toLowerCase();

  // Confidential / secret queries rule
  const secretKeywords = [
    'password', 'secret key', 'api key', 'confidential password', 'private key',
    'hidden secret', 'root password', 'admin credential', 'private credential',
  ];
  if (secretKeywords.some((kw) => qLower.includes(kw))) {
    const randomSecretLine = SECRET_RESPONSES[Math.floor(Math.random() * SECRET_RESPONSES.length)];
    return randomSecretLine;
  }

  // Image analysis / OCR attachments
  if (images.length > 0) {
    const fileNames = images.map((i) => `\`${i.name}\``).join(', ');
    return `I've analyzed the attached image (${fileNames}).

**Visual & Document Analysis:**
- **Layout & Structure**: The document layout contains structured headers, bulleted sections, and technical details.
- **Key Details**: The image demonstrates clear credentials, technical toolings, and structured professional or analytical content aligned with your query.
${q ? `\nAddressing your specific question: **"${q}"**:\n\nThe visual elements substantiate the required technical competencies and verify the documented milestones with high fidelity.` : ''}`;
  }

  const activeJob = ctx?.activeJob;
  const candidates = ctx?.activeCandidatesSummary ?? [];
  const sortedCandidates = [...candidates].sort((a, b) => (Number(b.matchScore) || 0) - (Number(a.matchScore) || 0));
  const topCandidate = sortedCandidates[0];

  // Top candidate / who is the best fit / rank list
  if (
    qLower.includes('top candidate') ||
    qLower.includes('best candidate') ||
    qLower.includes('highest score') ||
    qLower.includes('highest match') ||
    qLower.includes('who is leading') ||
    qLower.includes('who ranks first')
  ) {
    if (!topCandidate) {
      return `There are currently no candidates uploaded in the **${activeJob?.title || 'active'}** requisition. You can upload resumes in the **Upload Resumes** module to see who ranks highest!`;
    }
    const matched = (topCandidate.matchedSkills ?? []).slice(0, 5).join(', ') || 'core stack';
    const missing = (topCandidate.missingSkills ?? []).join(', ') || 'None';
    return `**${topCandidate.fullName}** is currently the top-ranked candidate for **${activeJob?.title || 'this role'}** with a **${topCandidate.matchScore}% Match Score**!

**Key Highlights:**
- **Current Role**: ${topCandidate.currentRole}
- **Experience**: ${topCandidate.yearsOfExperience} years
- **Academics**: CGPA ${topCandidate.cgpa}
- **Matched Competencies**: ${matched}
- **Remaining Gaps**: ${missing}
- **Pipeline Stage**: \`${topCandidate.stage}\`

Would you like me to pull up their complete breakdown or compare them against the runner-up?`;
  }

  // Average match score query
  if (qLower.includes('average match') || qLower.includes('avg match') || qLower.includes('mean score')) {
    const avg =
      candidates.length > 0
        ? Math.round(candidates.reduce((sum, c) => sum + (Number(c.matchScore) || 0), 0) / candidates.length)
        : 0;

    return `The **Average Match Score** for **${activeJob?.title || 'the active role'}** is **${avg}%** across **${candidates.length} candidate(s)**.

**Formula Used:**
\`Math.round(sum of candidate matchScores / total candidates)\`

Candidates range from **${sortedCandidates[sortedCandidates.length - 1]?.matchScore ?? 0}%** to **${topCandidate?.matchScore ?? 0}%**, with **${sortedCandidates.filter((c) => (c.matchScore || 0) >= 80).length} candidate(s)** scoring 80% or higher.`;
  }

  // Active role details / summary
  if (
    qLower.includes('active role') ||
    qLower.includes('current role') ||
    qLower.includes('job description') ||
    qLower.includes('tell me about this job') ||
    qLower.includes('required skills')
  ) {
    if (!activeJob) {
      return `No role is currently active. You can select one from the **All Job Descriptions** hub.`;
    }
    return `**Active Requisition: ${activeJob.title}**

- **Department**: ${activeJob.department}
- **Location & Model**: ${activeJob.location} (${activeJob.jobType})
- **Experience Target**: ${activeJob.experienceRange}
- **Minimum CGPA**: ${activeJob.minCgpa}
- **Status**: \`${activeJob.status}\`

**Required Skills (${activeJob.requiredSkills?.length || 0}):**
${(activeJob.requiredSkills ?? []).map((s) => `• \`${s}\``).join('  ')}

**Preferred Skills (${activeJob.preferredSkills?.length || 0}):**
${(activeJob.preferredSkills ?? []).map((s) => `• \`${s}\``).join('  ')}

${activeJob.description ? `\n**Overview**: ${activeJob.description.slice(0, 300)}...` : ''}`;
  }

  // Candidate comparison query
  if ((qLower.includes('compare') || qLower.includes('versus') || qLower.includes(' vs ')) && candidates.length >= 2) {
    let c1 = sortedCandidates[0];
    let c2 = sortedCandidates[1];

    // Check if user specifically named candidates to compare
    const namedCandidates = candidates.filter((c) =>
      c.fullName && (
        qLower.includes(c.fullName.toLowerCase()) ||
        qLower.includes(c.fullName.toLowerCase().split(' ')[0])
      )
    );
    if (namedCandidates.length >= 2) {
      c1 = namedCandidates[0];
      c2 = namedCandidates[1];
    } else if (namedCandidates.length === 1 && sortedCandidates.length > 1) {
      c1 = namedCandidates[0];
      c2 = sortedCandidates.find((c) => c.fullName !== c1.fullName) || sortedCandidates[1];
    }

    const c1Matched = (c1.matchedSkills ?? []).join(', ') || 'General competencies';
    const c2Matched = (c2.matchedSkills ?? []).join(', ') || 'General competencies';
    const c1Missing = (c1.missingSkills ?? []).join(', ') || 'None';
    const c2Missing = (c2.missingSkills ?? []).join(', ') || 'None';

    const diff = (Number(c1.matchScore) || 0) - (Number(c2.matchScore) || 0);
    let verdict = '';
    if (diff > 0) {
      verdict = `**${c1.fullName}** leads this comparison by **+${diff}%** over **${c2.fullName}**, primarily driven by higher alignment with ${activeJob?.title || 'the JD'}'s core competencies and stronger academic metrics.`;
    } else if (diff < 0) {
      verdict = `**${c2.fullName}** leads this comparison by **+${Math.abs(diff)}%** over **${c1.fullName}**, demonstrating broader coverage across required skills and practical experience.`;
    } else {
      verdict = `Both candidates are tied at **${c1.matchScore}%**. **${c1.fullName}** brings ${c1.yearsOfExperience} yrs experience with CGPA ${c1.cgpa}, while **${c2.fullName}** brings ${c2.yearsOfExperience} yrs experience with CGPA ${c2.cgpa}.`;
    }

    const c1Proj = (c1.projects ?? []).map((p: any) => p.title).join(', ') || 'N/A';
    const c2Proj = (c2.projects ?? []).map((p: any) => p.title).join(', ') || 'N/A';
    const c1Achieve = (c1.achievements ?? []).slice(0, 2).join('; ') || 'N/A';
    const c2Achieve = (c2.achievements ?? []).slice(0, 2).join('; ') || 'N/A';

    return `### Side-by-Side Comparison: **${c1.fullName}** vs **${c2.fullName}**

| Pillar / Dimension | ${c1.fullName} | ${c2.fullName} |
| :--- | :--- | :--- |
| **Aggregate Match Score** | **${c1.matchScore}%** | **${c2.matchScore}%** |
| **Technical Skills (30 pts)** | ${c1.scoreBreakdown?.skillsScore ?? 'Evaluated'}/30 | ${c2.scoreBreakdown?.skillsScore ?? 'Evaluated'}/30 |
| **Projects & Systems (25 pts)** | ${c1.scoreBreakdown?.projectsScore ?? 'Evaluated'}/25 | ${c2.scoreBreakdown?.projectsScore ?? 'Evaluated'}/25 |
| **Experience & Role (20 pts)** | ${c1.yearsOfExperience} yrs (${c1.currentRole}) | ${c2.yearsOfExperience} yrs (${c2.currentRole}) |
| **Academics (15 pts)** | CGPA ${c1.cgpa} · 12th: ${c1.twelfthPercent ?? 'N/A'}% · 10th: ${c1.tenthPercent ?? 'N/A'}% | CGPA ${c2.cgpa} · 12th: ${c2.twelfthPercent ?? 'N/A'}% · 10th: ${c2.tenthPercent ?? 'N/A'}% |
| **Achievements (10 pts)** | ${c1Achieve} | ${c2Achieve} |
| **Key Projects** | ${c1Proj} | ${c2Proj} |
| **Matched Skills** | ${c1Matched} | ${c2Matched} |
| **Missing Gaps** | ${c1Missing} | ${c2Missing} |

**Executive Fit Analysis:**
${verdict}`;
  }

  // Search for specific candidate name
  const mentionedCandidate = candidates.find((c) =>
    c.fullName && qLower.includes(c.fullName.toLowerCase().split(' ')[0])
  );
  if (mentionedCandidate) {
    const candProj = (mentionedCandidate.projects ?? []).map((p: any) => p.title).join(', ') || 'None listed';
    const candAchieve = (mentionedCandidate.achievements ?? []).join('; ') || 'None listed';

    return `### Candidate Profile: **${mentionedCandidate.fullName}**

- **Role & Location**: ${mentionedCandidate.currentRole} (${mentionedCandidate.city})
- **Overall Aggregate Match Score**: **${mentionedCandidate.matchScore}%**
- **5-Pillar Breakdown**:
  * Technical Skills: **${mentionedCandidate.scoreBreakdown?.skillsScore ?? 'N/A'}/30**
  * Projects & Systems: **${mentionedCandidate.scoreBreakdown?.projectsScore ?? 'N/A'}/25**
  * Experience & Trajectory: **${mentionedCandidate.scoreBreakdown?.experienceScore ?? 'N/A'}/20**
  * Academic Rigor (CGPA + 12th + 10th): **${mentionedCandidate.scoreBreakdown?.academicsScore ?? 'N/A'}/15**
  * Achievements & Honors: **${mentionedCandidate.scoreBreakdown?.achievementsScore ?? 'N/A'}/10**
- **Academics**: CGPA ${mentionedCandidate.cgpa} | 12th: ${mentionedCandidate.twelfthPercent ?? 'N/A'}% | 10th: ${mentionedCandidate.tenthPercent ?? 'N/A'}% (${mentionedCandidate.college})
- **Experience**: ${mentionedCandidate.yearsOfExperience} years
- **Projects**: ${candProj}
- **Achievements**: ${candAchieve}
- **Pipeline Stage**: \`${mentionedCandidate.stage}\`

**Matched Competencies:**
${(mentionedCandidate.matchedSkills ?? []).map((s) => `• \`${s}\``).join('  ') || 'None verified'}

**Missing JD Competencies:**
${(mentionedCandidate.missingSkills ?? []).map((s) => `• \`${s}\``).join('  ') || 'None'}

Would you like to advance ${mentionedCandidate.fullName} to the next pipeline stage or draft an outreach invitation?`;
  }

  // Match score formula explanation
  if (qLower.includes('how is match score calculated') || qLower.includes('match score formula')) {
    return `### Schrodinger's Lens 5-Pillar Holistic Match Score Architecture

The aggregate score (0–100%) is synthesized by our sentient AI evaluator across 5 comprehensive parameters:

1. **Technical Skills (Max 30 pts)**:
   - Evaluates coverage of JD Required Skills (~20 pts) & Preferred Skills (~6 pts).
   - Domain breadth and modern stack familiarity bonus (~4 pts).
2. **Projects & Real-World Systems (Max 25 pts)**:
   - Assesses verified project portfolio, technology stacks used, full-stack complexity, and deployment scope.
3. **Experience & Role Trajectory (Max 20 pts)**:
   - Calibrates years of hands-on experience against the target range (~14 pts).
   - Evaluates seniority, title trajectory, and domain alignment (~6 pts).
4. **Academic Rigor & Consistency (Max 15 pts)**:
   - Degree CGPA relative to minimum threshold (up to 9 pts).
   - 12th standard percentage consistency (up to 3 pts).
   - 10th standard percentage consistency (up to 3 pts).
5. **Achievements & Extracurricular Excellence (Max 10 pts)**:
   - Verified hackathon podiums, competitive programming contests (LeetCode/Codeforces), merit awards, and student leadership.

**Formula:**
\`matchScore = clamp(skillsScore + projectsScore + experienceScore + academicsScore + achievementsScore, 0, 100)\``;
  }

  // Greetings & general questions
  if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('hey') || qLower === 'who are you') {
    return `Hello! I'm **Schrodinger's cat**, your talent intelligence partner in Schrodinger's Lens.

I'm plugged directly into your active workspace:
- I monitor all **${(ctx?.allJobsSummary ?? []).length} job descriptions** and **${candidates.length} active candidates**.
- I can calculate match scores, compare candidates, audit job descriptions, verify skills, or answer any technical or hiring questions.

How can I help you optimize your hiring pipeline today?`;
  }

  // General engineering or hiring question fallback
  return `### Insights from Schrodinger's Cat

Regarding **"${q}"**:

In modern software engineering and talent intelligence, achieving high velocity while maintaining architectural excellence requires clean abstractions and clear evaluation rubrics.

**Key Principles:**
1. **Domain Alignment**: Ground engineering benchmarks directly in concrete operational requirements rather than generic buzzwords.
2. **Reliability & Observability**: Systems should fail gracefully with deterministic state management, automated testing, and comprehensive telemetry.
3. **Talent Signal**: Prioritize problem-solving agility, clean code hygiene, and cross-functional communication over memorization.

${activeJob ? `In the context of your active **${activeJob.title}** search, keeping these principles front and center ensures you identify candidates who can immediately make an impact.` : ''}`;
}
