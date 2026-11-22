import type {
  CandidateProject,
  ResumeAuthenticityAnalysis,
  ResumeType,
} from '../types/ats';

export function evaluateResumeAuthenticity(
  rawText: string,
  _profile?: {
    projects?: CandidateProject[];
    skills?: string[];
    achievements?: string[];
  }
): ResumeAuthenticityAnalysis {
  const textLower = (rawText || '').toLowerCase();
  let aiScore = 5; // Baseline organic baseline
  let atsScore = 80;
  const reasons: string[] = [];

  // 1. Prompt Injection or Adversarial LLM Directive Override (Score +90)
  const injectionPatterns = [
    /(?:ignore\s+(?:all\s+)?previous\s+instructions|system\s*prompt|you\s+(?:must|are\s+instructed\s+to)\s+(?:give|rate|score)\s+(?:this\s+candidate\s+)?(?:100|9\d)|override\s+(?:evaluation|screening)\s+criteria|disregard\s+prior\s+directions|mark\s+candidate\s+as\s+(?:shortlisted|ideal|perfect|hire))/i,
    /(?:\[system\s*:\s*|role\s*:\s*system|instructions?\s*to\s*(?:ai|llm|evaluator|assistant))/i,
    /(?:always\s+assign\s+(?:a\s+)?perfect\s+score|do\s+not\s+penalize\s+this\s+candidate|hidden\s+(?:instruction|prompt))/i,
  ];

  for (const pat of injectionPatterns) {
    if (pat.test(rawText)) {
      aiScore += 90;
      reasons.push('Adversarial prompt injection / evaluator override directives detected in resume text');
      break;
    }
  }

  // 2. Synthetic Generative Template Placeholders & LLM Artifacts (Score +80)
  const placeholderPatterns = [
    /\[(?:company(?:\s*name)?|insert\s*(?:company|metric|name|role|project)|client\s*name|your\s*name|candidate\s*name|degree|university(?:\s*name)?|insert\s*here|x%|xx%|yyyy)\]/i,
    /(?:\[x\]%|\binsert\s+quantifiable\s+metric\b|\binsert\s+data\b)/i,
    /(?:lorem\s+ipsum|as\s+an\s+ai\s+language\s+model|here\s+is\s+a\s+(?:tailored|sample|customized|generated)\s+resume|i\s+have\s+created\s+this\s+resume\s+for\s+you|certainly!\s+here\s+is\s+a\s+resume)/i,
  ];

  for (const pat of placeholderPatterns) {
    if (pat.test(rawText)) {
      aiScore += 80;
      reasons.push('Unfilled generative template placeholder tokens (e.g. "[Company Name]", "[Insert Metric]") or LLM generation watermarks detected');
      break;
    }
  }

  // 3. Formulaic AI Slop & Buzzword Clustering (Score +30 to +65)
  const aiBuzzwordSignatures = [
    'delve into',
    'delving into',
    'testament to',
    'spearheaded cutting-edge',
    'spearheaded cutting edge',
    'orchestrated multifaceted',
    'leveraged state-of-the-art',
    'leveraged state of the art',
    'pioneered transformative',
    'fostered collaborative synergies',
    'championed innovative initiatives',
    'harnessing next-generation',
    'seamless integration of scalable paradigms',
    'results-driven professional with a proven track record of orchestrating',
    'spearheaded synergistic',
    'fostering a culture of excellence',
    'pioneered paradigm shifts',
    'leveraging cutting-edge methodologies',
    'dynamic multifaceted professional',
    'navigating complex synergistic',
    'deep-seated passion for leveraging',
  ];

  const matchedSlop: string[] = [];
  for (const phrase of aiBuzzwordSignatures) {
    if (textLower.includes(phrase)) {
      matchedSlop.push(phrase);
    }
  }

  if (matchedSlop.length >= 2) {
    aiScore += Math.min(50, 25 + matchedSlop.length * 10);
    reasons.push(
      `High concentration of formulaic LLM buzzword signatures (${matchedSlop.slice(0, 3).map((s) => `"${s}"`).join(', ')}) without domain-specific technical grounding`
    );
  }

  // 4. Rigid Uniform Action Verb Pattern (Zero Structural Burstiness)
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'));
  if (lines.length >= 4) {
    const aiStarterVerbs = /^(?:[•\-*]\s*)?(?:spearheaded|orchestrated|leveraged|pioneered|championed|fostered|conceptualized|streamlined)\b/i;
    const aiStarterCount = lines.filter((l) => aiStarterVerbs.test(l)).length;
    const aiStarterRatio = aiStarterCount / lines.length;
    if (aiStarterRatio >= 0.6) {
      aiScore += 25;
      reasons.push(
        `Rigid generative bullet syntax (${Math.round(aiStarterRatio * 100)}% of bullets open with repetitive AI action verbs)`
      );
    }
  }

  // 5. Unsubstantiated Extreme Metric Stuffing
  const wildMetrics = rawText.match(
    /(?:increased|boosted|amplified|improved)\s+[\w\s]{0,25}(?:by\s+)?(?:2[5-9]\d%|[3-9]\d{2}%|\b1000%)/gi
  ) ?? [];
  if (wildMetrics.length >= 2) {
    aiScore += 20;
    reasons.push(
      `Hyper-inflated round metric claims (${wildMetrics.slice(0, 2).join('; ')}) lacking verifiable architecture or baseline mechanisms`
    );
  }

  // 6. Keyword Stuffing / Block Dumping
  const commaSeparatedBlock = rawText.match(/(?:[a-zA-Z0-9+#.]+(?:,\s*|\s*\|\s*)){15,}/g);
  if (commaSeparatedBlock) {
    aiScore += 25;
    atsScore -= 20;
    reasons.push('Unstructured keyword dumping detected (attempted algorithm gaming)');
  }

  // 7. Human & ATS-Friendly Quality Signals (Reduces AI suspicion, increases ATS score)
  const hasStandardSections =
    /(?:experience|work\s*history)\b/i.test(rawText) &&
    /(?:education|academics)\b/i.test(rawText) &&
    /(?:skills|technologies)\b/i.test(rawText);
  if (hasStandardSections) {
    atsScore += 10;
    aiScore = Math.max(0, aiScore - 10);
  }

  const hasVerifiableTechArtifacts =
    /(?:github\.com|gitlab\.com|vercel\.app|netlify\.app|docker\s*compose|pull\s*request|unit\s*tests|explain\s*analyze|postgres|postgresql|kubernetes|grafana|prometheus)/i.test(
      rawText
    );
  if (hasVerifiableTechArtifacts) {
    atsScore += 10;
    aiScore = Math.max(0, aiScore - 15);
  }

  const hasSpecificDates = /\b(?:201[5-9]|202[0-6])\s*[-–—to]+\s*(?:present|202[0-6]|\bcurrent\b)/i.test(
    rawText
  );
  if (hasSpecificDates) {
    atsScore += 5;
    aiScore = Math.max(0, aiScore - 10);
  }

  const normalizedAiScore = Math.max(2, Math.min(99, aiScore));
  const normalizedAtsScore = Math.max(10, Math.min(100, atsScore));

  const isAiGenerated = normalizedAiScore >= 55;
  const resumeType: ResumeType = isAiGenerated ? 'AI-Generated' : 'ATS-Friendly';

  let rejectionReason: string | undefined;
  if (isAiGenerated) {
    rejectionReason = `Automated Rejection: High probability of synthetic AI generation (${normalizedAiScore}% AI Confidence). Flagged for: ${reasons.join('; ')}.`;
  }

  return {
    isAiGenerated,
    resumeType,
    aiDetectionScore: normalizedAiScore,
    atsFriendlinessScore: normalizedAtsScore,
    aiDetectionReasons: reasons,
    rejectionReason,
  };
}
