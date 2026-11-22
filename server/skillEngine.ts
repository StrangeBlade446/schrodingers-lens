import { Type, ThinkingLevel } from '@google/genai';
import { generateContentWithFallback } from './gemini.ts';
import {
  REAL_WORLD_SKILLS_CATALOG,
  findLocalCanonicalSkill,
  findFuzzyCatalogSuggestions,
} from '../src/data/realWorldSkills.ts';
import type { SkillValidationItem, SkillValidationResponse } from '../src/types/ats.ts';

const COMMON_NON_SKILLS = new Set([
  'banana', 'apple', 'fruit', 'table', 'chair', 'car', 'dog', 'cat', 'tree', 'house',
  'hello', 'hi', 'world', 'test', 'foo', 'bar', 'baz', 'asdf', 'qwerty', 'xyz', '123',
  'good', 'great', 'awesome', 'bad', 'nice', 'fast', 'slow', 'smart', 'hardworking',
  'punctual', 'motivated', 'person', 'human', 'stuff', 'thing', 'things', 'etc',
]);

export async function validateSkillsEngine(
  skills: string[],
  context?: { roleTitle?: string; department?: string }
): Promise<SkillValidationResponse> {
  const rawSkills = skills
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .slice(0, 15);

  if (rawSkills.length === 0) {
    return { results: [] };
  }

  // Attempt Gemini AI verification first if API is configured
  const roleCtx = [
    context?.roleTitle?.trim() ? `Role: ${context.roleTitle.trim()}` : '',
    context?.department?.trim() ? `Department: ${context.department.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const prompt = `You are a strict Real-World Professional Skill Verifier for an Applicant Tracking System.
Determine whether EACH candidate input term below is a genuine, recognized real-world technical, software, cloud, data, AI/ML, engineering, design, product, QA, cybersecurity, operations, finance, marketing, or business skill, tool, framework, language, protocol, or methodology.

ROLE CONTEXT: ${roleCtx || 'General Hiring Role'}

INPUT TERMS TO VERIFY:
${JSON.stringify(rawSkills)}

STRICT VERIFICATION RULES:
1. Mark isValid = true ONLY if the exact term (or minor casing difference) is a genuinely existing real-world professional or technical skill/tool/domain competency.
2. Mark isValid = false for:
   - Misspelled words (e.g. "Reacct", "Pythn", "Typescrpt", "Kubernets", "Postgressql")
   - Gibberish, random characters, keyboard mashes, or nonsense words (e.g. "asdf", "blargfoo", "xyz123")
   - Made-up or non-existent technologies/tools (e.g. "QuantumReactX", "HyperFlow99", "FakeFramework")
   - Everyday non-skill nouns, greetings, adjectives, or conversational phrases (e.g. "banana", "table", "hello", "very smart", "good")
   - Full sentences or vague descriptions that are not clean ATS skill tags.
3. For valid inputs, set canonicalName to the proper industry-standard capitalization (e.g. "PyTorch", "PostgreSQL", "Terraform", "FastAPI").
4. For invalid inputs, set canonicalName to "" (empty string), explain briefly why it was rejected in reason (1 short sentence), and provide 3 to 5 valid real-world skill options in suggestions.`;

  try {
    const rawAiResponse = await generateContentWithFallback({
      contents: prompt,
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          results: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                input: { type: Type.STRING },
                isValid: { type: Type.BOOLEAN },
                canonicalName: { type: Type.STRING },
                reason: { type: Type.STRING },
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['input', 'isValid', 'canonicalName', 'reason', 'suggestions'],
            },
          },
        },
        required: ['results'],
      },
    });

    if (rawAiResponse) {
      const parsed = JSON.parse(rawAiResponse);
      if (Array.isArray(parsed?.results) && parsed.results.length > 0) {
        const results = rawSkills.map((original, idx) => {
          const match =
            parsed.results.find(
              (r: any) =>
                typeof r?.input === 'string' &&
                r.input.trim().toLowerCase() === original.toLowerCase()
            ) ?? parsed.results[idx];

          const isValid = Boolean(match?.isValid);
          const canonicalName =
            isValid && typeof match?.canonicalName === 'string' && match.canonicalName.trim()
              ? match.canonicalName.trim()
              : isValid
                ? original
                : '';
          const reason =
            typeof match?.reason === 'string' && match.reason.trim()
              ? match.reason.trim()
              : isValid
                ? 'Verified real-world professional skill.'
                : `"${original}" is not recognized as a real-world professional or technical skill.`;
          const suggestions = Array.isArray(match?.suggestions)
            ? match.suggestions
                .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
                .map((s: string) => s.trim())
                .slice(0, 5)
            : [];

          return {
            input: original,
            isValid,
            canonicalName,
            reason,
            suggestions,
          };
        });

        return { results };
      }
    }
  } catch {
    // Fall back to local validation engine
  }

  // Built-in Real-World Skill Verification Engine
  const results: SkillValidationItem[] = rawSkills.map((input) => {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // Check if common non-skill
    if (COMMON_NON_SKILLS.has(lower) || /^[0-9]+$/.test(lower) || lower.length <= 1) {
      const suggestions = findFuzzyCatalogSuggestions(trimmed, [], 4);
      return {
        input: trimmed,
        isValid: false,
        canonicalName: '',
        reason: `"${trimmed}" is an everyday word or non-technical term, not a professional ATS skill.`,
        suggestions: suggestions.length > 0 ? suggestions : ['TypeScript', 'React', 'Node.js', 'Python'],
      };
    }

    // Check exact canonical or alias match
    const localCanonical = findLocalCanonicalSkill(trimmed);
    if (localCanonical) {
      // Find related skills in the same category
      const related = REAL_WORLD_SKILLS_CATALOG.filter(
        (c) => c.category === localCanonical.category && c.skill.toLowerCase() !== lower
      )
        .slice(0, 3)
        .map((c) => c.skill);

      return {
        input: trimmed,
        isValid: true,
        canonicalName: localCanonical.skill,
        reason: 'Verified real-world professional skill.',
        suggestions: related,
      };
    }


    // Check fuzzy typo detection
    const fuzzySuggestions = findFuzzyCatalogSuggestions(trimmed, [], 5);
    if (fuzzySuggestions.length > 0) {
      const topSuggestion = fuzzySuggestions[0];
      return {
        input: trimmed,
        isValid: false,
        canonicalName: '',
        reason: `"${trimmed}" appears to be misspelled. Did you mean "${topSuggestion}"?`,
        suggestions: fuzzySuggestions,
      };
    }

    // Completely unrecognized term
    return {
      input: trimmed,
      isValid: false,
      canonicalName: '',
      reason: `"${trimmed}" is not recognized as a real-world professional or technical skill.`,
      suggestions: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    };
  });

  return { results };
}
