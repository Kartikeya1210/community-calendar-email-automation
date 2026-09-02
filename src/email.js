const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function list(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must contain at least one email address`);
  const emails = [...new Set(value.map((email) => String(email).trim().toLowerCase()))];
  if (emails.some((email) => !EMAIL.test(email))) throw new Error(`${label} contains an invalid email address`);
  return emails;
}

function header(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized || /[\r\n]/.test(normalized)) throw new Error(`${label} is required and cannot contain line breaks`);
  return normalized;
}

export function validateEmail(payload) {
  const to = Array.isArray(payload.to) && payload.to.length ? list(payload.to, 'to') : [];
  const cc = Array.isArray(payload.cc) && payload.cc.length ? list(payload.cc, 'cc') : [];
  const bcc = Array.isArray(payload.bcc) && payload.bcc.length ? list(payload.bcc, 'bcc') : [];
  if (!to.length && !cc.length && !bcc.length) throw new Error('At least one To, CC, or BCC recipient is required');
  const allRecipients = [...to, ...cc, ...bcc];
  if (new Set(allRecipients).size !== allRecipients.length) throw new Error('Recipients cannot appear in more than one delivery field');
  const attachments = Array.isArray(payload.attachments) ? payload.attachments.map((attachment) => {
    const object = String(attachment?.object || '').trim();
    const filename = String(attachment?.filename || '').trim();
    const contentType = String(attachment?.contentType || 'application/octet-stream').trim();
    if (!object || !filename || /[\r\n]/.test(filename) || /[\r\n]/.test(contentType)) {
      throw new Error('Each attachment requires a safe object name, filename, and content type');
    }
    return { object, filename, contentType };
  }) : [];
  return {
    subject: header(payload.subject, 'subject'),
    htmlBody: String(payload.htmlBody || '').trim(),
    textBody: String(payload.textBody || '').trim(),
    to,
    cc,
    bcc,
    attachments,
  };
}

function encodeAttachment(buffer) {
  return Buffer.from(buffer).toString('base64').match(/.{1,76}/g).join('\r\n');
}

export function toRawMime({ subject, htmlBody, textBody, to = [], cc = [], bcc = [], attachments = [] }) {
  const alternativeBoundary = `alternative-${crypto.randomUUID()}`;
  const mixedBoundary = `mixed-${crypto.randomUUID()}`;
  const headers = [
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    ...(to.length ? [`To: ${to.join(', ')}`] : []),
    ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
    ...(bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
    `Content-Type: ${attachments.length ? 'multipart/mixed' : 'multipart/alternative'}; boundary="${attachments.length ? mixedBoundary : alternativeBoundary}"`,
  ];
  const alternative = [
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    textBody,
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
    `--${alternativeBoundary}--`,
  ];
  const body = attachments.length
    ? [
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      '',
      ...alternative,
      ...attachments.flatMap((attachment) => [
        `--${mixedBoundary}`,
        `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        encodeAttachment(attachment.data),
      ]),
      `--${mixedBoundary}--`,
      '',
    ]
    : [...alternative, ''];
  return Buffer.from([...headers, '', ...body].join('\r\n')).toString('base64url');
}
