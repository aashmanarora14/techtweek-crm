// mailer.js — AWS SES email service for TechTweek CRM
require('dotenv').config();
const { SESClient, SendEmailCommand, GetSendQuotaCommand } = require('@aws-sdk/client-ses');
const nodemailer  = require('nodemailer');
const aws         = require('@aws-sdk/client-ses');

// ── AWS SES Client ─────────────────────────────────────────────
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── Nodemailer transport using SES ─────────────────────────────
// We use nodemailer as the interface but route through AWS SES SDK
function createSESTransport() {
  return nodemailer.createTransport({
    SES: { ses: sesClient, aws },
  });
}

// ── Brand colours (match logo) ─────────────────────────────────
const BRAND = {
  teal:   '#14424F',
  orange: '#D95228',
  white:  '#FFFFFF',
  bg:     '#F6F8FA',
};

// ── Email HTML builder ─────────────────────────────────────────
function buildReminderEmail({ recipientName, leads, type }) {
  const cfg = {
    overdue:  { color:'#C0392B', bg:'#FDF0EE', label:'OVERDUE',  icon:'🔴', title:'Overdue Follow-ups — Immediate Action Required' },
    today:    { color:'#D95228', bg:'#FBF0EC', label:'TODAY',    icon:'🟡', title:'Follow-ups Due Today' },
    upcoming: { color:'#0B8A5E', bg:'#E6F7F1', label:'UPCOMING', icon:'🟢', title:'Upcoming Follow-ups This Week' },
    digest:   { color:'#14424F', bg:'#E8F4F6', label:'DIGEST',   icon:'📋', title:'Daily Follow-up Digest' },
  }[type] || { color:'#14424F', bg:'#E8F4F6', label:'DIGEST', icon:'📋', title:'Follow-up Summary' };

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  const rows = leads.map(l => {
    const fuDate = l.next_followup_date
      ? new Date(l.next_followup_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    const val = l.estimated_value_usd ? '$' + Number(l.estimated_value_usd).toLocaleString() : '—';
    return `
      <tr style="border-bottom:1px solid #E5EAF0">
        <td style="padding:13px 16px">
          <div style="font-weight:700;color:#0F1C22;font-size:14px">${l.client_name || '—'}</div>
          <div style="font-size:11px;color:#7A95A2;margin-top:2px;font-family:monospace">${l.lead_no}</div>
        </td>
        <td style="padding:13px 16px;font-size:13px;color:#3D5460">${l.service_required || '—'}</td>
        <td style="padding:13px 16px;font-size:13px;color:#3D5460">${l.company_name || '—'}</td>
        <td style="padding:13px 16px">
          <span style="background:${cfg.bg};color:${cfg.color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">${fuDate}</span>
        </td>
        <td style="padding:13px 16px">
          <span style="background:#EFF3FF;color:#1D4ED8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${l.lead_status || 'New'}</span>
        </td>
        <td style="padding:13px 16px;font-size:13px;font-weight:700;color:#0B8A5E">${val}</td>
      </tr>`;
  }).join('');

  // Gear + circuit logo SVG (inline for email clients)
  const logoSVG = `<svg width="38" height="38" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="28" fill="none" stroke="#e0edf0" stroke-width="5"/>
    <rect x="44" y="14" width="12" height="9" rx="2" fill="#e0edf0"/>
    <rect x="44" y="77" width="12" height="9" rx="2" fill="#e0edf0"/>
    <rect x="14" y="44" width="9" height="12" rx="2" fill="#e0edf0"/>
    <rect x="77" y="44" width="9" height="12" rx="2" fill="#e0edf0"/>
    <rect x="22" y="20" width="10" height="9" rx="2" fill="#e0edf0" transform="rotate(-45 27 24)"/>
    <rect x="67" y="20" width="10" height="9" rx="2" fill="#e0edf0" transform="rotate(45 72 24)"/>
    <rect x="22" y="69" width="10" height="9" rx="2" fill="#e0edf0" transform="rotate(45 27 73)"/>
    <rect x="67" y="69" width="10" height="9" rx="2" fill="#e0edf0" transform="rotate(-45 72 73)"/>
    <line x1="50" y1="73" x2="50" y2="50" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <line x1="50" y1="60" x2="37" y2="47" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="63" y2="40" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="38" y2="32" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="62" y2="32" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="37" cy="45" r="4" fill="none" stroke="white" stroke-width="3"/>
    <circle cx="38" cy="29" r="4" fill="none" stroke="white" stroke-width="3"/>
    <circle cx="62" cy="29" r="4" fill="none" stroke="white" stroke-width="3"/>
    <circle cx="63" cy="38" r="4" fill="none" stroke="white" stroke-width="3"/>
  </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${cfg.title}</title></head>
<body style="margin:0;padding:0;background:#F6F8FA;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:32px 16px">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);max-width:620px">

  <!-- ── HEADER ── -->
  <tr><td style="background:#14424F;padding:24px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#D95228;border-radius:10px;width:46px;height:46px;text-align:center;vertical-align:middle;padding:4px">
            ${logoSVG}
          </td>
          <td style="padding-left:13px;vertical-align:middle">
            <div style="color:#FFFFFF;font-size:16px;font-weight:800;letter-spacing:-.3px;line-height:1.2">TechTweek Infotech</div>
            <div style="color:rgba(255,255,255,.45);font-size:9.5px;text-transform:uppercase;letter-spacing:2px;margin-top:3px">Sales CRM · Automated Reminder</div>
          </td>
        </tr></table>
      </td>
      <td align="right" style="vertical-align:middle">
        <span style="background:${cfg.bg};color:${cfg.color};padding:5px 14px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap">${cfg.icon} ${cfg.label}</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- ── TITLE ── -->
  <tr><td style="padding:28px 32px 16px">
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#0F1C22;letter-spacing:-.5px;line-height:1.3">${cfg.title}</h1>
    <p style="margin:10px 0 0;font-size:14px;color:#7A95A2;line-height:1.6">
      Hi <strong style="color:#3D5460">${recipientName}</strong> — you have
      <strong style="color:${cfg.color}">${leads.length} lead${leads.length !== 1 ? 's' : ''}</strong>
      requiring your attention today, <span style="color:#3D5460">${dateStr}</span>.
    </p>
  </td></tr>

  <!-- ── TABLE ── -->
  <tr><td style="padding:0 32px 28px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5EAF0;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#14424F">
          <th style="padding:11px 16px;text-align:left;font-size:10px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.8px;font-weight:700">Client</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.8px;font-weight:700">Service</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.8px;font-weight:700">Company</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.8px;font-weight:700">Follow-up</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.8px;font-weight:700">Status</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.8px;font-weight:700">Value</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </td></tr>

  <!-- ── CTA ── -->
  <tr><td style="padding:0 32px 28px;text-align:center">
    <a href="${process.env.CRM_URL || 'http://localhost'}"
       style="display:inline-block;background:#D95228;color:#FFFFFF;padding:13px 30px;border-radius:9px;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 4px 12px rgba(217,82,40,.35);letter-spacing:-.2px">
      Open CRM Dashboard →
    </a>
  </td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="background:#F6F8FA;padding:18px 32px;border-top:1px solid #E5EAF0;border-radius:0 0 16px 16px">
    <p style="margin:0;font-size:11px;color:#7A95A2;text-align:center;line-height:1.7">
      Automated reminder from <strong style="color:#3D5460">TechTweek Infotech CRM</strong> · Sent via AWS SES<br>
      Daily reminders: <strong>9:00 AM IST</strong> · Weekly digest: <strong>Mondays 8:30 AM IST</strong><br>
      Only you can see your assigned leads. Contact Sahil (super admin) to adjust settings.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

// ── Send via AWS SES (using nodemailer + SES transport) ────────
async function sendEmail({ to, subject, html }) {
  const transporter = createSESTransport();
  const fromAddr    = `"${process.env.EMAIL_FROM_NAME || 'TechTweek CRM'}" <${process.env.EMAIL_FROM}>`;

  const info = await transporter.sendMail({ from: fromAddr, to, subject, html });
  console.log(`📧  SES → ${to} | MessageId: ${info.messageId}`);
  return info;
}

// ── Send reminder to one user ──────────────────────────────────
async function sendReminderToUser({ user, leads, type }) {
  if (!leads.length) return { sent: false, reason: 'No leads' };
  const subjects = {
    overdue:  `🔴 [CRM] ${leads.length} Overdue Follow-up${leads.length !== 1 ? 's' : ''} — Action Required`,
    today:    `🟡 [CRM] ${leads.length} Follow-up${leads.length !== 1 ? 's' : ''} Due Today`,
    upcoming: `🟢 [CRM] ${leads.length} Upcoming Follow-up${leads.length !== 1 ? 's' : ''} This Week`,
    digest:   `📋 [CRM] Daily Digest · ${new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short' })}`,
  };
  return sendEmail({
    to:      user.email,
    subject: subjects[type] || subjects.digest,
    html:    buildReminderEmail({ recipientName: user.name.split(' ')[0], leads, type }),
  });
}

// ── Verify SES connection (check quota = good credentials) ─────
async function verifyConnection() {
  const cmd = new GetSendQuotaCommand({});
  const quota = await sesClient.send(cmd);
  return {
    max24HourSend:   quota.Max24HourSend,
    maxSendRate:     quota.MaxSendRate,
    sentLast24Hours: quota.SentLast24Hours,
  };
}

module.exports = { sendEmail, sendReminderToUser, verifyConnection, buildReminderEmail };
