# QR Code Based Attendance Management System - Backend

A production-oriented college QR Code Based Attendance Management System backend built with **Node.js**, **Express.js**, **PostgreSQL**, **Prisma ORM**, and **Redis**.

---

## 1. Project Overview

The **QR Code Based Attendance Management System** provides an enterprise-ready foundation for managing collegiate academic structures, faculty assignments, and fraud-resistant attendance sessions. 

The system models realistic college hierarchies:
- **Departments** contain **Programs** (e.g., BCA, MCA, B.Tech)
- **Programs** contain **Academic Years** (e.g., 1st Year, 2nd Year)
- **Academic Years** contain **Sections** (e.g., Section A, Section B)
- **Students** are enrolled into Sections
- **Teachers** are mapped to multi-dimensional **Teaching Assignments** (scoping teacher, subject, department, program, academic year, and section)

Attendance sessions leverage time-limited dynamic QR verification with temporary state held in **Redis** and immutable historical records permanently committed to **PostgreSQL**.

---

## 2. Current Implementation

This project delivers a **full production backend** with two completed vertical modules:

### Foundation Layer
- **Layered Architecture**: Strict separation of concerns across controllers, services, repositories, middleware, validators, and infrastructure clients.
- **Relational Data Model (Prisma)**: Complete PostgreSQL schema covering users, refresh tokens, password reset tokens, academic hierarchy, teacher/student profiles, multi-dimensional teaching assignments, student enrollments, attendance sessions, attendance records with strict unique constraints (`UNIQUE(studentId, sessionId)`), and audit logs.
- **Authentication & Token System**:
  - Secure password hashing using `bcryptjs` (salt rounds: 12)
  - Short-lived JWT Access Tokens (15 minutes)
  - Long-lived Rotated Refresh Tokens (7 days) with SHA-256 database hashing
  - Refresh token reuse detection & revocation
  - Password change endpoint with automatic session invalidation
  - `mustChangePassword` flag for enforced first-login password resets
- **Authorization & Security Guardrails**:
  - Role-based authorization (`SUPER_ADMIN`, `ADMIN`, `PRINCIPAL`, `HOD`, `TEACHER`, `STUDENT`)
  - Department and resource scope verification middleware
  - Helmet HTTP security headers, Strict CORS, Zod input validation
  - Centralized safe error handling (no stack traces or DB internals leaked)
  - Dual-tier rate limiting (API-level & strict auth brute-force protection)
- **Infrastructure**: Resilient Prisma + Redis (`ioredis`) singletons, live `/health` check.

### Principal Module
- **Profile Management**: View and update own profile; secure password change.
- **HOD Management**: Create HOD accounts with temporary password and `mustChangePassword` enforcement; list, view, activate/deactivate HODs; re-assign HODs to different departments.
- **Academic Hierarchy Navigation**: Browse the full Department → Program → Academic Year → Section → Subject tree within the principal's scope.
- **Attendance Analytics**: Institution-wide aggregated reports — overall summary, department-wise, program-wise, academic-year-wise, section-wise, subject-wise breakdowns, plus low-attendance student and subject alerts.
- **Automated Testing Suite**: Jest/Supertest suites covering 38 tests across 6 test files (unit + integration).

---

## 3. Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Runtime** | Node.js (v18+ / v20+ / v24+) | JavaScript runtime environment |
| **Framework** | Express.js 4.x | Fast, unopinionated HTTP server framework |
| **Primary Database** | PostgreSQL 14+ / 16+ | Permanent source of truth for all relational & attendance data |
| **ORM** | Prisma 6.x | Type-safe database client, schema definitions, and migrations |
| **In-Memory Cache / State** | Redis 7.x (`ioredis`) | Ephemeral session state, QR TTL tokens, rate limits |
| **Authentication** | JWT (`jsonwebtoken`) | Stateless access tokens & cryptographic refresh tokens |
| **Password Hashing** | `bcryptjs` | Adaptive one-way hashing with configurable work factor |
| **Validation** | Zod 3.x | Schema-based request body, query, and param validation |
| **Security** | Helmet, CORS, Express-Rate-Limit | Hardened headers, origin controls, and request throttling |
| **Testing** | Jest & Supertest | Automated unit and integration testing suite |

---

## 4. Backend Architecture

The backend follows a layered architectural pattern:

```
[ Client Request ]
       │
       ▼
[ Security & Middleware ] ─── (Helmet, CORS, RateLimiter, Morgan)
       │
       ▼
[ Routes & Routing ] ──────── (Route matching, authentication, role authorization, Zod validation)
       │
       ▼
[ Controllers ] ───────────── (Thin HTTP request parsing & standard JSON response formatting)
       │
       ▼
[ Services ] ──────────────── (Pure business logic, token issuance, domain rules, audit triggers)
       │
       ▼
[ Repositories ] ──────────── (Data access abstraction over Prisma client queries)
       │
 ┌─────┴──────────────────┐
 │                        │
 ▼                        ▼
[ PostgreSQL ]        [ Redis ]
(Permanent Store)     (TTL & Temporary Sessions)
```

### Academic Hierarchy

```
Department (e.g. Computer Science)
    │
    └── Program (e.g. BCA, MCA)
            │
            └── Academic Year (e.g. 1st Year, 2nd Year)
                    │
                    └── Section (e.g. Section A, Section B)
                            │
                            └── Students & Enrollments
```

### Teaching Assignment Model

A teacher is **not** naively tied to a single subject. Instead, a teacher's authorization boundary is defined by `TeachingAssignment`:
- `teacherId`
- `subjectId`
- `departmentId`
- `programId`
- `academicYearId`
- `sectionId`
- `status` (`ACTIVE` / `INACTIVE`)
- `startDate` & `endDate`
- `UNIQUE(teacherId, subjectId, sectionId, academicYearId)`

---

## 5. Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js           # Authentication endpoints
│   │   ├── academic.controller.js       # Academic hierarchy CRUD
│   │   ├── principal.controller.js      # Principal profile, HOD, analytics
│   │   └── health.controller.js         # System health and connectivity
│   ├── services/
│   │   ├── auth.service.js              # Authentication workflows & token lifecycle
│   │   ├── academic.service.js          # Department / Program / Year / Section / Subject logic
│   │   ├── principal.service.js         # Principal business logic (HOD mgmt, analytics)
│   │   ├── audit.service.js             # Security audit trail logging
│   │   └── health.service.js            # Database & Redis status evaluator
│   ├── routes/
│   │   ├── auth.routes.js               # /api/v1/auth routes
│   │   ├── academic.routes.js           # /api/v1/academic routes
│   │   ├── principal.routes.js          # /api/v1/principal routes
│   │   ├── health.routes.js             # /health endpoint route
│   │   └── index.routes.js              # API v1 router aggregator
│   ├── middleware/
│   │   ├── auth.middleware.js           # Bearer JWT access-token verification
│   │   ├── role.middleware.js           # Role-based access control (RBAC)
│   │   ├── scope.middleware.js          # Department boundary & self-ownership verification
│   │   ├── validate.middleware.js       # Zod request validator middleware
│   │   ├── errorHandler.js              # Centralized safe error formatting & 404 handler
│   │   └── rateLimiter.js               # General API & strict auth rate limiters
│   ├── validators/
│   │   ├── auth.validator.js            # Zod schemas for auth actions
│   │   ├── academic.validator.js        # Zod schemas for academic hierarchy
│   │   └── principal.validator.js       # Zod schemas for Principal endpoints
│   ├── repositories/
│   │   ├── user.repository.js           # Users, HOD CRUD, profiles
│   │   ├── department.repository.js     # Department queries
│   │   ├── program.repository.js        # Program queries
│   │   ├── academicYear.repository.js   # Academic year queries
│   │   ├── section.repository.js        # Section queries
│   │   ├── subject.repository.js        # Subject queries
│   │   ├── attendance.repository.js     # Complex attendance aggregation queries
│   │   ├── refreshToken.repository.js   # Refresh token storage & revocation
│   │   └── auditLog.repository.js       # Audit log writes
│   ├── constants/
│   │   └── attendance.constants.js      # Centralized thresholds & pagination constants
│   ├── lib/
│   │   ├── prisma.js                    # Prisma Client singleton & connection check
│   │   ├── redis.js                     # Redis client with retry logic & cache helpers
│   │   └── logger.js                    # Structured logging utility
│   ├── utils/
│   │   ├── errors.js                    # Custom AppError classes (401, 403, 404, 409 …)
│   │   ├── response.js                  # Standardized success/error JSON wrappers
│   │   ├── tokens.js                    # JWT generation, verification, SHA-256 hashing
│   │   └── passwords.js                 # bcrypt hashing & comparison
│   ├── app.js                           # Express application & middleware stack
│   └── server.js                        # Entry point: connection checks & graceful shutdown
├── prisma/
│   └── schema.prisma                    # Full relational schema with attendance indexes
├── tests/
│   ├── unit/
│   │   ├── passwords.test.js            # Password utility unit tests
│   │   └── tokens.test.js               # JWT & crypto hashing unit tests
│   └── integration/
│       ├── auth.test.js                 # Authentication flow integration tests
│       ├── academic.test.js             # Academic hierarchy integration tests
│       ├── principal.test.js            # Principal module integration tests
│       └── health.test.js              # /health and / route integration tests
├── docker-compose.yml                   # One-command orchestration for PostgreSQL & Redis
├── .env.example                         # Template environment variables
├── .env                                 # Local environment configuration (git-ignored)
├── .gitignore                           # Ignores secrets, logs, node_modules
├── package.json                         # Dependencies, engines, and npm scripts
└── README.md                            # This file
```

---

## 6. Prerequisites

Ensure you have the following installed on your host system:
1. **Node.js** (v18.0.0 or higher; v20 LTS or v24 recommended)
2. **npm** (v9.0.0 or higher)
3. **PostgreSQL** (v14 or higher) or **Docker**
4. **Redis** (v6 or v7) or **Docker**

---

## 7. Installation

1. **Clone or navigate to the repository directory:**
   ```bash
   cd "d:/QR CODE BASED ATTENDANCE MANAGEMENT SYSTEM BACKEND"
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

---

## 8. Environment Variables

Copy the provided `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

### Configuration Details

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port on which the Express server listens |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:5173` | Comma-separated list of allowed frontend origins |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/attendance_db?schema=public` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_PASSWORD` | *(empty)* | Optional Redis authentication password |
| `JWT_ACCESS_SECRET` | *32+ characters* | Secret key used to sign access tokens |
| `JWT_ACCESS_EXPIRY` | `15m` | Lifetime of access tokens |
| `JWT_REFRESH_SECRET` | *32+ characters* | Secret key used to sign refresh tokens |
| `JWT_REFRESH_EXPIRY` | `7d` | Lifetime of refresh tokens |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 mins) | Time window for rate limiter |
| `RATE_LIMIT_MAX` | `100` | Maximum requests per IP within the window |

> [!CAUTION]
> Never commit `.env` or sensitive credentials to Git. Keep `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` unique and cryptographically strong in production.

---

## 9. PostgreSQL Setup

### Option A: Using Docker (Recommended for quick local setup)
Start both PostgreSQL and Redis with the included `docker-compose.yml`:
```bash
docker compose up -d
```
This launches:
- PostgreSQL on `localhost:5432` (User: `postgres`, Password: `postgrespassword`, DB: `attendance_db`)
- Redis on `localhost:6379`

### Option B: Local PostgreSQL Installation
1. Start the PostgreSQL service.
2. Create the target database using `psql`:
   ```sql
   CREATE DATABASE attendance_db;
   ```
3. Update `DATABASE_URL` in your `.env` file with your credentials:
   ```env
   DATABASE_URL=postgresql://<username>:<password>@localhost:5432/attendance_db?schema=public
   ```

---

## 10. Redis Setup

Redis manages temporary active attendance sessions, dynamic QR codes, and caching.

- **With Docker:** Included in `docker-compose.yml` on port `6379`.
- **Standalone:** Start your Redis server:
  ```bash
  redis-server
  ```
- **Resilience:** If Redis is temporarily offline, the server logs a warning and continues running. The `/health` endpoint will report Redis as `disconnected` while PostgreSQL remains active.

---

## 11. Prisma Setup

Generate the Prisma Client whenever the schema is updated or after a fresh install:

```bash
npm run prisma:generate
```

---

## 12. Database Migration

Apply database migrations to keep PostgreSQL schema in sync:

```bash
npm run prisma:migrate
```

To inspect the database graphically using Prisma Studio:
```bash
npm run prisma:studio
```

---

## 13. Running the Backend

### Development Mode (with hot-reload via nodemon):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

Once running, the console will output:
```
[INFO] - Initializing QR Code Attendance Backend System...
[INFO] - Server successfully running on port 5000 [Env: development]
[INFO] - Health check available at: http://localhost:5000/health
[INFO] - API endpoints available at: http://localhost:5000/api/v1
```

---

## 14. Available npm Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts server with `nodemon` for active development |
| `npm start` | Starts server directly with Node.js in production mode |
| `npm test` | Runs Jest unit and integration tests |
| `npm run test:watch` | Runs Jest in interactive watch mode |
| `npm run prisma:generate` | Generates or updates the Prisma Client code |
| `npm run prisma:migrate` | Runs Prisma development migrations against PostgreSQL |
| `npm run prisma:deploy` | Applies pending migrations in CI/CD or production |
| `npm run prisma:studio` | Opens Prisma Studio web UI for browsing database tables |

---

## 15. API Overview

All standard API endpoints respond using uniform JSON structures:

**Success Response Format:**
```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "details": []
  }
}
```

### Core Foundation Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Welcome message & API metadata |
| `GET` | `/health` | Public | System, PostgreSQL, and Redis connectivity health check |
| `GET` | `/api/v1` | Public | API v1 status and documentation link |
| `POST` | `/api/v1/auth/login` | Public (Rate-limited) | User login; issues access & refresh tokens |
| `POST` | `/api/v1/auth/refresh-token` | Public | Rotates refresh token & issues new access token |
| `POST` | `/api/v1/auth/logout` | Authenticated / Public | Revokes refresh token in PostgreSQL |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieves profile of currently authenticated user |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Updates password and revokes all active sessions |

### Academic Hierarchy & Subjects Endpoints (`/api/v1/academic`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/academic/departments` | Authenticated | List all departments with program/faculty counts |
| `GET` | `/api/v1/academic/departments/:id` | Authenticated | Department details with programs, years, sections, subjects |
| `POST` | `/api/v1/academic/departments` | Admin / Principal | Create a new academic department |
| `PUT` | `/api/v1/academic/departments/:id` | Admin / Principal | Update department details or reassign HOD |
| `DELETE`| `/api/v1/academic/departments/:id` | Admin / Principal | Delete a department |
| `GET` | `/api/v1/academic/departments/:departmentId/programs` | Authenticated | List programs under a specific department |
| `POST` | `/api/v1/academic/programs` | Admin / Principal / HOD | Create a new degree program (e.g. BCA, MCA) |
| `PUT` | `/api/v1/academic/programs/:id` | Admin / Principal / HOD | Update degree program details |
| `DELETE`| `/api/v1/academic/programs/:id` | Admin / Principal / HOD | Delete a program |
| `GET` | `/api/v1/academic/programs/:programId/academic-years` | Authenticated | List academic years for a program |
| `POST` | `/api/v1/academic/academic-years` | Admin / Principal / HOD | Create an academic year (e.g. 1st Year, 2nd Year) |
| `GET` | `/api/v1/academic/academic-years/:academicYearId/sections` | Authenticated | List sections under an academic year |
| `POST` | `/api/v1/academic/sections` | Admin / Principal / HOD | Create section (e.g. Section A, Section B) |
| `GET` | `/api/v1/academic/subjects` | Authenticated | List subjects with optional departmentId/programId filter |
| `POST` | `/api/v1/academic/subjects` | Admin / Principal / HOD | Create a subject |
| `PUT` | `/api/v1/academic/subjects/:id` | Admin / Principal / HOD | Update subject details |
| `DELETE`| `/api/v1/academic/subjects/:id` | Admin / Principal / HOD | Delete a subject |

### Principal Endpoints (`/api/v1/principal`)

> All endpoints require `Authorization: Bearer <access_token>` and `role = PRINCIPAL`.

#### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/principal/profile` | Get own profile (name, email, role, department) |
| `PUT` | `/api/v1/principal/profile` | Update own profile (name) |
| `POST` | `/api/v1/principal/change-password` | Change own password; revokes all active sessions |

#### HOD Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/principal/hods` | Create a new HOD account with secure temporary password |
| `GET` | `/api/v1/principal/hods` | List all HODs (pagination: `page`, `limit`; filter: `search`, `departmentId`, `status`) |
| `GET` | `/api/v1/principal/hods/:hodId` | View full HOD profile including assigned department |
| `PUT` | `/api/v1/principal/hods/:hodId` | Update HOD details (name, email, departmentId) |
| `PATCH` | `/api/v1/principal/hods/:hodId/status` | Activate or deactivate an HOD account |

**Create HOD Request Body:**
```json
{
  "name": "Dr. Priya Sharma",
  "email": "hod.cs@college.edu",
  "departmentId": "<uuid>",
  "temporaryPassword": "Temp@1234"
}
```

> [!IMPORTANT]
> The `temporaryPassword` field is stored as a **bcrypt hash** — never plaintext. The `mustChangePassword` flag is set to `true` automatically, forcing the HOD to change their password on first login.

**Create HOD Response (201):**
```json
{
  "success": true,
  "message": "HOD created successfully",
  "data": {
    "id": "<uuid>",
    "name": "Dr. Priya Sharma",
    "email": "hod.cs@college.edu",
    "role": "HOD",
    "isActive": true,
    "mustChangePassword": true,
    "department": { "id": "<uuid>", "name": "Computer Science", "code": "CS" }
  }
}
```

#### Academic Hierarchy Navigation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/principal/departments` | List all departments with program and faculty counts |
| `GET` | `/api/v1/principal/departments/:deptId` | Department details with programs, years, sections, subjects |
| `GET` | `/api/v1/principal/departments/:deptId/programs` | Programs within a department |
| `GET` | `/api/v1/principal/programs/:programId/academic-years` | Academic years within a program |
| `GET` | `/api/v1/principal/academic-years/:yearId/sections` | Sections within an academic year |

#### Attendance Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/principal/analytics/overall` | Institution-wide summary (total students, sessions, avg % attendance) |
| `GET` | `/api/v1/principal/analytics/departments` | Attendance breakdown per department |
| `GET` | `/api/v1/principal/analytics/programs` | Attendance breakdown per program |
| `GET` | `/api/v1/principal/analytics/academic-years` | Attendance breakdown per academic year |
| `GET` | `/api/v1/principal/analytics/sections` | Attendance breakdown per section |
| `GET` | `/api/v1/principal/analytics/subjects` | Attendance breakdown per subject |
| `GET` | `/api/v1/principal/analytics/low-attendance/students` | Students below attendance threshold (default 75%) |
| `GET` | `/api/v1/principal/analytics/low-attendance/subjects` | Subjects with class average below threshold |

**Analytics Query Parameters (all optional):**

| Parameter | Type | Description |
|---|---|---|
| `startDate` | ISO 8601 date | Filter sessions from this date |
| `endDate` | ISO 8601 date | Filter sessions up to this date |
| `departmentId` | UUID | Narrow to a specific department |
| `programId` | UUID | Narrow to a specific program |
| `threshold` | number (0–100) | Override default low-attendance threshold (default: 75) |
| `page` | number | Page number for paginated endpoints |
| `limit` | number | Items per page (default: 20, max: 100) |

**Overall Analytics Response (200):**
```json
{
  "success": true,
  "message": "Overall attendance summary retrieved",
  "data": {
    "totalStudents": 480,
    "totalSessions": 1240,
    "totalPresent": 42800,
    "totalAbsent": 9800,
    "averageAttendancePercentage": 81.37
  }
}
```

---

## 16. Authentication and Authorization

### Token Lifecycle
1. **Login (`POST /api/v1/auth/login`)**:
   - Compares credentials using `bcrypt.compare`.
   - Generates JWT Access Token (signed with `JWT_ACCESS_SECRET`, 15-minute expiry).
   - Generates cryptographically signed Refresh Token (signed with `JWT_REFRESH_SECRET`, 7-day expiry).
   - Stores the SHA-256 hash of the refresh token in the `refresh_tokens` PostgreSQL table.
   - Logs an `AUTH_LOGIN` entry in the `audit_logs` table.

2. **Accessing Protected Routes**:
   - Send the access token in the `Authorization` header:
     ```
     Authorization: Bearer <access_token>
     ```
   - `authenticateJwt` middleware validates the signature, confirms the user exists, and checks that `user.isActive === true`.
   - User profile context (`id`, `email`, `role`, `teacherId`, `studentId`, `departmentId`) is attached to `req.user`.

3. **Token Rotation & Reuse Detection (`POST /api/v1/auth/refresh-token`)**:
   - Incoming refresh token is hashed and verified against the database.
   - If a previously revoked token is presented, **Token Reuse Detection** triggers: all sessions for that user are revoked immediately.
   - On valid exchange, the old token is marked revoked and a new access/refresh token pair is issued.

4. **Role Authorization**:
   - Backend routes apply `authorizeRoles('PRINCIPAL', 'HOD', 'TEACHER')`.
   - Frontend role claims are never trusted; role checks are performed server-side on every request.

---

## 17. Security

- **Security Headers:** `helmet` sets HTTP headers guarding against XSS, clickjacking, and MIME-sniffing.
- **Strict CORS:** Configurable whitelist via `CORS_ORIGIN`.
- **Password Protection:** Hashes with `bcryptjs` using 12 salt rounds; plaintext passwords are never logged or stored.
- **Temporary Password Enforcement:** HOD accounts created by the Principal receive a temporary password stored as a bcrypt hash. The `mustChangePassword` flag is set to `true`; the system rejects all non-password-change API calls until the flag is cleared.
- **Refresh Token Hashing:** Raw refresh tokens are never persisted; only SHA-256 hashes are stored.
- **Rate Limiting:**
  - Standard API limiter: 100 requests per 15 minutes.
  - Auth limiter: 15 login attempts per 15 minutes per IP.
- **Safe Error Responses:** Database error codes (e.g. Prisma `P2002`) are translated to friendly messages. Stack traces are omitted in production.
- **Audit Trails:** Security actions (`AUTH_LOGIN`, `AUTH_LOGOUT`, `PASSWORD_CHANGED`, `HOD_CREATED`, `HOD_STATUS_CHANGED`) are tracked in the `audit_logs` PostgreSQL table.

---

## 18. Testing

Run the automated test suite with Jest:

```bash
npm test
```

The test suite covers **38 tests across 6 test files**:

| File | What it covers |
|---|---|
| `unit/passwords.test.js` | bcrypt hashing & comparison |
| `unit/tokens.test.js` | JWT generation, verification, SHA-256 hashing |
| `integration/health.test.js` | `/health`, `/`, `/api/v1` routes |
| `integration/auth.test.js` | Login flows, token refresh, password change, `me` profile |
| `integration/academic.test.js` | Department CRUD, RBAC enforcement, hierarchy |
| `integration/principal.test.js` | Principal profile, HOD CRUD, status management, analytics, hierarchy navigation |

---

## 19. Health Check

The `/health` endpoint provides real-time connectivity status:

```bash
curl -X GET http://localhost:5000/health
```

**Example Response (when services are connected):**
```json
{
  "success": true,
  "message": "Service health status",
  "data": {
    "status": "healthy",
    "timestamp": "2026-10-01T21:40:00.000Z",
    "uptimeSeconds": 124,
    "environment": "development",
    "responseTimeMs": 5,
    "services": {
      "database": {
        "type": "PostgreSQL",
        "status": "connected"
      },
      "cache": {
        "type": "Redis",
        "status": "connected"
      }
    }
  }
}
```

---

## 20. Troubleshooting

### 1. `PostgreSQL connection check failed` / Prisma P1001
- Ensure PostgreSQL is running on port 5432.
- Check the credentials in `DATABASE_URL` in `.env`.
- If using Docker, run `docker compose ps` to verify container health.

### 2. `Redis connection warning`
- If Redis is not running locally, the server logs a warning and uses graceful fallbacks.
- Start Redis via Docker (`docker compose up -d redis`) or local service (`redis-server`).

### 3. `Prisma Client has not been generated`
- Run:
  ```bash
  npm run prisma:generate
  ```

### 4. `EPERM` / `npm error ECONNRESET` during npm install
- Rerun `npm install`. Temporary network glitches or file locks from antivirus can interrupt engine downloads.

---

## 21. Development Guidelines

1. **Keep Controllers Thin:** Controllers only receive HTTP inputs and format HTTP responses. All logic belongs in `services/`.
2. **Use Repositories for Database Access:** Wrap complex Prisma queries inside `repositories/` to keep services testable and decoupled.
3. **Always Validate Inputs:** Use Zod schemas in `validators/` and apply `validate(schema)` middleware on routes.
4. **Enforce Authorization Server-Side:** Always apply `authenticateJwt` and `authorizeRoles` or `requireDepartmentScope` on protected endpoints.
5. **Preserve Database as Permanent Source of Truth:** Never store finalized attendance sessions or student records exclusively in Redis; Redis is strictly for temporary TTL and ephemeral state.
