import express from 'express';
import { config } from './config.js';
import { sendGmail } from './gmail.js';
import { createJobs } from './jobs.js';
import { createStore } from './store.js';

const cfg = config();
const store = createStore(cfg);
const jobs = createJobs(cfg, store);
const app = express();
app.use(express.json({ limit: '1mb' }));

function requireAdmin(request, response, next) {
  if (request.get('x-admin-token') !== cfg.adminApiToken) return response.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (_request, response) => response.json({ status: 'ok' }));

app.post('/jobs/preview', requireAdmin, (request, response, next) => {
  try {
    response.json(jobs.preview(request.body));
  } catch (error) { next(error); }
});

app.post('/jobs', requireAdmin, async (request, response, next) => {
  try {
    response.status(201).json(await jobs.approveAndSchedule(request.body));
  } catch (error) { next(error); }
});

app.post('/jobs/batch', requireAdmin, async (request, response, next) => {
  try {
    response.status(201).json(await jobs.approveAndScheduleBatch(request.body));
  } catch (error) { next(error); }
});

app.get('/jobs', requireAdmin, async (_request, response, next) => {
  try {
    response.json({ jobs: await store.listSummaries() });
  } catch (error) { next(error); }
});

app.patch('/jobs/batch', requireAdmin, async (request, response, next) => {
  try {
    response.json(await jobs.updateQueuedEmails(request.body));
  } catch (error) { next(error); }
});

app.post('/tasks/send', async (request, response, next) => {
  try {
    const { jobId } = request.body;
    const claim = await store.claim(jobId);
    if (!claim.shouldSend) return response.status(200).json({ status: 'already-sent' });
    try {
      const gmailMessageId = await sendGmail(cfg, claim.job.email);
      await store.markSent(jobId, gmailMessageId);
      response.status(200).json({ status: 'sent', gmailMessageId });
    } catch (error) {
      await store.markRetryable(jobId, error);
      throw error;
    }
  } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Delivery processing failed' });
});

app.listen(cfg.port, () => console.log(`Community email sender listening on ${cfg.port}`));
