require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');
const { getUser, safeUser } = require('./users');
const { sendManualReminder, broadcastReminders, startScheduler } = require('./reminders');
const { verifyConnection } = require('./mailer');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'techtweek_change_this_secret';

const pool = new Pool({
  host: process.env.DB_HOST||'localhost', port: parseInt(process.env.DB_PORT||'5432'),
  database: process.env.DB_NAME||'techtweek_crm', user: process.env.DB_USER||'crm_user',
  password: process.env.DB_PASSWORD||'', max:10, idleTimeoutMillis:30000,
});

app.use(cors({ origin: process.env.ALLOWED_ORIGIN||'*', methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders:['Content-Type','Authorization'] }));
app.use(express.json());

// ── Auth middleware ────────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h||!h.startsWith('Bearer ')) return res.status(401).json({ error:'No token' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { return res.status(401).json({ error:'Invalid or expired token' }); }
}
function superAdmin(req, res, next) {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error:'Super admin only' });
  next();
}
function canEdit(user, lead) {
  if (user.role === 'super_admin') return true;
  const mine = user.name.split(' ')[0].toLowerCase();
  return (lead.assigned_to||'').toLowerCase() === mine;
}
function ve(req,res) { const e=validationResult(req); if(!e.isEmpty()){res.status(400).json({errors:e.array()});return true;} return false; }

// ── Health ─────────────────────────────────────────────────────
app.get('/health', async (req,res) => {
  try { await pool.query('SELECT 1'); res.json({ status:'ok', db:'connected', time:new Date().toISOString() }); }
  catch { res.status(500).json({ status:'error', db:'disconnected' }); }
});

// ── LOGIN ──────────────────────────────────────────────────────
app.post('/auth/login', [body('email').isEmail(), body('password').notEmpty()], async (req,res) => {
  if(ve(req,res)) return;
  const user = getUser(req.body.email);
  if(!user) return res.status(401).json({ error:'Invalid email or password' });
  const ok = await bcrypt.compare(req.body.password, user.passwordHash);
  if(!ok) return res.status(401).json({ error:'Invalid email or password' });
  const payload = safeUser(user);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn:'12h' });
  res.json({ token, user:payload });
});

app.get('/auth/me', auth, (req,res) => res.json({ user:req.user }));

// ── FORGOT PASSWORD ────────────────────────────────────────────
// In-memory store: { email -> { code, expiresAt } }
const resetTokens = new Map();

app.post('/auth/forgot-password', [body('email').isEmail()], async (req, res) => {
  if (ve(req, res)) return;
  const { email } = req.body;
  const user = getUser(email);

  // Always respond OK to prevent email enumeration
  if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });

  // Generate a 6-digit numeric code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  resetTokens.set(email.toLowerCase(), { code, expiresAt });

  // Send email
  try {
    const { sendEmail } = require('./mailer');
    const firstName = user.name.split(' ')[0];
    await sendEmail({
      to: email,
      subject: '🔐 TechTweek CRM — Your Password Reset Code',
      html: buildPasswordResetEmail({ firstName, code }),
    });
    console.log(`🔑  Password reset code sent to ${email}`);
  } catch (err) {
    console.error('Failed to send reset email:', err.message);
    // Still respond OK so UX continues; admin can check logs
  }

  res.json({ message: 'If that email exists, a reset code has been sent.' });
});

// ── RESET PASSWORD ─────────────────────────────────────────────
app.post('/auth/reset-password',
  [body('email').isEmail(), body('code').isLength({ min:6, max:6 }), body('newPassword').isLength({ min:8 })],
  async (req, res) => {
    if (ve(req, res)) return;
    const { email, code, newPassword } = req.body;
    const record = resetTokens.get(email.toLowerCase());

    if (!record)                    return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
    if (Date.now() > record.expiresAt) { resetTokens.delete(email.toLowerCase()); return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' }); }
    if (record.code !== code)       return res.status(400).json({ error: 'Invalid reset code. Please check your email.' });

    // Update the password in the USERS array (runtime only; persists until server restart)
    const { USERS } = require('./users');
    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    resetTokens.delete(email.toLowerCase());

    console.log(`✅  Password reset completed for ${email}`);
    res.json({ message: 'Password updated successfully. Please sign in with your new password.' });
  }
);

// ── Password reset email template ─────────────────────────────
function buildPasswordResetEmail({ firstName, code }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F8FA;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:#14424F;padding:28px 36px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.5px;">TechTweek Infotech</div>
          <div style="font-size:11px;color:rgba(255,255,255,.5);letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Sales CRM</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 36px 28px;">
          <p style="font-size:15px;color:#1A2B34;font-weight:600;margin:0 0 8px;">Hi ${firstName},</p>
          <p style="font-size:14px;color:#4A6070;line-height:1.6;margin:0 0 28px;">We received a request to reset your TechTweek CRM password. Use the code below — it expires in <strong>15 minutes</strong>.</p>
          <!-- Code box -->
          <div style="background:#F6F8FA;border:2px dashed #D95228;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
            <div style="font-size:11px;color:#7A8E99;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Your Reset Code</div>
            <div style="font-size:38px;font-weight:900;letter-spacing:10px;color:#D95228;font-family:monospace;">${code}</div>
          </div>
          <p style="font-size:13px;color:#4A6070;line-height:1.6;margin:0 0 8px;">Enter this code on the reset page along with your new password.</p>
          <p style="font-size:13px;color:#9AABB5;margin:0;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F6F8FA;padding:18px 36px;border-top:1px solid #E5EAF0;text-align:center;">
          <p style="font-size:12px;color:#9AABB5;margin:0;">© ${new Date().getFullYear()} TechTweek Infotech · This is an automated message, please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── LEADS ──────────────────────────────────────────────────────
app.get('/api/leads', auth, async (req,res) => {
  try {
    const page=parseInt(req.query.page||'1'), limit=parseInt(req.query.limit||'20');
    let where=[],vals=[],i=1;
    if(req.query.status)      { where.push(`lead_status=$${i++}`);      vals.push(req.query.status); }
    if(req.query.channel)     { where.push(`sales_channel=$${i++}`);    vals.push(req.query.channel); }
    if(req.query.assigned_to) { where.push(`assigned_to=$${i++}`);      vals.push(req.query.assigned_to); }
    if(req.query.service)     { where.push(`service_required=$${i++}`); vals.push(req.query.service); }
    if(req.query.q) { where.push(`(client_name ILIKE $${i} OR company_name ILIKE $${i} OR lead_no ILIKE $${i})`); vals.push(`%${req.query.q}%`); i++; }
    const ws = where.length ? 'WHERE '+where.join(' AND ') : '';
    const cnt = await pool.query(`SELECT COUNT(*) FROM leads ${ws}`, vals);
    const dat = await pool.query(`SELECT * FROM leads ${ws} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`, [...vals, limit, (page-1)*limit]);
    res.json({ data:dat.rows, total:parseInt(cnt.rows[0].count), page, limit, pages:Math.ceil(parseInt(cnt.rows[0].count)/limit) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/leads/:id', auth, async (req,res) => {
  try {
    const {rows} = await pool.query('SELECT * FROM leads WHERE id=$1', [req.params.id]);
    if(!rows.length) return res.status(404).json({ error:'Not found' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/leads', auth, [body('client_name').notEmpty().trim()], async (req,res) => {
  if(ve(req,res)) return;
  try {
    const b=req.body;
    const ln = b.lead_no||(await pool.query('SELECT next_lead_no() AS n')).rows[0].n;
    const {rows} = await pool.query(
      `INSERT INTO leads (lead_no,month,date_generated,client_name,company_name,contact_email,contact_phone,service_required,sales_channel,lead_category,assigned_to,lead_status,estimated_value_usd,expected_close_date,last_contact_date,next_followup_date,notes,interview_call_by,comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [ln, b.month||new Date().toLocaleString('en',{month:'long'}), b.date_generated||new Date().toISOString().slice(0,10),
       b.client_name, b.company_name||null, b.contact_email||null, b.contact_phone||null,
       b.service_required||null, b.sales_channel||null, b.lead_category||'Cold Lead',
       b.assigned_to||null, b.lead_status||'New', b.estimated_value_usd||null,
       b.expected_close_date||null, b.last_contact_date||null, b.next_followup_date||null,
       b.notes||null, b.interview_call_by||null, b.comments||null]);
    res.status(201).json(rows[0]);
  } catch(e) {
    if(e.code==='23505') return res.status(409).json({ error:'Lead number exists' });
    res.status(500).json({ error:e.message });
  }
});

app.put('/api/leads/:id', auth, async (req,res) => {
  try {
    const ex = (await pool.query('SELECT * FROM leads WHERE id=$1',[req.params.id])).rows[0];
    if(!ex) return res.status(404).json({ error:'Not found' });
    if(!canEdit(req.user,ex)) return res.status(403).json({ error:'You can only edit your own leads' });
    const b=req.body;
    const fs=['month','date_generated','client_name','company_name','contact_email','contact_phone','service_required','sales_channel','lead_category','assigned_to','lead_status','estimated_value_usd','expected_close_date','last_contact_date','next_followup_date','notes','interview_call_by','comments'];
    const {rows} = await pool.query(`UPDATE leads SET ${fs.map((f,i)=>`${f}=$${i+2}`).join(',')} WHERE id=$1 RETURNING *`, [req.params.id, ...fs.map(f=>b[f]!==undefined?b[f]:null)]);
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.patch('/api/leads/:id', auth, async (req,res) => {
  try {
    const ex = (await pool.query('SELECT * FROM leads WHERE id=$1',[req.params.id])).rows[0];
    if(!ex) return res.status(404).json({ error:'Not found' });
    if(!canEdit(req.user,ex)) return res.status(403).json({ error:'You can only edit your own leads' });
    const allowed=['client_name','company_name','contact_email','contact_phone','service_required','sales_channel','lead_category','assigned_to','lead_status','estimated_value_usd','expected_close_date','last_contact_date','next_followup_date','notes','interview_call_by','comments'];
    const upd=Object.entries(req.body).filter(([k])=>allowed.includes(k));
    if(!upd.length) return res.status(400).json({ error:'No valid fields' });
    const {rows} = await pool.query(`UPDATE leads SET ${upd.map(([k],i)=>`${k}=$${i+2}`).join(',')} WHERE id=$1 RETURNING *`, [req.params.id,...upd.map(([,v])=>v)]);
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// DELETE: super_admin only
app.delete('/api/leads/:id', auth, superAdmin, async (req,res) => {
  try {
    const {rowCount} = await pool.query('DELETE FROM leads WHERE id=$1',[req.params.id]);
    if(!rowCount) return res.status(404).json({ error:'Not found' });
    res.json({ success:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── STATS ──────────────────────────────────────────────────────
app.get('/api/stats', auth, async (req,res) => {
  try {
    const [t,st,ch,sv,ct,fu,pv] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM leads'),
      pool.query('SELECT lead_status,COUNT(*) AS count FROM leads GROUP BY lead_status ORDER BY count DESC'),
      pool.query('SELECT sales_channel,COUNT(*) AS count FROM leads WHERE sales_channel IS NOT NULL GROUP BY sales_channel ORDER BY count DESC'),
      pool.query('SELECT service_required,COUNT(*) AS count FROM leads WHERE service_required IS NOT NULL GROUP BY service_required ORDER BY count DESC'),
      pool.query('SELECT lead_category,COUNT(*) AS count FROM leads WHERE lead_category IS NOT NULL GROUP BY lead_category'),
      pool.query("SELECT COUNT(*) AS count FROM leads WHERE next_followup_date IS NOT NULL AND lead_status NOT IN ('Won','Lost')"),
      pool.query("SELECT COALESCE(SUM(estimated_value_usd),0) AS total FROM leads WHERE lead_status NOT IN ('Lost')"),
    ]);
    res.json({ total:parseInt(t.rows[0].total), by_status:st.rows, by_channel:ch.rows, by_service:sv.rows, by_category:ct.rows, pending_followups:parseInt(fu.rows[0].count), pipeline_value:parseFloat(pv.rows[0].total) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── PERFORMANCE ────────────────────────────────────────────────
app.get('/api/performance', auth, async (req,res) => {
  try {
    const {rows} = await pool.query('SELECT * FROM performance ORDER BY month_label,billboard_pos');
    const g = rows.reduce((a,r)=>{ if(!a[r.month_label])a[r.month_label]=[]; a[r.month_label].push({name:r.salesperson_name,earnings:parseFloat(r.earnings_usd),received:parseFloat(r.received_usd),billboard_pos:r.billboard_pos}); return a; },{});
    res.json(g);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── SALESPERSON STATS (for Top Performers table) ──────────────
app.get('/api/salesperson-stats', auth, async (req,res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        assigned_to                                          AS name,
        COUNT(*)                                             AS total_leads,
        COUNT(*) FILTER (WHERE lead_status = 'Won')         AS wins,
        COUNT(*) FILTER (WHERE lead_status = 'Lost')        AS losses,
        COUNT(*) FILTER (WHERE lead_status NOT IN ('Won','Lost','New')) AS active,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE lead_status = 'Won') * 100.0 / COUNT(*), 1)
          ELSE 0
        END                                                  AS conversion_rate,
        COALESCE(SUM(estimated_value_usd) FILTER (WHERE lead_status = 'Won'), 0) AS revenue_won
      FROM leads
      WHERE assigned_to IS NOT NULL AND assigned_to != ''
      GROUP BY assigned_to
      ORDER BY wins DESC, total_leads DESC
    `);
    res.json(rows.map(r => ({
      name:            r.name,
      total_leads:     parseInt(r.total_leads),
      wins:            parseInt(r.wins),
      losses:          parseInt(r.losses),
      active:          parseInt(r.active),
      conversion_rate: parseFloat(r.conversion_rate),
      revenue_won:     parseFloat(r.revenue_won),
    })));
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── REMINDERS (super_admin only) ───────────────────────────────

// Check AWS SES config status + quota
app.get('/api/reminders/status', auth, superAdmin, async (req,res) => {
  try {
    const quota = await verifyConnection();
    res.json({
      configured: true,
      provider:   'AWS SES',
      region:     process.env.AWS_REGION || 'ap-south-1',
      from:       process.env.EMAIL_FROM,
      quota,
    });
  } catch(e) {
    res.json({ configured:false, provider:'AWS SES', error:e.message });
  }
});

// Preview what would be emailed to a user
app.get('/api/reminders/preview/:email', auth, superAdmin, async (req,res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const { USERS } = require('./users');
    const user = USERS.find(u=>u.email===req.params.email);
    if(!user) return res.status(404).json({ error:'User not found' });
    const shortNames = {'sahil@techtweekinfotech.com':'Sahil','vinay@techtweekinfotech.com':'Vinay','devina@techtweekinfotech.com':'Devina','simran@techtweekinfotech.com':'Simran'};
    const sn = shortNames[user.email];
    const Q = (f) => pool.query(`SELECT lead_no,client_name,company_name,service_required,next_followup_date,lead_status,estimated_value_usd FROM leads WHERE assigned_to=$1 AND ${f} AND lead_status NOT IN ('Won','Lost') ORDER BY next_followup_date`,[sn]);
    const [ov,td,up] = await Promise.all([
      Q(`next_followup_date < '${today}'::date`),
      Q(`next_followup_date = '${today}'::date`),
      Q(`next_followup_date BETWEEN '${today}'::date+INTERVAL '1 day' AND '${today}'::date+INTERVAL '7 days'`),
    ]);
    res.json({ user:{name:user.name,email:user.email,role:user.role}, overdue:{count:ov.rows.length,leads:ov.rows}, today:{count:td.rows.length,leads:td.rows}, upcoming:{count:up.rows.length,leads:up.rows} });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// Send reminder to one user
app.post('/api/reminders/send', auth, superAdmin, [body('email').isEmail(), body('type').optional().isIn(['overdue','today','upcoming','digest'])], async (req,res) => {
  if(ve(req,res)) return;
  try {
    const result = await sendManualReminder(req.body.email, req.body.type||'digest');
    res.json(result);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// Broadcast to all users
app.post('/api/reminders/broadcast', auth, superAdmin, [body('type').optional().isIn(['overdue','today','upcoming','digest'])], async (req,res) => {
  if(ve(req,res)) return;
  try {
    const results = await broadcastReminders(req.body.type||'digest');
    res.json({ results, sent:results.filter(r=>r.sent).length, total:results.length });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── 404 ────────────────────────────────────────────────────────
app.use((req,res) => res.status(404).json({ error:'Not found' }));

// ── START ──────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n✅  TechTweek CRM API v2  —  port ${PORT}`);
  console.log(`    POST /auth/login  |  GET /api/leads  |  POST /api/reminders/broadcast\n`);
  if (process.env.EMAIL_FROM && process.env.EMAIL_APP_PASSWORD) {
    startScheduler();
    console.log('📧  Email reminders: ENABLED');
  } else {
    console.warn('⚠️   Email reminders: DISABLED (set EMAIL_FROM + EMAIL_APP_PASSWORD in .env)');
  }
});

module.exports = app;
