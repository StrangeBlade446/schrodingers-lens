export interface CanonicalSkillEntry {
  skill: string;
  category: string;
}

export const REAL_WORLD_SKILLS_CATALOG: CanonicalSkillEntry[] = [
  // Programming Languages
  { skill: 'TypeScript', category: 'Language' },
  { skill: 'JavaScript', category: 'Language' },
  { skill: 'Python', category: 'Language' },
  { skill: 'Java', category: 'Language' },
  { skill: 'Go', category: 'Language' },
  { skill: 'Rust', category: 'Language' },
  { skill: 'C++', category: 'Language' },
  { skill: 'C#', category: 'Language' },
  { skill: 'C', category: 'Language' },
  { skill: 'Kotlin', category: 'Language' },
  { skill: 'Swift', category: 'Language' },
  { skill: 'Ruby', category: 'Language' },
  { skill: 'PHP', category: 'Language' },
  { skill: 'Scala', category: 'Language' },
  { skill: 'R', category: 'Language' },
  { skill: 'Dart', category: 'Language' },
  { skill: 'Elixir', category: 'Language' },
  { skill: 'SQL', category: 'Language' },
  { skill: 'Bash', category: 'Language' },
  { skill: 'PowerShell', category: 'Language' },
  { skill: 'HTML', category: 'Frontend' },
  { skill: 'CSS', category: 'Frontend' },

  // Frontend & Web Frameworks
  { skill: 'React', category: 'Frontend' },
  { skill: 'Next.js', category: 'Frontend' },
  { skill: 'Angular', category: 'Frontend' },
  { skill: 'Vue.js', category: 'Frontend' },
  { skill: 'Nuxt.js', category: 'Frontend' },
  { skill: 'Svelte', category: 'Frontend' },
  { skill: 'SvelteKit', category: 'Frontend' },
  { skill: 'Remix', category: 'Frontend' },
  { skill: 'Astro', category: 'Frontend' },
  { skill: 'Tailwind CSS', category: 'Frontend' },
  { skill: 'Bootstrap', category: 'Frontend' },
  { skill: 'Material UI', category: 'Frontend' },
  { skill: 'Chakra UI', category: 'Frontend' },
  { skill: 'shadcn/ui', category: 'Frontend' },
  { skill: 'Redux', category: 'Frontend' },
  { skill: 'Zustand', category: 'Frontend' },
  { skill: 'React Query', category: 'Frontend' },
  { skill: 'Vite', category: 'Frontend' },
  { skill: 'Webpack', category: 'Frontend' },
  { skill: 'Three.js', category: 'Frontend' },
  { skill: 'WebGL', category: 'Frontend' },
  { skill: 'WebSockets', category: 'Frontend' },
  { skill: 'WebAssembly', category: 'Frontend' },
  { skill: 'PWA', category: 'Frontend' },
  { skill: 'Accessibility', category: 'Frontend' },
  { skill: 'Core Web Vitals', category: 'Frontend' },
  { skill: 'SSR', category: 'Frontend' },

  // Backend & APIs
  { skill: 'Node.js', category: 'Backend' },
  { skill: 'Express', category: 'Backend' },
  { skill: 'NestJS', category: 'Backend' },
  { skill: 'Fastify', category: 'Backend' },
  { skill: 'FastAPI', category: 'Backend' },
  { skill: 'Django', category: 'Backend' },
  { skill: 'Flask', category: 'Backend' },
  { skill: 'Spring Boot', category: 'Backend' },
  { skill: 'ASP.NET Core', category: 'Backend' },
  { skill: 'Ruby on Rails', category: 'Backend' },
  { skill: 'Laravel', category: 'Backend' },
  { skill: 'Gin', category: 'Backend' },
  { skill: 'Fiber', category: 'Backend' },
  { skill: 'REST APIs', category: 'Backend' },
  { skill: 'GraphQL', category: 'Backend' },
  { skill: 'gRPC', category: 'Backend' },
  { skill: 'tRPC', category: 'Backend' },
  { skill: 'Microservices', category: 'Architecture' },
  { skill: 'System Design', category: 'Architecture' },
  { skill: 'Distributed Systems', category: 'Architecture' },
  { skill: 'Event-Driven Architecture', category: 'Architecture' },
  { skill: 'API Design', category: 'Architecture' },
  { skill: 'OAuth 2.0', category: 'Security' },
  { skill: 'JWT', category: 'Security' },

  // Databases & Messaging
  { skill: 'PostgreSQL', category: 'Database' },
  { skill: 'MySQL', category: 'Database' },
  { skill: 'MongoDB', category: 'Database' },
  { skill: 'Redis', category: 'Database' },
  { skill: 'SQLite', category: 'Database' },
  { skill: 'DynamoDB', category: 'Database' },
  { skill: 'Cassandra', category: 'Database' },
  { skill: 'Elasticsearch', category: 'Database' },
  { skill: 'OpenSearch', category: 'Database' },
  { skill: 'ClickHouse', category: 'Database' },
  { skill: 'Firestore', category: 'Database' },
  { skill: 'Supabase', category: 'Database' },
  { skill: 'Prisma', category: 'Database' },
  { skill: 'Drizzle ORM', category: 'Database' },
  { skill: 'NoSQL', category: 'Database' },
  { skill: 'Kafka', category: 'Messaging' },
  { skill: 'RabbitMQ', category: 'Messaging' },
  { skill: 'Apache Pulsar', category: 'Messaging' },
  { skill: 'BullMQ', category: 'Messaging' },

  // Cloud, DevOps & Observability
  { skill: 'AWS', category: 'Cloud' },
  { skill: 'Google Cloud Platform', category: 'Cloud' },
  { skill: 'Microsoft Azure', category: 'Cloud' },
  { skill: 'Cloudflare Workers', category: 'Cloud' },
  { skill: 'Vercel', category: 'Cloud' },
  { skill: 'Docker', category: 'DevOps' },
  { skill: 'Kubernetes', category: 'DevOps' },
  { skill: 'Helm', category: 'DevOps' },
  { skill: 'Terraform', category: 'DevOps' },
  { skill: 'Ansible', category: 'DevOps' },
  { skill: 'Pulumi', category: 'DevOps' },
  { skill: 'CI/CD', category: 'DevOps' },
  { skill: 'GitHub Actions', category: 'DevOps' },
  { skill: 'GitLab CI', category: 'DevOps' },
  { skill: 'Jenkins', category: 'DevOps' },
  { skill: 'ArgoCD', category: 'DevOps' },
  { skill: 'Linux', category: 'Infrastructure' },
  { skill: 'Nginx', category: 'Infrastructure' },
  { skill: 'Git', category: 'DevOps' },
  { skill: 'Prometheus', category: 'Observability' },
  { skill: 'Grafana', category: 'Observability' },
  { skill: 'Datadog', category: 'Observability' },
  { skill: 'OpenTelemetry', category: 'Observability' },
  { skill: 'Sentry', category: 'Observability' },
  { skill: 'Serverless', category: 'Cloud' },
  { skill: 'AWS Lambda', category: 'Cloud' },
  { skill: 'Amazon S3', category: 'Cloud' },
  { skill: 'ECS', category: 'Cloud' },
  { skill: 'EKS', category: 'Cloud' },

  // AI, ML & Data Engineering
  { skill: 'Machine Learning', category: 'AI / ML' },
  { skill: 'Deep Learning', category: 'AI / ML' },
  { skill: 'Artificial Intelligence', category: 'AI / ML' },
  { skill: 'Generative AI', category: 'AI / ML' },
  { skill: 'LLMs', category: 'AI / ML' },
  { skill: 'RAG', category: 'AI / ML' },
  { skill: 'Prompt Engineering', category: 'AI / ML' },
  { skill: 'Fine-Tuning', category: 'AI / ML' },
  { skill: 'PyTorch', category: 'AI / ML' },
  { skill: 'TensorFlow', category: 'AI / ML' },
  { skill: 'Scikit-learn', category: 'AI / ML' },
  { skill: 'Hugging Face', category: 'AI / ML' },
  { skill: 'LangChain', category: 'AI / ML' },
  { skill: 'LangGraph', category: 'AI / ML' },
  { skill: 'LlamaIndex', category: 'AI / ML' },
  { skill: 'Vector DBs', category: 'AI / ML' },
  { skill: 'Pinecone', category: 'AI / ML' },
  { skill: 'Qdrant', category: 'AI / ML' },
  { skill: 'Weaviate', category: 'AI / ML' },
  { skill: 'pgvector', category: 'AI / ML' },
  { skill: 'NLP', category: 'AI / ML' },
  { skill: 'Computer Vision', category: 'AI / ML' },
  { skill: 'MLOps', category: 'AI / ML' },
  { skill: 'vLLM', category: 'AI / ML' },
  { skill: 'Pandas', category: 'Data' },
  { skill: 'NumPy', category: 'Data' },
  { skill: 'Apache Spark', category: 'Data' },
  { skill: 'dbt', category: 'Data' },
  { skill: 'Airflow', category: 'Data' },
  { skill: 'Snowflake', category: 'Data' },
  { skill: 'BigQuery', category: 'Data' },
  { skill: 'Databricks', category: 'Data' },
  { skill: 'Redshift', category: 'Data' },
  { skill: 'Data Modeling', category: 'Data' },
  { skill: 'ETL', category: 'Data' },
  { skill: 'Power BI', category: 'Analytics' },
  { skill: 'Tableau', category: 'Analytics' },
  { skill: 'Looker', category: 'Analytics' },
  { skill: 'Analytics', category: 'Analytics' },

  // Mobile
  { skill: 'React Native', category: 'Mobile' },
  { skill: 'Flutter', category: 'Mobile' },
  { skill: 'iOS', category: 'Mobile' },
  { skill: 'Android', category: 'Mobile' },
  { skill: 'SwiftUI', category: 'Mobile' },
  { skill: 'Jetpack Compose', category: 'Mobile' },
  { skill: 'Expo', category: 'Mobile' },

  // Testing & Security
  { skill: 'Playwright', category: 'QA / Testing' },
  { skill: 'Cypress', category: 'QA / Testing' },
  { skill: 'Selenium', category: 'QA / Testing' },
  { skill: 'Jest', category: 'QA / Testing' },
  { skill: 'Vitest', category: 'QA / Testing' },
  { skill: 'Pytest', category: 'QA / Testing' },
  { skill: 'JUnit', category: 'QA / Testing' },
  { skill: 'TDD', category: 'QA / Testing' },
  { skill: 'Quality Assurance', category: 'QA / Testing' },
  { skill: 'Load Testing', category: 'QA / Testing' },
  { skill: 'AppSec', category: 'Security' },
  { skill: 'OWASP', category: 'Security' },
  { skill: 'Penetration Testing', category: 'Security' },
  { skill: 'SOC 2', category: 'Security' },
  { skill: 'Zero Trust', category: 'Security' },
  { skill: 'IAM', category: 'Security' },

  // Design, Product & Business
  { skill: 'Figma', category: 'Design' },
  { skill: 'Design Systems', category: 'Design' },
  { skill: 'Prototyping', category: 'Design' },
  { skill: 'User Research', category: 'Design' },
  { skill: 'User Experience', category: 'Design' },
  { skill: 'UI Design', category: 'Design' },
  { skill: 'Wireframing', category: 'Design' },
  { skill: 'Motion Design', category: 'Design' },
  { skill: 'Information Architecture', category: 'Design' },
  { skill: 'Product Strategy', category: 'Product' },
  { skill: 'Product Management', category: 'Product' },
  { skill: 'Roadmapping', category: 'Product' },
  { skill: 'B2B SaaS', category: 'Domain' },
  { skill: 'A/B Testing', category: 'Product' },
  { skill: 'Agile', category: 'Methodology' },
  { skill: 'Scrum', category: 'Methodology' },
  { skill: 'Technical Writing', category: 'Communication' },
  { skill: 'Stakeholder Management', category: 'Leadership' },
  { skill: 'Financial Modeling', category: 'Business' },
  { skill: 'Salesforce', category: 'Business' },
  { skill: 'SEO', category: 'Marketing' },
  { skill: 'Performance Marketing', category: 'Marketing' },
];

const CANONICAL_BY_LOWER = new Map<string, CanonicalSkillEntry>(
  REAL_WORLD_SKILLS_CATALOG.map((entry) => [entry.skill.toLowerCase(), entry])
);

const ALIAS_TO_CANONICAL: Record<string, string> = {
  js: 'JavaScript',
  ecmascript: 'JavaScript',
  ts: 'TypeScript',
  reactjs: 'React',
  'react.js': 'React',
  nextjs: 'Next.js',
  'next js': 'Next.js',
  vuejs: 'Vue.js',
  'vue js': 'Vue.js',
  vue: 'Vue.js',
  nuxtjs: 'Nuxt.js',
  nodejs: 'Node.js',
  'node js': 'Node.js',
  node: 'Node.js',
  expressjs: 'Express',
  'express.js': 'Express',
  nestjs: 'NestJS',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  mui: 'Material UI',
  postgres: 'PostgreSQL',
  pg: 'PostgreSQL',
  mongo: 'MongoDB',
  k8s: 'Kubernetes',
  kube: 'Kubernetes',
  tf: 'Terraform',
  gcp: 'Google Cloud Platform',
  azure: 'Microsoft Azure',
  'amazon web services': 'AWS',
  cicd: 'CI/CD',
  'ci cd': 'CI/CD',
  'ci-cd': 'CI/CD',
  rest: 'REST APIs',
  'rest api': 'REST APIs',
  restful: 'REST APIs',
  'restful apis': 'REST APIs',
  gql: 'GraphQL',
  grpc: 'gRPC',
  csharp: 'C#',
  cpp: 'C++',
  golang: 'Go',
  py: 'Python',
  ml: 'Machine Learning',
  dl: 'Deep Learning',
  ai: 'Artificial Intelligence',
  genai: 'Generative AI',
  llm: 'LLMs',
  'large language models': 'LLMs',
  'retrieval augmented generation': 'RAG',
  'vector db': 'Vector DBs',
  'vector databases': 'Vector DBs',
  'hugging face transformers': 'Hugging Face',
  spark: 'Apache Spark',
  pyspark: 'Apache Spark',
  'apache airflow': 'Airflow',
  kafka: 'Kafka',
  'apache kafka': 'Kafka',
  'react native': 'React Native',
  rn: 'React Native',
  ux: 'User Experience',
  'ux design': 'User Experience',
  ui: 'UI Design',
  'ui/ux': 'User Experience',
  a11y: 'Accessibility',
  wcag: 'Accessibility',
  qa: 'Quality Assurance',
  pm: 'Product Management',
  'ab testing': 'A/B Testing',
  'a/b tests': 'A/B Testing',
  saas: 'B2B SaaS',
  oauth: 'OAuth 2.0',
  oauth2: 'OAuth 2.0',
  html5: 'HTML',
  css3: 'CSS',
  otel: 'OpenTelemetry',
  lambda: 'AWS Lambda',
  s3: 'Amazon S3',
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findLocalCanonicalSkill(rawInput: string): CanonicalSkillEntry | null {
  const key = normalizeToken(rawInput);
  if (!key) return null;

  const exact = CANONICAL_BY_LOWER.get(key);
  if (exact) return exact;

  const aliasCanonical = ALIAS_TO_CANONICAL[key];
  if (aliasCanonical) {
    return CANONICAL_BY_LOWER.get(aliasCanonical.toLowerCase()) ?? {
      skill: aliasCanonical,
      category: 'Verified',
    };
  }

  return null;
}

export function searchLocalSkillOptions(
  query: string,
  excludeSkills: string[],
  limit = 8
): CanonicalSkillEntry[] {
  const excluded = new Set(excludeSkills.map((s) => normalizeToken(s)));
  const q = normalizeToken(query);

  const available = REAL_WORLD_SKILLS_CATALOG.filter(
    (entry) => !excluded.has(entry.skill.toLowerCase())
  );

  if (!q) {
    return available.slice(0, limit);
  }

  const startsWithMatches: CanonicalSkillEntry[] = [];
  const includesMatches: CanonicalSkillEntry[] = [];
  const aliasMatches: CanonicalSkillEntry[] = [];

  const matchedAliasTargets = new Set<string>();
  for (const [alias, canonical] of Object.entries(ALIAS_TO_CANONICAL)) {
    if (alias.includes(q)) {
      matchedAliasTargets.add(canonical.toLowerCase());
    }
  }

  for (const entry of available) {
    const lower = entry.skill.toLowerCase();
    if (lower.startsWith(q)) {
      startsWithMatches.push(entry);
    } else if (lower.includes(q) || entry.category.toLowerCase().includes(q)) {
      includesMatches.push(entry);
    } else if (matchedAliasTargets.has(lower)) {
      aliasMatches.push(entry);
    }
  }

  return [...startsWithMatches, ...includesMatches, ...aliasMatches].slice(0, limit);
}

function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[m][n];
}

export function findFuzzyCatalogSuggestions(
  rawInput: string,
  excludeSkills: string[],
  limit = 4
): string[] {
  const q = normalizeToken(rawInput);
  if (!q) return [];
  const excluded = new Set(excludeSkills.map((s) => normalizeToken(s)));

  const scored: Array<{ skill: string; score: number }> = [];
  for (const entry of REAL_WORLD_SKILLS_CATALOG) {
    const lower = entry.skill.toLowerCase();
    if (excluded.has(lower)) continue;

    const dist = damerauLevenshtein(q, lower);
    const maxLen = Math.max(q.length, lower.length);
    const threshold = maxLen <= 4 ? 1 : maxLen <= 8 ? 2 : 3;

    if (dist <= threshold || lower.includes(q) || q.includes(lower)) {
      scored.push({ skill: entry.skill, score: dist });
    }
  }

  return scored
    .sort((a, b) => a.score - b.score || a.skill.localeCompare(b.skill))
    .slice(0, limit)
    .map((item) => item.skill);
}
