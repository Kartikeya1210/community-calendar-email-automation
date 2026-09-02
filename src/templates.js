const CENTER_ID_NOTICE = 'Please remember to carry your active SGI-USA photo ID on the mobile App or a valid photo ID to enter the center. Thank you.';
// Replace this placeholder with your organisation's approved signature.
// Personal contact details are intentionally not stored in source control.
const SIGNATURE = `
  <p style="margin-top:32px;line-height:1.45;">Regards<br>Community Activities Team</p>`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function required(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function renderEvent(event) {
  const title = escapeHtml(required(event.title, 'Event title'));
  const notice = String(event.notice || '').trim();
  if (notice) {
    return `
      <section style="margin:0 0 28px;line-height:1.45;">
        <strong>${title}</strong><br>
        <span style="color:#d93025;font-weight:bold;">${escapeHtml(notice)}</span>
      </section>`;
  }
  const dateTime = escapeHtml(required(event.dateTime, 'Event date and time'));
  const location = escapeHtml(required(event.location, 'Event location'));
  const audience = escapeHtml(required(event.audience, 'Event audience'));
  const address = String(event.address || '').trim();
  const detail = String(event.detail || '').trim();

  return `
    <section style="margin:0 0 28px;line-height:1.45;">
      <strong>${title}</strong><br>
      ${dateTime}<br>
      <u>${location}</u>${address ? `<br>${escapeHtml(address)}` : ''}${detail ? `<br>${escapeHtml(detail)}` : ''}<br>
      <a href="#audience" style="color:#0000ee;font-style:italic;text-decoration:underline;">For ${audience}</a>
    </section>`;
}

export function renderReminderBody({ greeting = 'Dear Community Members!', events, includeSignature = true }) {
  if (!Array.isArray(events) || events.length === 0) throw new Error('At least one event is required');
  const hasCenterEvent = events.some((event) => event.atCenter === true);
  const eventHtml = events.map(renderEvent).join('\n');
  const centerNotice = hasCenterEvent
    ? `<p style="margin:28px 0;color:#0000ee;font-weight:bold;text-decoration:underline;">${CENTER_ID_NOTICE}</p>`
    : '';

  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#202124;">\n<p>${escapeHtml(greeting)}</p>\n${eventHtml}\n${centerNotice}${includeSignature ? SIGNATURE : ''}\n</div>`;
}

export function centerIdNotice() {
  return CENTER_ID_NOTICE;
}
