# WellWisher Security Architecture & Guidelines

---

## 1. Authentication Architecture
- **JWT Standard**: Tokens are signed strictly using HMAC-SHA256 (`jsonwebtoken` v9.0.2).
- **Environment Driven**: `JWT_SECRET` must be loaded from `process.env.JWT_SECRET`.
- **Fail-Safe Startup**: In production (`NODE_ENV=production`), missing or short (<32 chars) JWT secrets cause immediate fatal server exit.
- **Strict Verification**: Every protected endpoint enforces `verifyToken` middleware. Unauthenticated, expired, or tampered tokens return `HTTP 401 Unauthorized`.
- **No Client-Supplied Identity**: The user's ID (`req.userId`) and email (`req.userEmail`) are derived strictly from the verified JWT payload.

---

## 2. User Data Isolation
- **SQL Query Scoping**: Every database query for user-owned entities (routines, hydration logs, vitals logs, medications, sleep/mood logs, journals) mandates a parameterized `WHERE user_id = ?` clause.
- **Mutation Permissions**: `UPDATE` and `DELETE` queries enforce ownership checks (`WHERE id = ? AND user_id = ?`). Attempting to mutate another user's record returns `HTTP 404 Not Found` without disclosing data existence.
- **Cross-User Protection**: Automated security tests verify that User A cannot view, update, or delete User B's records.

---

## 3. CORS Policy
- **Development**: Permits requests from `localhost`, `127.0.0.1`, and Android emulator loopback (`10.0.2.2`).
- **Production**: Strictly restricted to explicit domain origins configured via `ALLOWED_ORIGINS` environment variable. Wildcard `origin: "*"` is blocked for authenticated sessions.

---

## 4. Rate Limiting & Abuse Prevention
- **General API Limiter**: Max 300 requests per 15-minute window per IP.
- **Auth Endpoint Limiter** (`/api/auth/*`): Max 20 requests per 15-minute window per IP to eliminate brute-force credential stuffing.
- **AI Endpoint Limiter** (`/api/ai/*`): Max 40 requests per minute per IP to protect external LLM resource quotas.

---

## 5. Secrets & Environment Management
- **Local Isolation**: `.env` is listed in `.gitignore` and excluded from version control.
- **Template Reference**: `.env.example` provides non-sensitive placeholder configurations.
- **Backend Only**: LLM keys (`GEMINI_API_KEY`), database passwords, and JWT secrets reside exclusively in the backend runtime and are never sent to the Flutter client.
- **Log Sanitization**: Logs exclude passwords, authentication tokens, and private health data.

---

## 6. API Route Authorization Matrix

| Endpoint | Method | Access Level | Description |
|---|---|---|---|
| `/` | `GET` | PUBLIC | Gateway health info |
| `/api/health` | `GET` | PUBLIC | Server & database status check |
| `/api/auth/register` | `POST` | PUBLIC (Rate-limited) | User account registration |
| `/api/auth/login` | `POST` | PUBLIC (Rate-limited) | User authentication |
| `/api/auth/me` | `GET` | AUTHENTICATED | User profile retrieval |
| `/api/schedule` | `GET`, `POST` | AUTHENTICATED | User routine management |
| `/api/schedule/:id` | `PUT`, `DELETE` | OWNER_ONLY | Routine updates & deletions |
| `/api/hydration` | `GET`, `POST` | AUTHENTICATED | Water intake tracking |
| `/api/vitals` | `GET`, `POST` | AUTHENTICATED | Health vitals records |
| `/api/medications` | `GET`, `POST` | AUTHENTICATED | Medication schedules |
| `/api/medications/:id/take` | `POST` | OWNER_ONLY | Pill decrement |
| `/api/sleep-mood` | `GET`, `POST` | AUTHENTICATED | Sleep & mood tracking |
| `/api/screen-care` | `GET`, `PUT` | AUTHENTICATED | 20-20-20 screen settings |
| `/api/family` | `GET`, `POST` | AUTHENTICATED | Family feed & nudges |
| `/api/ai/*` | `POST` | AUTHENTICATED (Rate-limited) | AI chat, plans, journal |

---

## 7. Input Validation & Error Handling
- **Type & Range Sanitization**: Systolic/diastolic BP, SpO2, heart rate, hydration volume, and sleep hours are bounded to valid clinical and physical ranges.
- **Safe Error Responses**: Database internal schemas, SQL queries, and server stack traces are omitted from production error payloads.

---

## 8. Production Database Integrity & In-Memory Isolation
- **MySQL as Sole Production Source of Truth**: In production (`NODE_ENV=production`), all queries route directly to the MySQL connection pool (`realPool.query`). Any MySQL error or disconnection throws immediately and returns an appropriate HTTP 500 / 503 error.
- **No Silent Fallback**: The backend **never** silently falls back to in-memory storage in production. User data is never stored in volatile memory in production.
- **Test/Dev Mock Isolation**: The `InMemoryDatabaseEngine` is strictly restricted to isolated automated test runs (`NODE_ENV=test`) or explicit local development with `ENABLE_IN_MEMORY_DEV_FALLBACK=true`.

