# TechTweek Infotech CRM — Deployment Guide
## Linux VPS · PostgreSQL · Node.js (Express)

---

## 📁 Project Structure

```
techtweek-crm/
├── server/
│   ├── index.js        ← Express API (all endpoints)
│   ├── seed.js         ← Import 175 leads into DB
│   ├── schema.sql      ← PostgreSQL table definitions
│   ├── package.json
│   └── .env.example    ← Copy to .env and fill in
└── frontend/
    └── index.html      ← CRM web app (open in browser)
```

---

## STEP 1 — Server Prerequisites

SSH into your VPS and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager — keeps API running after logout)
sudo npm install -g pm2
```

---

## STEP 2 — PostgreSQL Setup

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database and user
psql << 'EOF'
CREATE DATABASE techtweek_crm;
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE techtweek_crm TO crm_user;
\c techtweek_crm
GRANT ALL ON SCHEMA public TO crm_user;
EOF

exit  # back to your normal user
```

---

## STEP 3 — Run the Schema

```bash
# Upload techtweek-crm/ folder to your VPS, then:
cd /home/ubuntu/techtweek-crm/server

# Apply schema
psql -U crm_user -d techtweek_crm -f schema.sql
# (enter password when prompted)
```

---

## STEP 4 — Configure Environment

```bash
cd /home/ubuntu/techtweek-crm/server

# Copy example config
cp .env.example .env

# Edit with your values
nano .env
```

Fill in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techtweek_crm
DB_USER=crm_user
DB_PASSWORD=YourStrongPassword123!
PORT=3001
NODE_ENV=production
ALLOWED_ORIGIN=http://YOUR_VPS_IP
API_SECRET_KEY=make_up_a_random_string_here
```

---

## STEP 5 — Install & Start the API

```bash
cd /home/ubuntu/techtweek-crm/server

# Install dependencies
npm install

# Test it works first
node index.js
# Should print: ✅ TechTweek CRM API running on port 3001
# Press Ctrl+C to stop

# Then run with PM2 (stays running forever)
pm2 start index.js --name techtweek-crm
pm2 save
pm2 startup  # follow the printed command to auto-start on reboot
```

---

## STEP 6 — Seed the Database

```bash
cd /home/ubuntu/techtweek-crm/server
node seed.js
# Should print: ✅ Seed complete: 175 inserted, 0 skipped
```

---

## STEP 7 — Open Firewall Port

```bash
# Allow API port through firewall
sudo ufw allow 3001/tcp
sudo ufw status

# Test from your machine:
curl http://YOUR_VPS_IP:3001/health
# Should return: {"status":"ok","db":"connected",...}
```

---

## STEP 8 — Configure the Frontend

Open `frontend/index.html` in a text editor and find this line near the bottom:

```javascript
const API = 'http://YOUR_VPS_IP:3001';
```

Replace `YOUR_VPS_IP` with your actual VPS IP address, e.g.:
```javascript
const API = 'http://157.90.123.45:3001';
```

Also set the API key if you configured one:
```javascript
const API_KEY = 'make_up_a_random_string_here';
```

Then open `frontend/index.html` in any browser — it connects live to your PostgreSQL database!

---

## STEP 9 (Optional) — Serve Frontend via Nginx

Instead of opening the HTML file locally, serve it from your VPS:

```bash
sudo apt install -y nginx

# Copy frontend
sudo mkdir -p /var/www/techtweek-crm
sudo cp /home/ubuntu/techtweek-crm/frontend/index.html /var/www/techtweek-crm/

# Create nginx config
sudo nano /etc/nginx/sites-available/techtweek-crm
```

Paste:
```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;  # or your domain

    root /var/www/techtweek-crm;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:3001;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/techtweek-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo ufw allow 80/tcp
```

If using Nginx proxy, change the frontend API line to:
```javascript
const API = '';  // empty = same origin via Nginx proxy
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/leads` | List leads (filter: status, channel, assigned_to, service, q, page, limit) |
| GET | `/api/leads/:id` | Get single lead |
| POST | `/api/leads` | Create new lead |
| PUT | `/api/leads/:id` | Full update |
| PATCH | `/api/leads/:id` | Partial update (e.g. status only) |
| DELETE | `/api/leads/:id` | Delete lead |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/performance` | Monthly performance data |
| PATCH | `/api/performance` | Update performance record |
| GET | `/api/salespersons` | List active salespersons |

---

## PM2 Useful Commands

```bash
pm2 list                    # see all running processes
pm2 logs techtweek-crm      # view live logs
pm2 restart techtweek-crm   # restart API
pm2 stop techtweek-crm      # stop API
pm2 monit                   # live monitor
```

---

## Troubleshooting

**API not reachable?**
- Check `pm2 logs techtweek-crm` for errors
- Confirm port 3001 is open: `sudo ufw status`
- Test locally on VPS: `curl localhost:3001/health`

**Database connection error?**
- Verify `.env` credentials match what you set in PostgreSQL
- Check PostgreSQL is running: `sudo systemctl status postgresql`

**CORS error in browser?**
- Set `ALLOWED_ORIGIN` in `.env` to your exact frontend URL
- Restart: `pm2 restart techtweek-crm`

---

## AWS SES Setup (Email Reminders)

### Step 1 — Verify your sender email/domain in SES

```bash
# Go to AWS Console → SES → Verified Identities
# Click "Create identity" → choose Email address OR Domain
# For email: AWS sends a verification link — click it
# For domain: Add the DNS TXT records AWS gives you
```

### Step 2 — Create IAM user for SES

```bash
# AWS Console → IAM → Users → Create User
# Attach policy: AmazonSESFullAccess (or custom with ses:SendEmail)
# Create Access Key → download CSV
```

### Step 3 — Exit SES Sandbox (for production)

By default AWS SES is in **sandbox mode** — you can only send to verified emails.

```bash
# AWS Console → SES → Account Dashboard
# Click "Request production access"
# Fill the form (use case: transactional emails, CRM reminders)
# AWS approves within 24–48 hours
# After approval: you can send to any email without pre-verifying recipients
```

### Step 4 — Add to .env

```bash
nano /home/ubuntu/techtweek-crm/server/.env
```

```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EMAIL_FROM=crm@techtweekinfotech.com
EMAIL_FROM_NAME=TechTweek CRM
```

### Step 5 — Restart and verify

```bash
pm2 restart techtweek-crm
# Should print: Email reminders: ENABLED

# Test from super admin panel: open CRM → Email Reminders → click "Send" for any user
# Check status shows: AWS SES Connected — ap-south-1
```

### Recommended SES Region for India

Use `ap-south-1` (Mumbai) for lowest latency to Indian recipients.
Other options: `us-east-1` (Virginia), `eu-west-1` (Ireland).

### SES Sending Limits

| Stage | Daily Limit | Rate |
|-------|------------|------|
| Sandbox | 200 emails/day | 1/sec |
| Production | 50,000+/day | 14/sec (scales up) |

