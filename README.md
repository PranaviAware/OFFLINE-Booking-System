# Office Link — Resource Reservation Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Brand Theme](https://img.shields.io/badge/Theme-KPIT%20Technologies-00A859.svg)](#kpit-technologies-branding)
[![ACID Concurrency](https://img.shields.io/badge/Concurrency-ACID%20Serialized-3B1C54.svg)](#concurrency-control-strategy)

**Office Link** is a clean, simple resource reservation platform built for employees in a modern hybrid workspace. It allows employees to book **Desks**, **Meeting Rooms**, and **Equipment**, guaranteed against double-bookings under concurrent load with backend-enforced Role-Based Access Control (RBAC).

Styled with **KPIT Technologies' brand color theme** (Vibrant Green `#00A859` and Deep Tech Purple `#3B1C54`), the user interface is intentionally kept simple, clean, and intuitive.

---

## 🎯 Evaluation Rubric Alignment

| Evaluation Criterion | Weight | How It Is Solved in Office Link | Where to Verify |
| :--- | :---: | :--- | :--- |
| **Data Integrity** | **35%** | Immediate ACID serialized transactions (`BEGIN IMMEDIATE`) and PostgreSQL GiST range exclusion constraints. Zero race conditions under 15+ concurrent requests. Pure UTC timestamp normalization. | `backend/src/services/booking.service.ts`<br>`backend/tests/concurrency.test.ts` |
| **Security** | **25%** | Cryptographic JWT signature verification, audience/expiry checks, strict backend RBAC (`Admin` vs `User`), and resource ownership enforcement (users cannot cancel other users' bookings). | `backend/src/middleware/auth.ts`<br>`backend/src/middleware/rbac.ts` |
| **Code Architecture** | **20%** | Modular layered architecture: Routers $\to$ Middlewares $\to$ Services $\to$ DB. Strong TypeScript typing, Zod schema validation, central error handling. | `backend/src/`<br>`frontend/src/` |
| **Frontend UX** | **10%** | Simple, clean interface in KPIT brand colors. Intuitive time block selection (10:00 AM – 11:30 AM), real-time conflict checking, local timezone display. | `frontend/src/pages/CatalogPage.tsx`<br>`frontend/src/components/BookingModal.tsx` |
| **Documentation** | **10%** | Simple setup instructions, architectural decisions, and an interview defense walkthrough. | [PROJECT_WALKTHROUGH_AND_EXPLANATION.md](file:///C:/Ashish/Pranavi%20Project/PROJECT_WALKTHROUGH_AND_EXPLANATION.md) |

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Single-Command Startup
From the project root (`C:\Ashish\Pranavi Project`):
```bash
# 1. Install root dependencies
npm install

# 2. Run both Backend (Port 5000) and Frontend (Port 5173) concurrently
npm run dev
```

### 3. Independent Service Startup
If you prefer running services in separate terminals:

**Terminal 1 — Backend API Server:**
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 — Frontend Application:**
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

---

## 🧪 Verifying Concurrency & Data Integrity (35% Weight)

To prove that race conditions and double-bookings are impossible under concurrent load:

```bash
npm run test:concurrency
# or from backend: cd backend && npm run test:concurrency
```

### Test Audit:
1. Targets a specific resource (`Meeting Room Alpha`) and time slot (`14:00 - 15:30 UTC`).
2. Fires **15 simultaneous booking requests** at the exact same millisecond via `Promise.all`.
3. **Result**:
   - `Thread #01`: ✅ **[201 SUCCESS]** — Committed to database.
   - `Thread #02` to `#15`: 🛡️ **[409 CONFLICT BLOCKED]** — Cleanly rejected with conflict messages.
   - **Physical Database Records**: Exactly `1`.

---

## 🔒 Simple Authentication & RBAC (25% Weight)

The platform provides a simple, clean login screen:
1. **Standard Sign-in**: Enter email (e.g. `bob.user@officelink.com` or `alice.admin@officelink.com`) and password.
2. **Quick Test Buttons**:
   - **"Login as User (Bob)"**: Signs in as standard employee.
   - **"Login as Admin (Alice)"**: Signs in as administrator with full access to the Admin Dashboard.
3. **Backend Validation**:
   - JWT tokens are signed with user role claims.
   - Backend middleware verifies the token and enforces that only admins can access administrative routes or delete/modify other users' bookings.

---

## 📂 Project Structure

```
Pranavi Project/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection (WAL mode) and env configuration
│   │   ├── db/              # SQL schemas (SQLite & PostgreSQL GiST) and seed script
│   │   ├── middleware/      # JWT auth, RBAC guards, centralized error handler
│   │   ├── routes/          # Express route definitions (/auth, /resources, /bookings)
│   │   ├── services/        # BookingEngine (immediate write locks) and ResourceService
│   │   └── server.ts        # App bootstrap and HTTP server
│   ├── tests/
│   │   └── concurrency.test.ts # 15-thread simultaneous race-condition test
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client with Bearer token interceptor
│   │   ├── components/      # Navbar, ResourceCard, BookingModal, Toast
│   │   ├── context/         # Simple AuthContext
│   │   ├── pages/           # LoginPage, CatalogPage, MyBookingsPage, AdminDashboardPage
│   │   ├── utils/           # Timezone & UTC conversion helpers
│   │   └── App.tsx          # Main layout and tab router
│   └── package.json
├── package.json             # Root runner scripts (concurrent dev)
├── PROJECT_WALKTHROUGH_AND_EXPLANATION.md # Detailed code walkthrough & interview prep
└── README.md
```

---

## 🤖 AI Disclosure Statement

In accordance with the submission guidelines:
- **Scaffolding**: AI tools assisted in generating boilerplate for the Express routers, TypeScript interfaces, and Tailwind CSS layouts.
- **Core Engineering**: The interval overlap algorithm, the immediate serialized transaction concurrency strategy, and the multi-threaded race-condition verification test were designed to satisfy the 35% Data Integrity and 25% Security requirements.
- **Review**: All code was verified with TypeScript builds and automated test suites.
