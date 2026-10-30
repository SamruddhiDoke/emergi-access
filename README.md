# Emergi-Access

**Critical information when needed. Privacy when it matters.**

Emergi-Access is a privacy-preserving emergency medical information access platform, built as a full-stack prototype for the Government of Maharashtra Hackathon. Each patient gets a QR-based Emergency ID. Verified healthcare professionals use it to request short, audited, role-scoped access when a patient cannot communicate.

**Live demo: https://emergi-access.vercel.app** · demo password `Demo@12345` · see [DEPLOYMENT.md](DEPLOYMENT.md) for hosting details and verification results.

> **Prototype notice.** All data is synthetic. One-time codes are **simulated**: in demo mode the code is shown on screen and no SMS or email gateway is connected. Professional verification is a manual administrator action and is **not** connected to any government or medical-council registry. The system has **not** been assessed for clinical safety or regulatory compliance. Emergi-Access is an information access tool, not a diagnostic or treatment system.

---

## Contents

1. [Quick start (Docker)](#quick-start-docker)
2. [Local development](#local-development-without-docker)
3. [Demo accounts](#demo-accounts)
4. [Judge walkthrough — the unconscious-patient scenario](#judge-walkthrough)
5. [Additional security demonstrations](#additional-security-demonstrations)
6. [Architecture](#architecture)
7. [Minimum-necessary access matrix](#minimum-necessary-access-matrix)
8. [Security model](#security-model)
9. [API reference](#api-reference)
10. [Database](#database)
11. [Testing](#testing)
12. [Project structure](#project-structure)

---

## Quick start (Docker)

Requires Docker Desktop.

```bash
docker compose up -d --build
```

| Service | URL |
|---|---|
| Web application | http://localhost:8088 |
| API docs (Swagger UI) | http://localhost:8088/api/docs |
| Health check | http://localhost:8088/api/health |

On first start the backend waits for PostgreSQL to be healthy, applies migrations (`prisma migrate deploy`), and seeds the demo data if the database is empty. To reset to a clean demo state:

```bash
docker compose exec backend node prisma/seed.js        # re-seed (wipes and recreates demo data)
docker compose down -v && docker compose up -d --build # or: start completely fresh
```

Default ports can be changed through a root `.env` file (see `.env.example`). PostgreSQL is published on **5433** and Redis on **6380**, so they don't clash with local installations.

## Local development (without Docker)

Requires Node.js 20+ and PostgreSQL 14+. Redis is optional; without it, rate limiting runs in memory.

```bash
# 0. Database: the compose file is the easiest way to get one
docker compose up -d db redis

# 1. Backend
cd backend
cp .env.example .env               # then set JWT_SECRET / OTP_SECRET
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                        # http://localhost:4000  (docs at /api/docs)

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                        # http://localhost:5173  (proxies /api to :4000)
```

To use an existing PostgreSQL server instead, point `DATABASE_URL` in `backend/.env` at it.

## Demo accounts

Every demo account uses the password **`Demo@12345`**. Both login pages also have a **Demo accounts** panel that fills in the credentials with one click.

| Role | Name | Email | Notes |
|---|---|---|---|
| Patient | Ananya Rao | `ananya.rao@demo.emergi.in` | Type 1 diabetes, penicillin anaphylaxis, asthma · `EA-7KQ2-M9XD-4TPR-H3VB` |
| Patient | Rohan Deshmukh | `rohan.deshmukh@demo.emergi.in` | Cardiac, on apixaban, CKD · `EA-3NWB-8RFZ-K2MA-T6QD` |
| Patient | Fatima Shaikh | `fatima.shaikh@demo.emergi.in` | Epilepsy, sulfonamide allergy · `EA-9PXC-5HJG-2VNE-R8KY` |
| Patient | Arjun Kulkarni | `arjun.kulkarni@demo.emergi.in` | Haemophilia A, bee-venom anaphylaxis · `EA-4MDT-7WQA-6BZH-N1PS` |
| Patient | Priya Nair | `priya.nair@demo.emergi.in` | Heart failure, COPD (CO₂ retainer) · `EA-6HRV-2KXM-9QTB-C5FW` |
| Paramedic | Sameer Patil | `sameer.patil@demo.emergi.in` | Verified · MH-PARA-10231 · Pune Ambulance Network |
| Paramedic | Kavita Jadhav | `kavita.jadhav@demo.emergi.in` | Verified · has seeded suspicious-activity history |
| Doctor | Dr. Neha Joshi | `neha.joshi@demo.emergi.in` | Verified · MH-DOC-20431 |
| Doctor | Dr. Rahul Mehta | `rahul.mehta@demo.emergi.in` | Verified · MH-DOC-20788 |
| Doctor | Dr. Aditi Kale | `aditi.kale@demo.emergi.in` | **Not verified**, for the denial demo · MH-DOC-21002 |
| Specialist | Dr. Vikram Sathe | `vikram.sathe@demo.emergi.in` | Verified · Cardiology |
| Specialist | Dr. Leena Gokhale | `leena.gokhale@demo.emergi.in` | Verified · Neurology |
| Administrator | Asha Kulkarni | `admin@demo.emergi.in` | Command centre, audit, revocation |

Professionals and administrators complete a simulated sign-in code after their password. The code appears in a clearly labelled "Simulated delivery" box with an **Autofill** button.

Seeded patients have fixed Emergency IDs so this table stays accurate. Patients who register through the app get random 80-bit IDs. The seed also creates 14 days of finished activity (46 authorizations plus their audit events) so the dashboards and analytics show real data. No authorization is left active, so each demo starts clean.

## Judge walkthrough

The unconscious-patient scenario. Every step is enforced by the backend.

| # | Action | What to look for |
|---|---|---|
| 1–3 | Sign in at `/login` as **Ananya Rao** | Dashboard with Emergency ID, QR card, blood group, critical allergy alerts, completeness and history |
| 4 | Click **Download QR** | The PNG holds only the Emergency ID. The QR page shows the exact payload and a ✓/✗ list of what it does not contain |
| 5 | Sign out (menu at the bottom-left) | The session is revoked on the server |
| 6 | Sign in at `/pro/login` as **Sameer Patil** → **Autofill** the code | Clinical dashboard with a prominent **Scan Emergency QR** action |
| 7–8 | **Scan Emergency QR** → point the camera at the QR, or use **Scan from image** and pick the downloaded PNG, or type the ID under **Manual entry** | Camera permission handling, scan animation and success state |
| 9 | Identification | Shows only "Ananya R.", age and sex, with a note that no medical data has been disclosed |
| 10–11 | Choose **Patient unconscious**, then write a justification | At least 15 characters is required, by both the client and the server |
| 12 | Tick the acknowledgement → **Break glass & request access** | Monitoring warning; the server creates a PENDING authorization |
| 13 | **Autofill** the one-time code | Five wrong codes deny the request permanently |
| 14–17 | Access granted | Paramedic view: blood group, critical alerts, severe allergies, major conditions, medication alerts, emergency contacts. A **Withheld for your role** card lists what was not sent. Live countdown ring synced to server time |
| 18 | — | Requested, granted and viewed events are written to the audit log |
| 19–21 | In a **different browser or a private window**, sign in as **admin@demo.emergi.in** → **Audit logs** → click **Emergency access granted** | Full event detail: categories accessed (never values) and the authorization timeline |
| 22 | **Revoke authorization** and give a reason | Or use **Active authorizations** → Revoke |
| 23–25 | Return to the paramedic window | Within about 5 seconds the status poll replaces the record with **Authorization revoked**. Clicking **Refresh record** before that gives the same result: the server returns `403 AUTHORIZATION_REVOKED` |

Sign back in as Ananya to see the access, the revocation and the timeline under **Access history**.

> Admin and paramedic sessions share a cookie jar within one browser profile. Use separate browsers or a private window for each role you want signed in at the same time.

## Additional security demonstrations

| Demonstration | How |
|---|---|
| Paramedic vs doctor disclosure | Repeat the flow as **Dr. Neha Joshi** for Ananya. The doctor sees all current medications and medical history but **no emergency contacts**. The paramedic sees contacts but not the full medication list or history. Neither sees mild allergies (Latex) or minor conditions (Hypothyroidism) |
| Specialist scope | **Dr. Vikram Sathe** (Cardiology) → Rohan `EA-3NWB-8RFZ-K2MA-T6QD`: only cardiology conditions, medications and history are shown. The kidney disease and ramipril are withheld |
| Expired authorization | Admin → **System settings** → set the duration to 1 minute (custom 60 s), then grant access and wait. The server marks it EXPIRED and every request returns `410 AUTHORIZATION_EXPIRED` |
| Patient revocation | While a professional holds access, Ananya's dashboard shows "Your record is being accessed" → **Revoke access** |
| Invalid Emergency ID | Manual entry `EA-0000-0000-0000-0000` → "Emergency ID not recognised" (audited) |
| QR carries no medical data | Patient → **Emergency QR card** shows the payload. You can also decode the downloaded PNG with any QR reader |
| Unverified professional | Sign in as **Dr. Aditi Kale** and attempt access → **Emergency access denied** (`403 PROFESSIONAL_NOT_VERIFIED`, audited). Admin → **Verification queue** → Verify, then retry and it works |
| Patient ownership / IDOR | There are no patient-ID parameters: patient endpoints derive identity from the session. A professional requesting another professional's authorization ID gets `404` (logged as `NOT_AUTHORIZATION_OWNER`) |
| Suspicious activity | Admin → **Suspicious activity** flags Kavita Jadhav (seeded Emergency-ID enumeration and repeated denials) |
| Immutable audit | `UPDATE`/`DELETE` on `AuditLog` is rejected by a PostgreSQL trigger, and there is no edit or delete API |

## Architecture

```
React 18 + Vite + Tailwind v4 + Framer Motion        (frontend/)
        │  same-origin /api  (Vite proxy in dev, nginx in Docker)
        ▼
Node.js + Express 5 REST API                         (backend/src)
  routes → middleware (auth · RBAC · CSRF · rate limit · Zod) → controllers → services
        │  Prisma ORM                     │ optional
        ▼                                 ▼
PostgreSQL 16                           Redis 7 (rate-limit store)
```

| Layer | Location | Responsibility |
|---|---|---|
| Presentation | `frontend/src` | Design system (`components/ui`), role portals (`features/*`), routing guards (UX only) |
| API | `backend/src/routes`, `controllers` | REST endpoints, HTTP concerns |
| Business logic | `backend/src/services` | Break-glass state machine, disclosure policy, expiry, revocation, analytics |
| Authentication | `middleware/auth.js`, `services/authService.js` | JWT + server-side sessions, MFA, bcrypt |
| Authorization | `middleware/auth.js`, `services/disclosurePolicy.js` | RBAC, verification gate, ownership, minimum-necessary filtering |
| Data access | Prisma (`prisma/schema.prisma`) | Typed queries, migrations |
| Audit | `backend/src/audit` | Append-only event writer |

The break-glass flow is **identify → request (reason, justification, acknowledgement) → OTP → ACTIVE (expiry set from DB time) → EXPIRED / REVOKED**. A request that fails verification ends as **DENIED**.

## Minimum-necessary access matrix

Enforced in `backend/src/services/disclosurePolicy.js`. The API serialises only the object this function returns; the full record never leaves the server for clinical roles.

| Category | Paramedic | Doctor | Specialist | Patient | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Blood group, critical alerts | ✓ | ✓ | ✓ | ✓ | — |
| Severe / life-threatening allergies | ✓ | ✓ | ✓ | ✓ | — |
| Major & critical conditions | ✓ | ✓ | own specialty | ✓ | — |
| Medication alerts (critical meds) | ✓ | ✓ (within full list) | own specialty | ✓ | — |
| Full current medications | — | ✓ | own specialty | ✓ | — |
| Medical history | — | ✓ | own specialty | ✓ | — |
| Emergency contacts | ✓ | — | — | ✓ | — |
| Mild allergies, minor conditions | — | — | — | ✓ | — |
| Account metadata & audit trail | — | — | — | own history | ✓ |

A specialist's scope comes from their administrator-verified specialty, never from the request.

## Security model

| Control | Implementation |
|---|---|
| Passwords | bcrypt (12 rounds); constant-time handling for unknown emails |
| Sessions | HS256 JWT in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` behind HTTPS), **plus** a server-side `Session` row checked on every request. Logout, password change and suspension revoke sessions immediately |
| CSRF | Double-submit token (`ea_csrf` cookie ↔ `X-CSRF-Token` header) on every state-changing request; rotated at login |
| MFA | Simulated OTP for professional/admin sign-in and for every break-glass request. Codes are stored as HMAC-SHA256 hashes, expire after 5 minutes, allow at most 5 attempts and are single-use |
| RBAC | Role and verification status are re-read from the database on every request; token claims are never trusted |
| IDOR | No client-supplied patient IDs. Other users' authorizations return 404 |
| Expiry | Compared against PostgreSQL `now()` on every protected read. A 15 s sweeper keeps stored statuses accurate but is not relied on for enforcement |
| Revocation | Conditional status update; the next request under that authorization is refused whatever the client holds |
| Emergency IDs | 80 bits from `crypto.randomBytes`, Crockford base32 (`EA-XXXX-XXXX-XXXX-XXXX`) |
| Audit | Append-only table with a database trigger blocking `UPDATE`/`DELETE`. Records categories, not values; never logs passwords, tokens or OTPs |
| Input | Zod schemas with unknown keys stripped; 100 kB body limit |
| Transport/headers | Helmet (CSP, frame denial, etc.), strict CORS allow-list, nginx security headers |
| Rate limiting | Global, sign-in, OTP and identification limiters (Redis-backed when available) |
| CSV export | Formula-injection neutralised |

**Prototype vs production.** A real deployment would also need encryption at rest and field-level encryption for clinical data, managed secrets and key rotation, HTTPS everywhere with `COOKIE_SECURE=true`, a real OTP delivery channel with `DEMO_MODE=false`, integration with an authoritative professional registry, backups and retention policies, penetration testing, and formal compliance review (for example, the DPDP Act 2023 and ABDM guidelines).

## API reference

Interactive OpenAPI docs are served at **`/api/docs`** (raw spec at `/api/docs.json`).

| Area | Endpoints |
|---|---|
| Auth | `GET /api/auth/csrf` · `POST /api/auth/register` · `POST /api/auth/register/professional` · `POST /api/auth/login` · `POST /api/auth/verify-otp` · `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/change-password` |
| Patient | `GET/PUT /api/patients/me` · `GET /me/dashboard` · `GET /me/emergency-id` · `POST /me/emergency-id/regenerate` · `GET /me/qr` · `GET /me/qr.png` · `GET /me/summary.pdf` · `GET /me/access-history` · `GET /me/authorizations` · `POST /me/revoke-access` |
| Emergency | `GET /api/emergency/dashboard` · `GET /history` · `POST /identify` · `POST /request-access` · `POST /verify-otp` · `GET /authorization/:id` · `GET /medical-information/:id` · `GET /medical-information/:id/summary.pdf` · `POST /revoke/:id` |
| Admin | `GET /api/admin/dashboard` · `GET /patients` · `GET /professionals` · `POST /verify-professional` · `POST /account-status` · `GET /authorizations` · `POST /revoke-access` · `GET /audit-logs` · `GET /audit-logs/export.csv` · `GET /audit-logs/:id` · `GET /suspicious-activity` · `GET /analytics` · `GET/PUT /settings` |

Errors use a consistent shape, `{ "error": { "code", "message", "details" } }`. Key codes:

| Status | Code |
|---|---|
| 403 | `PROFESSIONAL_NOT_VERIFIED` |
| 404 | `INVALID_EMERGENCY_ID` |
| 403 | `VERIFICATION_REQUIRED` |
| 403 | `AUTHORIZATION_REVOKED` |
| 410 | `AUTHORIZATION_EXPIRED` |
| 409 | `ACTIVE_AUTHORIZATION_EXISTS` |
| 403 | `CSRF_INVALID` |
| 429 | `RATE_LIMITED` |

## Database

PostgreSQL via Prisma: `backend/prisma/schema.prisma`. Migrations are in `backend/prisma/migrations`, and the initial migration includes the audit-log immutability trigger.

`User` · `Session` · `PatientProfile` · `MedicalProfile` · `Allergy` · `ChronicCondition` · `Medication` · `MedicalAlert` · `MedicalHistoryEntry` · `EmergencyContact` · `HealthcareProfessional` · `EmergencyAuthorization` · `OtpVerification` · `AuditLog` · `SystemSetting`

Foreign keys cascade from users to their own data. Authorizations use `Restrict` so access history cannot be lost by deleting a profile. The schema has indexes on authorization status and expiry, and on audit time, action, actor and patient. The seed (`npm run db:seed`) is repeatable: it truncates and recreates deterministic synthetic data.

## Testing

```bash
# Backend: 45 API tests against a real PostgreSQL test database (emergi_access_test)
docker compose exec db psql -U emergi -d emergi_access -c "CREATE DATABASE emergi_access_test;"   # once
cd backend
DATABASE_URL=postgresql://emergi:emergi_dev_password@localhost:5433/emergi_access_test npx prisma migrate deploy  # once
npm test

# Frontend: component and logic tests (Vitest + Testing Library)
cd frontend && npm test

# Browser walkthrough of the judge scenario (Playwright, optional)
cd e2e && npm install && npm run setup
(cd ../backend && npm run db:seed)        # needs a clean seed
BASE=http://localhost:8088 npm run demo   # or omit BASE for the Vite dev server
BASE=http://localhost:8088 node navigation.mjs   # public navigation, refresh, 404 and error states (Chromium + Edge if installed)
```

Backend coverage: registration, login, MFA and OTP replay, hashed secrets, session revocation and token replay, forged tokens, CSRF, RBAC across all portals, patient ownership and injected identifiers, QR payload privacy, identification privacy, invalid IDs, unverified professionals, request validation, OTP lockout, paramedic/doctor/specialist disclosure, audit categories without values, IDOR, DB-clock expiry, admin/patient/professional revocation, configurable duration, audit immutability, metrics accuracy, verification, suspension, audit filters/CSV, suspicious-activity detection and analytics.

## Project structure

```
├── backend/
│   ├── prisma/            schema.prisma · migrations/ · seed.js
│   ├── src/
│   │   ├── audit/         append-only audit writer + action names
│   │   ├── config/        env, Prisma, Redis
│   │   ├── controllers/   HTTP handlers
│   │   ├── docs/          OpenAPI spec
│   │   ├── middleware/    auth/RBAC, CSRF, rate limit, validation, errors
│   │   ├── routes/        route table
│   │   ├── services/      auth, patient, emergency, disclosure policy, admin, PDF, suspicious activity
│   │   ├── utils/         emergency IDs, OTP hashing, errors, pagination
│   │   ├── validators/    Zod schemas
│   │   ├── app.js · server.js
│   ├── tests/             Vitest + Supertest API tests
│   └── Dockerfile · docker-entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── components/    design system (ui/), medical display, OTP input
│   │   ├── context/       auth, toasts
│   │   ├── features/      auth · patient · professional · emergency · admin
│   │   ├── hooks/ · layouts/ · pages/ · routes/ · services/ · styles/ · utils/
│   │   └── test/
│   └── Dockerfile · nginx.conf
├── e2e/                   Playwright walkthrough scripts
├── docker-compose.yml · .env.example · README.md
```
