// reminders.js — Scheduled email reminders for TechTweek CRM
// Can be run standalone (node reminders.js) or imported by index.js
require('dotenv').config();
const cron = require('node-cron');
const { Pool } = require('pg');
const { sendReminderToUser } = require('./mailer');
const { USERS } = require('./users');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'techtweek_crm',
  user:     process.env.DB_USER     || 'crm_user',
  password: process.env.DB_PASSWORD || '',
});

// ─── Fetch leads for a salesperson ───────────────────────────
async function getLeadsForUser(assignedName, dateFilter) {
  const { rows } = await pool.query(`
    SELECT lead_no, client_name, company_name, service_required,
           next_followup_date, lead_status, estimated_value_usd
    FROM leads
    WHERE assigned_to = $1
      AND next_followup_date IS NOT NULL
      AND lead_status NOT IN ('Won','Lost')
      AND ${dateFilter}
    ORDER BY next_followup_date ASC
  `, [assignedName]);
  return rows;
}

// Short name (first name) to match DB assigned_to
const USER_SHORT = {
  'sahil@techtweekinfotech.com':  'Sahil',
  'vinay@techtweekinfotech.com':  'Vinay',
  'devina@techtweekinfotech.com': 'Devina',
  'simran@techtweekinfotech.com': 'Simran',
};

// ─── DAILY DIGEST — 9:00 AM IST (3:30 AM UTC) ────────────────
async function sendDailyDigest() {
  console.log(`\n📧 [${new Date().toISOString()}] Running daily reminder digest...`);
  const today = new Date().toISOString().slice(0, 10);

  const results = { sent: 0, errors: 0 };

  for (const user of USERS) {
    const shortName = USER_SHORT[user.email];
    if (!shortName) continue;

    try {
      // Overdue leads (past due date, not yet actioned)
      const overdue = await getLeadsForUser(shortName,
        `next_followup_date < '${today}'::date`
      );
      // Due today
      const dueToday = await getLeadsForUser(shortName,
        `next_followup_date = '${today}'::date`
      );
      // Upcoming in next 3 days
      const upcoming = await getLeadsForUser(shortName,
        `next_followup_date BETWEEN '${today}'::date + INTERVAL '1 day' AND '${today}'::date + INTERVAL '3 days'`
      );

      let sent = false;

      // Always email overdue (urgent)
      if (overdue.length > 0) {
        await sendReminderToUser({ user, leads: overdue, type: 'overdue' });
        console.log(`  ✅ Overdue reminder → ${user.email} (${overdue.length} leads)`);
        sent = true;
      }

      // Email today's due leads
      if (dueToday.length > 0) {
        await sendReminderToUser({ user, leads: dueToday, type: 'today' });
        console.log(`  ✅ Today reminder → ${user.email} (${dueToday.length} leads)`);
        sent = true;
      }

      // Email upcoming (only if no overdue/today to avoid spam)
      if (!sent && upcoming.length > 0) {
        await sendReminderToUser({ user, leads: upcoming, type: 'upcoming' });
        console.log(`  ✅ Upcoming reminder → ${user.email} (${upcoming.length} leads)`);
      }

      results.sent++;
    } catch (err) {
      console.error(`  ❌ Failed for ${user.email}: ${err.message}`);
      results.errors++;
    }
  }

  console.log(`📊 Digest complete: ${results.sent} users emailed, ${results.errors} errors\n`);
  return results;
}

// ─── WEEKLY DIGEST — Every Monday 8:30 AM IST (3:00 AM UTC) ─
async function sendWeeklyDigest() {
  console.log(`\n📧 [${new Date().toISOString()}] Running weekly digest...`);
  const today = new Date().toISOString().slice(0, 10);

  for (const user of USERS) {
    const shortName = USER_SHORT[user.email];
    if (!shortName) continue;
    try {
      const leads = await getLeadsForUser(shortName,
        `next_followup_date BETWEEN '${today}'::date AND '${today}'::date + INTERVAL '7 days'`
      );
      if (leads.length > 0) {
        await sendReminderToUser({ user, leads, type: 'digest' });
        console.log(`  ✅ Weekly digest → ${user.email} (${leads.length} leads)`);
      }
    } catch (err) {
      console.error(`  ❌ Failed for ${user.email}: ${err.message}`);
    }
  }
}

// ─── MANUAL TRIGGER (called from API for super_admin) ─────────
async function sendManualReminder(targetEmail, reminderType = 'digest') {
  const user = USERS.find(u => u.email === targetEmail);
  if (!user) throw new Error('User not found: ' + targetEmail);

  const shortName = USER_SHORT[user.email];
  if (!shortName) throw new Error('No short name mapped for: ' + targetEmail);

  const today = new Date().toISOString().slice(0, 10);
  const filters = {
    overdue:  `next_followup_date < '${today}'::date`,
    today:    `next_followup_date = '${today}'::date`,
    upcoming: `next_followup_date BETWEEN '${today}'::date + INTERVAL '1 day' AND '${today}'::date + INTERVAL '7 days'`,
    digest:   `next_followup_date BETWEEN '${today}'::date - INTERVAL '3 days' AND '${today}'::date + INTERVAL '7 days'`,
  };

  const leads = await getLeadsForUser(shortName, filters[reminderType] || filters.digest);
  if (!leads.length) return { sent: false, reason: 'No leads matching this reminder type' };

  await sendReminderToUser({ user, leads, type: reminderType });
  return { sent: true, count: leads.length, to: user.email };
}

// ─── BROADCAST (super_admin only — send to all users) ─────────
async function broadcastReminders(reminderType = 'digest') {
  const results = [];
  for (const user of USERS) {
    try {
      const result = await sendManualReminder(user.email, reminderType);
      results.push({ email: user.email, ...result });
    } catch (err) {
      results.push({ email: user.email, sent: false, reason: err.message });
    }
  }
  return results;
}

// ─── CRON SCHEDULE ───────────────────────────────────────────
function startScheduler() {
  // Daily digest: 9:00 AM IST = 3:30 AM UTC
  cron.schedule('30 3 * * *', sendDailyDigest, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  console.log('⏰ Daily reminder scheduled: 9:00 AM IST');

  // Weekly digest: Every Monday at 8:30 AM IST
  cron.schedule('0 3 * * 1', sendWeeklyDigest, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  console.log('⏰ Weekly digest scheduled: Mondays 8:30 AM IST');
}

// ─── Standalone run (node reminders.js) ──────────────────────
if (require.main === module) {
  (async () => {
    console.log('🚀 Running manual reminder digest now...');
    await sendDailyDigest();
    await pool.end();
  })();
}

module.exports = { startScheduler, sendDailyDigest, sendManualReminder, broadcastReminders };
