import { Type, ThinkingLevel } from '@google/genai';
import { generateContentWithFallback } from './gemini.ts';
import type { JdIntelligenceResult, JdSkillSuggestion } from '../src/types/ats.ts';

interface JdIntelligenceParams {
  title?: string;
  department?: string;
  location?: string;
  jobType?: string;
  experienceRange?: string;
  minCgpa?: number;
  requiredSkills?: string[];
  preferredSkills?: string[];
  description?: string;
  userPrompt?: string;
}

export async function generateJdIntelligence(params: JdIntelligenceParams): Promise<JdIntelligenceResult> {
  const roleTitle = typeof params.title === 'string' ? params.title.trim() : '';
  const promptNote = typeof params.userPrompt === 'string' ? params.userPrompt.trim() : '';
  const department = typeof params.department === 'string' && params.department.trim() ? params.department.trim() : 'Engineering';
  const location = typeof params.location === 'string' && params.location.trim() ? params.location.trim() : 'Bengaluru, Karnataka, India';
  const jobType = typeof params.jobType === 'string' && params.jobType.trim() ? params.jobType.trim() : 'Hybrid';
  const experienceRange = typeof params.experienceRange === 'string' && params.experienceRange.trim() ? params.experienceRange.trim() : '2–5 years';
  const minCgpa = Number.isFinite(Number(params.minCgpa)) ? Number(params.minCgpa) : 7.5;
  const currentRequired = Array.isArray(params.requiredSkills) ? params.requiredSkills.filter(Boolean) : [];
  const currentPreferred = Array.isArray(params.preferredSkills) ? params.preferredSkills.filter(Boolean) : [];

  const prompt = `You are Sentinel AI, an expert Technical Talent Architect & Job Description Intelligence engine.
Analyze the hiring role context and the recruiter's request below, then recommend high-signal Required Skills, Preferred Skills, and an updated Job Description summary.

ROLE CONTEXT:
- Title: ${roleTitle || '(Infer from recruiter instruction)'}
- Department: ${department}
- Location: ${location}
- Job Type: ${jobType}
- Experience Range: ${experienceRange}
- Minimum CGPA: ${minCgpa}
- Currently Listed Required Skills: ${currentRequired.length > 0 ? currentRequired.join(', ') : 'None yet'}
- Currently Listed Preferred Skills: ${currentPreferred.length > 0 ? currentPreferred.join(', ') : 'None yet'}
- Current Description: ${typeof params.description === 'string' && params.description.trim() ? params.description.trim().slice(0, 1800) : 'None yet'}

RECRUITER REQUEST TO SENTINEL AI:
${promptNote || 'Audit this role and recommend the most essential required skills, complementary preferred skills, and a crisp role description.'}

INSTRUCTIONS:
1. Return 5 to 7 concise, industry-standard skill tags in suggestedRequiredSkills with a crisp 1-sentence reason for each.
2. Return 4 to 6 high-value differentiator skills in suggestedPreferredSkills with a crisp 1-sentence reason for each.
3. Keep skill names clean, real-world verified, and short (1–3 words each).
4. Provide suggestedDescription: a clear, structured 3–4 sentence job description covering core responsibilities, scale expectations, and qualifications.
5. Provide summaryNote: a brief 1–2 sentence explanation from Sentinel AI about why these skills elevate screening accuracy.`;

  try {
    const rawAiResponse = await generateContentWithFallback({
      contents: prompt,
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summaryNote: { type: Type.STRING },
          suggestedRequiredSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['skill', 'reason'],
            },
          },
          suggestedPreferredSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['skill', 'reason'],
            },
          },
          suggestedDescription: { type: Type.STRING },
        },
        required: [
          'summaryNote',
          'suggestedRequiredSkills',
          'suggestedPreferredSkills',
          'suggestedDescription',
        ],
      },
    });

    if (rawAiResponse) {
      const parsed = JSON.parse(rawAiResponse);
      const sanitizeList = (list: any[] | undefined): JdSkillSuggestion[] => {
        if (!Array.isArray(list)) return [];
        const seen = new Set<string>();
        const cleaned: JdSkillSuggestion[] = [];
        for (const item of list) {
          const skill = typeof item?.skill === 'string' ? item.skill.trim() : '';
          const reason = typeof item?.reason === 'string' ? item.reason.trim() : '';
          if (!skill) continue;
          const key = skill.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          cleaned.push({ skill, reason: reason || 'Recommended for role fit accuracy.' });
        }
        return cleaned;
      };

      const reqSkills = sanitizeList(parsed.suggestedRequiredSkills);
      const prefSkills = sanitizeList(parsed.suggestedPreferredSkills);

      if (reqSkills.length > 0) {
        return {
          summaryNote:
            typeof parsed.summaryNote === 'string' && parsed.summaryNote.trim()
              ? parsed.summaryNote.trim()
              : `Sentinel AI synthesized targeted competencies and specifications for ${roleTitle || 'this role'}.`,
          suggestedRequiredSkills: reqSkills,
          suggestedPreferredSkills: prefSkills,
          suggestedDescription:
            typeof parsed.suggestedDescription === 'string' && parsed.suggestedDescription.trim()
              ? parsed.suggestedDescription.trim()
              : generateFallbackDescription(roleTitle, department, reqSkills.map((s) => s.skill)),
        };
      }
    }
  } catch {
    // Fall through to local intelligence engine
  }

  // Built-in Sentinel Talent Architecture Engine
  return buildLocalJdIntelligence(roleTitle, department, location, jobType, experienceRange, minCgpa, promptNote, currentRequired);
}

function buildLocalJdIntelligence(
  title: string,
  department: string,
  location: string,
  jobType: string,
  experienceRange: string,
  minCgpa: number,
  userPrompt: string,
  existingRequired: string[]
): JdIntelligenceResult {
  const tLower = (title || userPrompt).toLowerCase();
  const pLower = userPrompt.toLowerCase();

  let req: JdSkillSuggestion[] = [];
  let pref: JdSkillSuggestion[] = [];
  let domainLabel = 'Engineering';

  if (tLower.includes('front') || tLower.includes('react') || tLower.includes('web') || tLower.includes('ui developer')) {
    domainLabel = 'Frontend Platform';
    req = [
      { skill: 'TypeScript', reason: 'Ensures strict type-safety and robust architectural contracts across complex UI codebases.' },
      { skill: 'React', reason: 'Core component-driven rendering library required for modern interactive application interfaces.' },
      { skill: 'Next.js', reason: 'Powers server-side rendering, hybrid static routing, and optimized initial page loads.' },
      { skill: 'Tailwind CSS', reason: 'Enables rapid, token-consistent utility styling with responsive layout guarantees.' },
      { skill: 'REST APIs', reason: 'Standard communication protocol for seamless backend data fetching and client synchronization.' },
      { skill: 'Accessibility', reason: 'Guarantees WCAG AA compliance, semantic HTML structure, and screen-reader support.' },
    ];
    pref = [
      { skill: 'Playwright', reason: 'Automates end-to-end browser regression testing across modern web interactions.' },
      { skill: 'GraphQL', reason: 'Allows granular data querying, reducing over-fetching for data-dense dashboards.' },
      { skill: 'System Design', reason: 'Drives clean state management, code splitting, and frontend caching architectures.' },
      { skill: 'Jest', reason: 'Validates unit component behavior and custom hook logic with fast feedback loops.' },
    ];
  } else if (tLower.includes('ai') || tLower.includes('machine learning') || tLower.includes('ml') || tLower.includes('llm')) {
    domainLabel = 'Applied AI & ML Platform';
    req = [
      { skill: 'Python', reason: 'Primary programming language for model inference, data processing, and AI application services.' },
      { skill: 'PyTorch', reason: 'Essential deep learning framework for training, fine-tuning, and evaluating neural models.' },
      { skill: 'FastAPI', reason: 'High-performance asynchronous Python framework for low-latency AI inference endpoints.' },
      { skill: 'LLMs', reason: 'Foundation model integration and prompt engineering for enterprise talent workflows.' },
      { skill: 'RAG', reason: 'Retrieval-Augmented Generation architectures grounding model output in private document corpora.' },
      { skill: 'Docker', reason: 'Standardizes reproducible containerized execution environments across GPU/CPU clusters.' },
    ];
    pref = [
      { skill: 'Vector DBs', reason: 'Specialized similarity search indexing for semantic document and embedding retrieval.' },
      { skill: 'LangGraph', reason: 'Orchestrates multi-agent cyclical graph workflows and stateful tool chaining.' },
      { skill: 'Kubernetes', reason: 'Scales containerized model inference workloads with dynamic resource allocation.' },
      { skill: 'PostgreSQL', reason: 'Relational database for storing structured metadata, chat sessions, and audit logs.' },
    ];
  } else if (tLower.includes('back') || tLower.includes('platform') || tLower.includes('api') || tLower.includes('distributed')) {
    domainLabel = 'Backend & Distributed Systems';
    req = [
      { skill: 'Node.js', reason: 'High-throughput event-driven runtime powering low-latency asynchronous API services.' },
      { skill: 'TypeScript', reason: 'Enforces type soundness and maintainable contracts across large enterprise services.' },
      { skill: 'PostgreSQL', reason: 'ACID-compliant relational database management system for transactional integrity.' },
      { skill: 'System Design', reason: 'Critical for architecting scalable, resilient microservices and distributed data layers.' },
      { skill: 'Docker', reason: 'Containerization standard ensuring uniform local development and production runtime.' },
      { skill: 'REST APIs', reason: 'Foundational API architecture for service communication and external integrations.' },
    ];
    pref = [
      { skill: 'Redis', reason: 'In-memory caching and session store reducing database read pressure and p99 latency.' },
      { skill: 'Kafka', reason: 'Event-streaming platform for decoupled asynchronous message queues and event sourcing.' },
      { skill: 'Kubernetes', reason: 'Container orchestration providing automated failover, rollouts, and autoscaling.' },
      { skill: 'AWS', reason: 'Cloud hosting environment for elastic compute, object storage, and managed databases.' },
    ];
  } else if (tLower.includes('design') || tLower.includes('ux') || tLower.includes('product designer')) {
    domainLabel = 'Product & Design Systems';
    req = [
      { skill: 'Figma', reason: 'Industry-standard collaborative tool for wireframing, UI layout, and design token management.' },
      { skill: 'Design Systems', reason: 'Establishes reusable, high-contrast UI component tokens aligned with engineering code.' },
      { skill: 'User Research', reason: 'Direct qualitative customer interviews and behavioral usability analysis to inform UX flows.' },
      { skill: 'Prototyping', reason: 'Interactive mockups validating complex multi-step workflows before engineering kickoff.' },
      { skill: 'Accessibility', reason: 'Ensures inclusive design adherence to WCAG 2.1 AA accessibility guidelines.' },
    ];
    pref = [
      { skill: 'HTML', reason: 'Enables precise technical alignment and feasibility discussions with frontend engineers.' },
      { skill: 'CSS', reason: 'Understanding responsive layout constraints, CSS Grid, and flexbox behavior.' },
      { skill: 'React', reason: 'Facilitates component mapping and code-connect design token synchronization.' },
      { skill: 'Motion Design', reason: 'Crafts smooth micro-interactions that communicate state transitions cleanly.' },
    ];
  } else if (tLower.includes('devops') || tLower.includes('sre') || tLower.includes('cloud') || tLower.includes('infrastructure')) {
    domainLabel = 'Cloud & DevOps Infrastructure';
    req = [
      { skill: 'AWS', reason: 'Primary cloud platform for VPC networking, compute fleets, and managed cloud infrastructure.' },
      { skill: 'Kubernetes', reason: 'Container orchestration engine managing production pod lifecycles and service meshes.' },
      { skill: 'Terraform', reason: 'Declarative Infrastructure-as-Code for reproducible, version-controlled cloud environments.' },
      { skill: 'Docker', reason: 'Standard image containerization for consistent application builds and runtime environments.' },
      { skill: 'CI/CD', reason: 'Automates continuous integration build checks, security scanning, and zero-downtime deploys.' },
      { skill: 'Linux', reason: 'Deep systems administration knowledge for operating system tuning and kernel debugging.' },
    ];
    pref = [
      { skill: 'Prometheus', reason: 'Time-series metric collection and alerting for application SLO and cluster health.' },
      { skill: 'Grafana', reason: 'Visual operational dashboards providing real-time visibility into infrastructure metrics.' },
      { skill: 'Go', reason: 'Systems programming language used across cloud-native tooling and custom operators.' },
      { skill: 'Python', reason: 'Scripting automation for internal tooling, maintenance tasks, and cloud API integrations.' },
    ];
  } else if (tLower.includes('data') || tLower.includes('analytics') || tLower.includes('etl')) {
    domainLabel = 'Data Platform & Analytics';
    req = [
      { skill: 'SQL', reason: 'Foundational query language for relational aggregations, window functions, and analytics.' },
      { skill: 'Python', reason: 'Core language for building ETL data extraction pipelines and analytics automation.' },
      { skill: 'dbt', reason: 'Transforms data in-warehouse with version-controlled SQL models and automated testing.' },
      { skill: 'PostgreSQL', reason: 'Source of transactional data for ingestion into central analytical pipelines.' },
      { skill: 'Data Modeling', reason: 'Designs dimensional star-schema data models optimized for analytical BI queries.' },
      { skill: 'Airflow', reason: 'Direct Acyclic Graph workflow orchestration for resilient scheduled data pipeline runs.' },
    ];
    pref = [
      { skill: 'Snowflake', reason: 'Cloud data warehouse enabling high-concurrency analytical queries with decoupled compute.' },
      { skill: 'Spark', reason: 'Distributed data processing engine handling large-scale transformations across clusters.' },
      { skill: 'Docker', reason: 'Containerizes pipeline dependencies and transformation tasks for consistent execution.' },
      { skill: 'AWS', reason: 'Managed cloud services for object data lakes (S3) and orchestration infrastructure.' },
    ];
  } else {
    // Default Full-Stack Software Engineer
    domainLabel = 'Full-Stack Software Engineering';
    req = [
      { skill: 'TypeScript', reason: 'Enforces type-safety and code predictability across frontend and backend boundaries.' },
      { skill: 'React', reason: 'Powers rich, responsive client-side UI workflows with declarative state management.' },
      { skill: 'Node.js', reason: 'Event-driven JavaScript runtime supporting scalable asynchronous service endpoints.' },
      { skill: 'PostgreSQL', reason: 'Reliable relational database providing ACID transactions and robust indexing capabilities.' },
      { skill: 'REST APIs', reason: 'Standardized architectural style for backend endpoint design and third-party integrations.' },
      { skill: 'System Design', reason: 'Crucial for architecting maintainable, fault-tolerant end-to-end web applications.' },
    ];
    pref = [
      { skill: 'Next.js', reason: 'Full-stack framework offering server actions, hybrid routing, and SEO optimization.' },
      { skill: 'Docker', reason: 'Containerization tool for predictable local development and cloud deployments.' },
      { skill: 'Tailwind CSS', reason: 'Utility-first CSS framework enabling consistent, responsive UI styling.' },
      { skill: 'Redis', reason: 'In-memory data store for caching frequent database queries and session data.' },
    ];
  }

  // Check if prompt specifically asked for Cloud / Scale
  if (pLower.includes('cloud') || pLower.includes('scale') || pLower.includes('infrastructure')) {
    if (!req.some((s) => s.skill === 'AWS') && !pref.some((s) => s.skill === 'AWS')) {
      pref.unshift({ skill: 'AWS', reason: 'Cloud compute and storage architecture for scalable multi-region workloads.' });
    }
    if (!req.some((s) => s.skill === 'Kubernetes') && !pref.some((s) => s.skill === 'Kubernetes')) {
      pref.unshift({ skill: 'Kubernetes', reason: 'Container orchestration engine managing production pod lifecycles and autoscaling.' });
    }
  }

  // Check if prompt specifically asked for Architecture / Testing
  if (pLower.includes('testing') || pLower.includes('test') || pLower.includes('qa')) {
    if (!req.some((s) => s.skill === 'Playwright') && !pref.some((s) => s.skill === 'Playwright')) {
      pref.unshift({ skill: 'Playwright', reason: 'Automated end-to-end integration and cross-browser regression testing.' });
    }
    if (!req.some((s) => s.skill === 'Jest') && !pref.some((s) => s.skill === 'Jest')) {
      pref.unshift({ skill: 'Jest', reason: 'Unit test framework ensuring high coverage and predictable edge-case behavior.' });
    }
  }

  const roleName = title.trim() || 'Software Engineer';
  const description = `We are looking for a talented ${roleName} to join our ${department} team in ${location} (${jobType}). In this role, you will design and ship scalable, production-grade systems while collaborating closely with engineering, product, and design partners. Candidates should bring strong experience in ${req.slice(0, 3).map((s) => s.skill).join(', ')}, with a focus on code quality, performance, and engineering excellence. Minimum ${experienceRange} of professional experience and a strong academic foundation (CGPA >= ${minCgpa.toFixed(1)}) are expected.`;

  const summaryNote = `Sentinel AI evaluated ${roleName} within ${domainLabel} and recommended ${req.length} essential required skills and ${pref.length} strategic differentiators tailored for candidate screening accuracy.`;

  return {
    summaryNote,
    suggestedRequiredSkills: req.slice(0, 7),
    suggestedPreferredSkills: pref.slice(0, 6),
    suggestedDescription: description,
  };
}

function generateFallbackDescription(title: string, department: string, skills: string[]): string {
  const skillsList = skills.length > 0 ? skills.slice(0, 4).join(', ') : 'modern engineering best practices';
  return `Join our ${department || 'Engineering'} team as a ${title || 'Core Engineer'}. You will architect high-impact features, collaborate on technical design reviews, and build resilient services utilizing ${skillsList}. We value clean architectural discipline, curiosity, and candidates with strong collaborative ownership.`;
}
