import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Storage } from '@google-cloud/storage';
import { google } from 'googleapis';
import { toRawMime } from './email.js';

async function readSecret(client, projectId, secretId) {
  const [version] = await client.accessSecretVersion({ name: `projects/${projectId}/secrets/${secretId}/versions/latest` });
  // Secret Manager values pasted through the console can include a trailing
  // newline. OAuth treats it as part of the credential and rejects an
  // otherwise valid client or refresh token, so normalize at this boundary.
  return version.payload.data.toString().trim();
}

export async function sendGmail(cfg, email) {
  const secrets = new SecretManagerServiceClient();
  const [clientId, clientSecret, refreshToken] = await Promise.all([
    readSecret(secrets, cfg.projectId, cfg.gmailClientIdSecret),
    readSecret(secrets, cfg.projectId, cfg.gmailClientSecretSecret),
    readSecret(secrets, cfg.projectId, cfg.gmailRefreshTokenSecret),
  ]);
  const oauth = new google.auth.OAuth2(clientId, clientSecret);
  oauth.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth });
  let attachments = [];
  if (email.attachments?.length) {
    if (!cfg.attachmentBucket) throw new Error('EMAIL_ATTACHMENT_BUCKET is required when an email has attachments');
    const storage = new Storage({ projectId: cfg.projectId });
    attachments = await Promise.all(email.attachments.map(async (attachment) => {
      const [data] = await storage.bucket(cfg.attachmentBucket).file(attachment.object).download();
      return { ...attachment, data };
    }));
  }
  const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: toRawMime({ ...email, attachments }) } });
  return result.data.id;
}
