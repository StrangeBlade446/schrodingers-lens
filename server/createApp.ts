import 'dotenv/config';
import express from 'express';
import type { Candidate, JobDescription } from '../src/types/ats.ts';
import { screenBatchEngine, rescorePoolEngine, type BatchItemPayload } from './resumeEngine.ts';
import { generateComparisonEngine } from './comparisonEngine.ts';
import { generateJdIntelligence } from './jdEngine.ts';
import { validateSkillsEngine } from './skillEngine.ts';
import { handleSentinelChatEngine, type IncomingChatMessage } from './chatEngine.ts';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Basic CORS headers
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: "Schrodinger's Lens ATS",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Google Maps Platform Config
  app.get('/api/maps-config', (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({ apiKey });
  });

  // Resume Batch Screening & Scoring
  app.post('/api/screen-batch', async (req, res, next) => {
    try {
      const { jobDescription, batchItems } = req.body as {
        jobDescription?: JobDescription;
        batchItems?: BatchItemPayload[];
      };

      if (!jobDescription || typeof jobDescription.title !== 'string') {
        res.status(400).json({ error: 'Valid job description details are required.' });
        return;
      }

      if (!Array.isArray(batchItems) || batchItems.length === 0 || batchItems.length > 5) {
        res.status(400).json({ error: 'Provide 1 to 5 resumes per screening batch.' });
        return;
      }

      const result = await screenBatchEngine(jobDescription, batchItems);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Candidate Pool Rescoring
  app.post('/api/rescore-pool', async (req, res, next) => {
    try {
      const { jobDescription, candidates } = req.body as {
        jobDescription?: JobDescription;
        candidates?: Candidate[];
      };

      if (!jobDescription || !Array.isArray(candidates)) {
        res.status(400).json({ error: 'Job description and candidates array are required.' });
        return;
      }

      const result = await rescorePoolEngine(jobDescription, candidates);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Side-by-Side Finalist Comparison
  app.post('/api/compare-recommendation', async (req, res, next) => {
    try {
      const { jobDescription, candidates } = req.body as {
        jobDescription?: JobDescription;
        candidates?: Candidate[];
      };

      if (!jobDescription || !Array.isArray(candidates) || candidates.length < 2 || candidates.length > 3) {
        res.status(400).json({ error: 'Provide a job description and 2 to 3 candidates to compare.' });
        return;
      }

      const recommendation = await generateComparisonEngine(jobDescription, candidates);
      res.json(recommendation);
    } catch (err) {
      next(err);
    }
  });

  // Sentinel JD Intelligence
  app.post('/api/jd-intelligence', async (req, res, next) => {
    try {
      const result = await generateJdIntelligence(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Real-World Professional Skill Verification
  app.post('/api/validate-skills', async (req, res, next) => {
    try {
      const { skills, roleTitle, department } = req.body as {
        skills?: string[];
        roleTitle?: string;
        department?: string;
      };

      if (!Array.isArray(skills) || skills.length === 0) {
        res.status(400).json({ error: 'Provide at least one skill string to verify.' });
        return;
      }

      const validation = await validateSkillsEngine(skills, { roleTitle, department });
      res.json(validation);
    } catch (err) {
      next(err);
    }
  });

  // Sentinel AI Chat / Schrodinger's Cat
  app.post('/api/sentinel-chat', async (req, res, next) => {
    try {
      const { messages, workspaceContext } = req.body as {
        messages?: IncomingChatMessage[];
        workspaceContext?: import('../src/types/ats.ts').SentinelWorkspaceContext;
      };

      const reply = await handleSentinelChatEngine(messages, workspaceContext);
      res.json(reply);
    } catch (err) {
      next(err);
    }
  });

  // Error boundary handler for API routes
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: err?.message || 'An unexpected error occurred processing your request.',
    });
  });

  return app;
}
