# Mini CRM Backend (Node.js + Express + MongoDB)

A production-ready mini CRM backend implementing authentication, RBAC, lead & customer management, task management, activity feed, and a lightweight analytics dashboard.

## Features
- Local email+password auth (bcrypt) with JWT access (short-lived) + persistent refresh tokens.
- Roles: **admin** (manage users & all data), **agent** (manage only their own).
- Leads: list/search/filter/paginate, create, update, reassign, soft delete (archive), convert to customer.
- Customers: CRUD with ownership checks, notes (returns latest 5).
- Tasks: CRUD, filters (owner, status, due), overdue indicator via dashboard and filter.
- Activity feed: last 10 events.
- Dashboard stats: totals and simple chart series for leads created per day (last 14 days).
- Input validation (express-validator), robust error handling, indexes, and environment-based config.

## Quick Start
```bash
# 1) Copy .env.example -> .env and adjust
cp .env.example .env

# 2) Install
npm install

# 3) Seed sample data (1 admin, 2 agents, 10 leads, 5 customers, tasks)
npm run seed

# 4) Run
npm run dev
# or
npm start
```

Default users after seeding:
- admin@crm.com / Admin@123 (admin)
- agent1@crm.com / Agent@123 (agent)
- agent2@crm.com / Agent@123 (agent)

## API Overview

### Auth
- `POST /api/auth/register` (admin only, requires access token) – Create user
- `POST /api/auth/login` – Login, returns `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` – Returns new `{ accessToken }`
- `POST /api/auth/logout` – Revokes refresh token

### Leads
- `GET /api/leads?q=&status=&page=&limit=&assignedAgent=&archived=`
- `POST /api/leads`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id` (soft delete -> archived=true)
- `POST /api/leads/:id/convert` (Lead → Customer)

### Customers
- `GET /api/customers?q=&owner=&page=&limit=`
- `POST /api/customers`
- `PATCH /api/customers/:id`
- `POST /api/customers/:id/notes` (adds note, returns latest 5)

### Tasks
- `GET /api/tasks?owner=&status=&due=` (due=overdue|today|before:YYYY-MM-DD|after:YYYY-MM-DD)
- `POST /api/tasks`
- `PATCH /api/tasks/:id`

### Activity
- `GET /api/activity` – last 10 events

### Dashboard
- `GET /api/dashboard` – returns:
```json
{
  "leadStatus": { "New": 3, "In Progress": 2, ... },
  "totalCustomers": 5,
  "myOpenTasks": 4,
  "leadsPerDay": [{ "_id": "2025-09-01", "count": 2 }, ...],
  "overdueTasks": 1
}
```

## Auth Usage
- Send access token via `Authorization: Bearer <token>`.
- Refresh flow: call `/api/auth/refresh` with `{ "refreshToken": "<token>" }` to obtain a new access token.
- Logout: call `/api/auth/logout` with `{ "refreshToken": "<token>" }` to revoke.

## Notes
- Agents can only access or mutate their own leads/customers/tasks.
- Admins can access all data and can create users via `/api/auth/register`.
- Soft-deleted leads are indicated by `archived=true`.

## Production Tips
- Use HTTPS and secure cookie options if storing tokens in cookies.
- Set strong JWT secrets and shorter expiry for access tokens.
- Configure CORS to known origins only.
- Consider rate limiting and request logging to SIEM.
- Run MongoDB with auth and backups; set proper indexes (already included in models).
- Containerize and deploy with a process manager (PM2) or orchestration.

---
Happy building!
