import { FieldValue, Firestore, Timestamp } from '@google-cloud/firestore';

export function createStore(cfg) {
  const firestore = new Firestore({ projectId: cfg.projectId, databaseId: cfg.databaseId });
  const jobs = firestore.collection('sendJobs');

  return {
    async create(job) {
      const reference = jobs.doc();
      await reference.create({ ...job, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      return reference.id;
    },
    async attachTask(id, taskName) {
      await jobs.doc(id).update({ taskName, updatedAt: Timestamp.now() });
    },
    async markScheduleFailed(id, error) {
      await jobs.doc(id).update({ status: 'SCHEDULE_FAILED', lastError: String(error).slice(0, 1000), updatedAt: Timestamp.now() });
    },
    async get(id) {
      const snapshot = await jobs.doc(id).get();
      return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },
    async listSummaries(limit = 50) {
      const snapshot = await jobs.orderBy('scheduledFor', 'asc').limit(limit).get();
      return snapshot.docs.map((document) => {
        const job = document.data();
        return {
          jobId: document.id,
          status: job.status,
          scheduledFor: job.scheduledFor?.toDate?.().toISOString(),
          subject: job.subject,
          recipientCounts: job.recipientCounts,
          attempts: job.attempts || 0,
          sentAt: job.sentAt?.toDate?.().toISOString(),
          lastError: job.lastError,
        };
      });
    },
    async updateQueuedEmail(id, email, approvedBy, allowRecipientChanges = false) {
      const reference = jobs.doc(id);
      return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) throw new Error('Send job does not exist');
        const job = snapshot.data();
        if (job.status !== 'QUEUED') throw new Error(`Only queued jobs can be updated; job is ${job.status}`);
        const current = job.email;
        const sameRecipients = ['to', 'cc', 'bcc'].every((field) =>
          JSON.stringify(current[field] || []) === JSON.stringify(email[field] || []),
        );
        if (!sameRecipients && !allowRecipientChanges) throw new Error('Recipient lists cannot be changed by a queued-email update');
        const now = Timestamp.now();
        transaction.update(reference, {
          email,
          subject: email.subject,
          updatedAt: now,
          bodyUpdatedAt: now,
          bodyUpdatedBy: String(approvedBy || 'district-leader'),
          ...(sameRecipients ? {} : {
            recipientUpdatedAt: now,
            recipientUpdatedBy: String(approvedBy || 'district-leader'),
            recipientUpdateReason: 'approved-membership-change',
            recipientCounts: { to: email.to.length, cc: email.cc.length, bcc: email.bcc.length },
          }),
        });
        return { id, status: job.status, scheduledFor: job.scheduledFor?.toDate?.().toISOString(), subject: email.subject };
      });
    },
    async claim(id) {
      const reference = jobs.doc(id);
      return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) throw new Error('Send job does not exist');
        const job = snapshot.data();
        if (job.status === 'SENT') return { shouldSend: false, job };
        const now = Timestamp.now();
        const retryExpiredLease = job.status === 'SENDING' && job.leaseExpiresAt?.toMillis() <= now.toMillis();
        if (job.status !== 'QUEUED' && !retryExpiredLease) throw new Error(`Send job is not deliverable: ${job.status}`);
        transaction.update(reference, {
          status: 'SENDING',
          updatedAt: now,
          attempts: (job.attempts || 0) + 1,
          leaseExpiresAt: Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000),
        });
        return { shouldSend: true, job };
      });
    },
    async markSent(id, gmailMessageId) {
      await jobs.doc(id).update({ status: 'SENT', gmailMessageId, sentAt: Timestamp.now(), updatedAt: Timestamp.now(), leaseExpiresAt: FieldValue.delete() });
    },
    async markRetryable(id, error) {
      await jobs.doc(id).update({ status: 'QUEUED', lastError: String(error).slice(0, 1000), updatedAt: Timestamp.now(), leaseExpiresAt: FieldValue.delete() });
    },
  };
}
