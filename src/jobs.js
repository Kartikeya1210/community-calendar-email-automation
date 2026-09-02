import { CloudTasksClient } from '@google-cloud/tasks';
import { validateEmail } from './email.js';

export function createJobs(cfg, store) {
  const tasks = new CloudTasksClient();
  const parent = tasks.queuePath(cfg.projectId, cfg.region, cfg.queueName);
  return {
    preview({ email, sendAt }) {
      const validated = validateEmail(email);
      const scheduledFor = new Date(sendAt);
      if (Number.isNaN(scheduledFor.valueOf()) || scheduledFor <= new Date()) throw new Error('sendAt must be a future ISO-8601 time');
      return {
        scheduledFor: scheduledFor.toISOString(),
        subject: validated.subject,
        recipientCounts: { cc: validated.cc.length, bcc: validated.bcc.length },
      };
    },
    async approveAndSchedule({ email, sendAt, approvedBy }) {
      const preview = this.preview({ email, sendAt });
      const validated = validateEmail(email);
      const scheduledFor = new Date(preview.scheduledFor);
      const jobId = await store.create({
        status: 'QUEUED',
        approvedBy: String(approvedBy || 'district-leader'),
        scheduledFor,
        attempts: 0,
        recipientCounts: preview.recipientCounts,
        subject: validated.subject,
        email: validated,
      });
      const task = {
        httpRequest: {
          httpMethod: 'POST',
          url: `${cfg.serviceBaseUrl}/tasks/send`,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({ jobId })).toString('base64'),
          oidcToken: { serviceAccountEmail: cfg.taskInvokerServiceAccount, audience: cfg.serviceBaseUrl },
        },
        scheduleTime: { seconds: Math.floor(scheduledFor.getTime() / 1000) },
      };
      try {
        const [created] = await tasks.createTask({ parent, task });
        await store.attachTask(jobId, created.name);
        return { jobId, taskName: created.name, scheduledFor: scheduledFor.toISOString(), recipientCounts: preview.recipientCounts };
      } catch (error) {
        await store.markScheduleFailed(jobId, error);
        throw error;
      }
    },
    async approveAndScheduleBatch({ jobs: batch, approvedBy }) {
      if (!Array.isArray(batch) || batch.length === 0) throw new Error('jobs must contain at least one scheduled email');
      if (batch.length > 50) throw new Error('jobs cannot contain more than 50 scheduled emails');
      // Validate the whole campaign before creating any jobs.
      batch.forEach(({ email, sendAt }) => this.preview({ email, sendAt }));
      const results = [];
      for (const item of batch) {
        results.push(await this.approveAndSchedule({ ...item, approvedBy }));
      }
      return { count: results.length, jobs: results };
    },
    async updateQueuedEmails({ updates, approvedBy, allowRecipientChanges = false }) {
      if (!Array.isArray(updates) || updates.length === 0) throw new Error('updates must contain at least one queued-email update');
      if (updates.length > 50) throw new Error('updates cannot contain more than 50 queued-email updates');
      const validated = updates.map((update) => ({
        jobId: String(update?.jobId || '').trim(),
        email: validateEmail(update?.email || {}),
      }));
      if (validated.some((update) => !update.jobId)) throw new Error('Each update requires a jobId');
      const ids = validated.map((update) => update.jobId);
      if (new Set(ids).size !== ids.length) throw new Error('Each job can be updated only once per request');
      const results = [];
      for (const update of validated) results.push(await store.updateQueuedEmail(update.jobId, update.email, approvedBy, allowRecipientChanges === true));
      return { count: results.length, jobs: results };
    },
  };
}
