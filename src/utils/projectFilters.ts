export type ProjectCategory = 'All' | 'Identity' | 'Motion' | 'Digital';

export interface StudioProject {
  id: string;
  title: string;
  client: string;
  category: Exclude<ProjectCategory, 'All'>;
  year: string;
  metric: string;
  summary: string;
  challenge: string;
  craftNote: string;
  deliverables: string[];
  image: string;
  imageAlt: string;
  aspect: '16/9' | '4/3';
  featured?: boolean;
}

export interface EnquiryFormValues {
  name: string;
  email: string;
  company: string;
  scope: string;
  budget: string;
  brief: string;
}

export interface EnquiryValidationErrors {
  name?: string;
  email?: string;
  brief?: string;
}

export function filterProjectsByCategory(
  projects: StudioProject[],
  category: ProjectCategory
): StudioProject[] {
  if (category === 'All') {
    return projects;
  }
  return projects.filter((project) => project.category === category);
}

export function getCategoryCounts(projects: StudioProject[]): Record<ProjectCategory, number> {
  const counts: Record<ProjectCategory, number> = {
    All: projects.length,
    Identity: 0,
    Motion: 0,
    Digital: 0,
  };

  for (const project of projects) {
    counts[project.category] += 1;
  }

  return counts;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEnquiryForm(values: EnquiryFormValues): EnquiryValidationErrors {
  const errors: EnquiryValidationErrors = {};

  if (!values.name.trim() || values.name.trim().length < 2) {
    errors.name = 'Please enter your full name.';
  }

  if (!values.email.trim()) {
    errors.email = 'Please enter a work email address.';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address (for example, name@studio.com).';
  }

  if (!values.brief.trim() || values.brief.trim().length < 20) {
    errors.brief = 'Share at least 20 characters describing your project goals and timeline.';
  }

  return errors;
}

export function formatBriefReference(name: string, timestampMs: number): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? 'C')
    .join('');
  const suffix = String(Math.abs(timestampMs) % 10000).padStart(4, '0');
  return `SL-26-${initials || 'PR'}-${suffix}`;
}
