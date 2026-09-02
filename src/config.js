import 'dotenv/config';

const required = [
  'GOOGLE_CLOUD_PROJECT',
  'FIRESTORE_DATABASE_ID',
  'GOOGLE_CLOUD_REGION',
  'CLOUD_TASKS_QUEUE',
  'SERVICE_BASE_URL',
  'TASK_INVOKER_SERVICE_ACCOUNT',
  'ADMIN_API_TOKEN',
  'GMAIL_CLIENT_ID_SECRET',
  'GMAIL_CLIENT_SECRET_SECRET',
  'GMAIL_REFRESH_TOKEN_SECRET',
];

export function config() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
  return {
    port: Number(process.env.PORT || 8080),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    databaseId: process.env.FIRESTORE_DATABASE_ID,
    region: process.env.GOOGLE_CLOUD_REGION,
    queueName: process.env.CLOUD_TASKS_QUEUE,
    serviceBaseUrl: process.env.SERVICE_BASE_URL.replace(/\/$/, ''),
    taskInvokerServiceAccount: process.env.TASK_INVOKER_SERVICE_ACCOUNT,
    adminApiToken: process.env.ADMIN_API_TOKEN,
    gmailClientIdSecret: process.env.GMAIL_CLIENT_ID_SECRET,
    gmailClientSecretSecret: process.env.GMAIL_CLIENT_SECRET_SECRET,
    gmailRefreshTokenSecret: process.env.GMAIL_REFRESH_TOKEN_SECRET,
    attachmentBucket: String(process.env.EMAIL_ATTACHMENT_BUCKET || '').trim(),
  };
}
