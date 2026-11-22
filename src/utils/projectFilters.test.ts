import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProjectsByCategory,
  formatBriefReference,
  getCategoryCounts,
  validateEnquiryForm,
  type StudioProject,
} from './projectFilters';

const SAMPLE_PROJECTS: StudioProject[] = [
  {
    id: 'a',
    title: 'Project A',
    client: 'Client A',
    category: 'Identity',
    year: '2026',
    metric: '+120% Recall',
    summary: 'Summary A',
    challenge: 'Challenge A',
    craftNote: 'Craft A',
    deliverables: ['Identity'],
    image: '/a.jpg',
    imageAlt: 'A',
    aspect: '16/9',
  },
  {
    id: 'b',
    title: 'Project B',
    client: 'Client B',
    category: 'Motion',
    year: '2026',
    metric: '4.8x Engagement',
    summary: 'Summary B',
    challenge: 'Challenge B',
    craftNote: 'Craft B',
    deliverables: ['Motion'],
    image: '/b.jpg',
    imageAlt: 'B',
    aspect: '4/3',
  },
  {
    id: 'c',
    title: 'Project C',
    client: 'Client C',
    category: 'Digital',
    year: '2025',
    metric: '+64% Conversion',
    summary: 'Summary C',
    challenge: 'Challenge C',
    craftNote: 'Craft C',
    deliverables: ['Digital'],
    image: '/c.jpg',
    imageAlt: 'C',
    aspect: '4/3',
  },
];

test('filterProjectsByCategory returns matching subset and accurate counts', () => {
  assert.equal(filterProjectsByCategory(SAMPLE_PROJECTS, 'All').length, 3);
  assert.equal(filterProjectsByCategory(SAMPLE_PROJECTS, 'Motion').length, 1);
  assert.equal(filterProjectsByCategory(SAMPLE_PROJECTS, 'Motion')[0].id, 'b');

  const counts = getCategoryCounts(SAMPLE_PROJECTS);
  assert.deepEqual(counts, { All: 3, Identity: 1, Motion: 1, Digital: 1 });
});

test('validateEnquiryForm rejects empty and malformed inputs', () => {
  const emptyErrors = validateEnquiryForm({
    name: '',
    email: 'invalid-email',
    company: '',
    scope: 'Interactive Website',
    budget: '$50k–$100k',
    brief: 'Too short',
  });

  assert.ok(emptyErrors.name);
  assert.ok(emptyErrors.email);
  assert.ok(emptyErrors.brief);
});

test('validateEnquiryForm accepts valid submission and formats brief reference', () => {
  const errors = validateEnquiryForm({
    name: 'Elena Vance',
    email: 'elena@kuroda.jp',
    company: 'Kuroda Studio',
    scope: 'Brand Identity',
    budget: '$50k–$100k',
    brief: 'We are launching a flagship digital archive and architectural brand system in Q3.',
  });

  assert.deepEqual(errors, {});
  assert.equal(formatBriefReference('Elena Vance', 1700001234), 'CL-26-EV-1234');
});
