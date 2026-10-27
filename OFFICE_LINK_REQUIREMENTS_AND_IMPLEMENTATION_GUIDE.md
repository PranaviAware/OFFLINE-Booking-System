# Office Link System — Complete Requirements & Implementation Blueprint

---

## 1. Executive Summary & Assessment Overview

**Office Link** is an enterprise-grade resource reservation platform built for employees in a modern hybrid workspace. It enables frictionless, reliable booking of:
- **Desks** (hot desks, dedicated workstations, standing desks)
- **Meeting Rooms** (conference rooms, huddle rooms, video conference suites)
- **Equipment** (monitors, projectors, VR headsets, testing devices)

The platform must guarantee **zero double-bookings under concurrent load**, enforce **strict backend Role-Based Access Control (RBAC)** via OIDC/JWT, and maintain **flawless UTC temporal data integrity**.

### Assessment Evaluation Matrix

| Criterion | Weight | Evaluator Expectation & Success Metric |
| :--- | :---: | :--- |
| **Data Integrity** | **35%** | **Highest Priority.** Absolute prevention of race conditions and double-bookings under simultaneous requests. Correct UTC storage and timezone math throughout the stack. |
| **Security** | **25%** | Secure OIDC authentication, cryptographic RS256 JWT validation, strict backend RBAC (`Admin` vs `User`), resource ownership enforcement, zero reliance on frontend state. |
| **Code Architecture** | **20%** | Modular, layered separation of concerns (Controllers $\to$ Services $\to$ Repositories/DAOs $\to$ DB), clean error handling, type safety, and maintainable structure. |
| **Frontend UX** | **10%** | Intuitive time block selection (e.g., 10:00 AM–11:30 AM), real-time conflict feedback, clean loading/error states, responsive design. |
| **Documentation** | **10%** | Clear local setup instructions, Architectural Decision Records (ADR), concurrency strategy rationale, and transparent AI disclosure. |

---

## 2. Comprehensive Requirements Breakdown

### 2.1 Functional Scope

#### Module 1: Resource Catalog
- **Resource Listing**: View all bookable assets categorized into `DESK`, `MEETING_ROOM`, and `EQUIPMENT`.
- **Filtering & Search**: Filter by resource type, capacity (for rooms), location/floor/zone, and availability status.
- **Resource Detail**: View specifications (amenities, capacity, equipment details, location identifier like "Room A", "Desk 12").

#### Module 2: Booking Engine
- **Selection**: Select a resource, date, and continuous time block (e.g., `2026-10-28 10:00:00` to `2026-10-28 11:30:00`).
- **Real-Time Conflict Pre-check**: Prior to final submission, users receive instantaneous feedback showing whether the requested slot is currently free or occupied.
- **Atomic Booking Commitment**: On submission, the backend commits the booking atomically or rejects overlapping attempts with a clean `409 Conflict` response.
- **Conflict Prevention**: Overlapping reservations for the same resource are strictly prohibited by both database constraints and transaction isolation.

#### Module 3: Management Dashboards
- **User Dashboard**:
  - View personal upcoming, active, and past reservations.
  - Cancel personal future reservations (state changes to `CANCELLED` or record is safely purged).
- **Admin Dashboard**:
  - Global visibility of all bookings across all resources and all users.
  - Modify, reschedule, or cancel any booking (administrative override).
  - Create, update, or deactivate resources in the catalog.

---

### 2.2 Core Engineering Challenges & Technical Specifications

#### Challenge 1: Concurrency Control (35% Weight)
- **The Problem**: Two users click "Book" at the exact same millisecond for "Meeting Room A" between 10:00 AM and 11:30 AM. Without proper concurrency controls, a standard `SELECT check ... INSERT` will encounter a race condition (Time of Check to Time of Use - TOCTOU) and insert both, creating an invalid double-booking.
- **Mandatory Solution**:
  1. **Primary Defense (Database-Level Exclusion Constraint)**: Use PostgreSQL `btree_gist` extension with a GiST exclusion constraint on `(resource_id WITH =, time_range WITH &&)` where status is active (`CANCELLED` bookings excluded). This is mathematically impossible to violate, even across multiple backend container instances.
  2. **Secondary Defense (Serializable Transactions or Row-Level Pessimistic Locking)**: Execute the conflict query and insertion inside a strict ACID transaction using `SELECT ... FOR UPDATE` on the parent resource row, or use `ISOLATION LEVEL SERIALIZABLE`.

#### Challenge 2: Data Integrity & Temporal Consistency
- **UTC Everywhere**:
  - All database columns for booking intervals must use `TIMESTAMPTZ` (PostgreSQL) or UTC Datetime.
  - All API request and response payloads must exchange timestamps in ISO-8601 UTC format (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Frontend parses UTC timestamps and renders them in the user's local browser timezone, eliminating daylight saving time (DST) and timezone shift bugs.
- **Booking Bounds Validation**:
  - Booking `start_time` must be strictly prior to `end_time`.
  - Bookings cannot be made in the past.
  - Bookings must adhere to configurable minimum and maximum booking durations (e.g., min 15 minutes, max 8 hours).

#### Challenge 3: Security & Role-Based Access Control (25% Weight)
- **OIDC & JWT Authentication**:
  - Integration with an OIDC provider (Auth0 or Keycloak).
  - Backend must cryptographically verify incoming Bearer JWT tokens using public key sets (JWKS via RS256 algorithm).
  - Token claims validated: Signature, Expiration (`exp`), Issuer (`iss`), Audience (`aud`).
- **Strict Role Enforcement**:
  - Every API endpoint is protected by role-checking middleware.
  - Roles (`Admin` vs `User`) are extracted directly from the verified JWT claims (e.g., `https://officelink.app/roles` or `realm_access.roles`).
  - **Zero Frontend Trust**: Frontend role state is only used for UI visibility/navigation; backend independently validates every single request.
- **Resource Ownership Verification**:
  - A standard `User` can only view or cancel bookings where `booking.user_id === authenticated_user_id`.
  - An `Admin` can view, edit, or cancel any booking regardless of ownership.

---

## 3. Recommended Architecture & Technology Stack

To score maximum marks across all 5 evaluation criteria, the recommended architecture utilizes proven, industry-standard technologies:

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React.js)"]
        UI["React 18 + Vite + TypeScript"]
        State["TanStack Query (React Query) + Tailwind CSS"]
        AuthClient["Auth0 / OIDC React SDK"]
    end

    subgraph Gateway["Security & Transport"]
        JWT["Bearer JWT (RS256)"]
    end

    subgraph BackendLayer["Backend Layer (Node.js/Express or FastAPI)"]
        AuthMiddleware["JWT JWKS Validator & RBAC Guard"]
        Controller["Booking & Resource Controllers"]
        Service["Booking Engine Service (Concurrency Logic)"]
        Repo["Data Access Layer (Transactions & Locking)"]
    end

    subgraph DB["Database Layer (PostgreSQL)"]
        PG["PostgreSQL 15+"]
        GIST["GiST Exclusion Constraint (tstzrange &&)"]
        ACID["Serializable / Pessimistic Locks"]
    end

    UI --> AuthClient
    UI -- "REST API (JSON / UTC)" --> JWT
    JWT --> AuthMiddleware
    AuthMiddleware --> Controller
    Controller --> Service
    Service --> Repo
    Repo --> PG
    PG --> GIST
    PG --> ACID
```

### Technology Matrix

| Layer | Recommended Choice | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **React.js 18 (Vite + TypeScript)** | Component modularity, strong typing, fast build, easy state management with React Query / Context API, Tailwind CSS for polished UI. |
| **Backend** | **Node.js (TypeScript + Express/Fastify)** or **Python (FastAPI + SQLAlchemy)** | Clean layered architecture, rich ecosystem for JWKS JWT validation (`jwks-rsa`, `jsonwebtoken` or `pyjwt`), native async I/O. |
| **Database** | **PostgreSQL 15+** | Native range types (`tstzrange`), `btree_gist` extension for exclusion constraints (gold standard for double-booking prevention), ACID compliance. |
| **Security** | **Auth0 / Keycloak (RS256 JWT)** | Standards-compliant OpenID Connect, decoupled identity management, cryptographic JWTs. |
| **Testing** | **Jest / Supertest / k6 / Artillery** | Automated concurrent request generation to prove race-condition safety. |

---

## 4. Database Schema Design (PostgreSQL)

To achieve the 35% Data Integrity requirement, the database schema implements PostgreSQL range types and exclusion constraints:

```sql
-- Enable btree_gist extension for combining scalar equality and range overlap
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Enum for Resource Types
CREATE TYPE resource_type AS ENUM ('DESK', 'MEETING_ROOM', 'EQUIPMENT');

-- Enum for Booking Status
CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'CANCELLED');

-- Enum for User Roles
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

-- 1. Users Table (Synchronized or mirrored from OIDC provider)
CREATE TABLE users (
    id VARCHAR(128) PRIMARY KEY, -- OIDC Subject (sub), e.g., 'auth0|64f1...'
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resources Table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- e.g., 'Meeting Room Alpha', 'Desk 104'
    type resource_type NOT NULL,
    capacity INT NOT NULL DEFAULT 1, -- 1 for desks/equipment, >1 for rooms
    location VARCHAR(100) NOT NULL, -- e.g., 'Floor 3 - West Wing'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table with PostgreSQL Range & Exclusion Constraint
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    booking_range TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_time, end_time, '[)')) STORED,
    status booking_status NOT NULL DEFAULT 'CONFIRMED',
    purpose VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_valid_time_interval CHECK (start_time < end_time),
    
    -- Absolute Double-Booking Prevention:
    -- Prevents overlapping active bookings for the same resource
    CONSTRAINT prevent_double_booking 
    EXCLUDE USING gist (
        resource_id WITH =,
        booking_range WITH &&
    ) WHERE (status = 'CONFIRMED')
);

-- Performance Indexes
CREATE INDEX idx_bookings_resource_time ON bookings (resource_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_resources_type ON resources (type) WHERE is_active = TRUE;
```

> [!IMPORTANT]
> **Why the GiST Exclusion Constraint is Essential**:  
> Traditional `SELECT count(*) WHERE ...` checks are vulnerable to race conditions under high concurrency because between the `SELECT` and the `INSERT`, another thread can insert a conflicting booking. The PostgreSQL `EXCLUDE USING gist (resource_id WITH =, booking_range WITH &&)` constraint enforces isolation at the storage engine level, returning error code `23P01` (`exclusion_violation`) whenever two overlapping bookings collide.

---

## 5. Backend Implementation Blueprint

### 5.1 Project Directory Structure (Clean Layered Architecture)

```
backend/
├── src/
│   ├── config/             # Environment, DB pool, Auth0/JWKS config
│   │   ├── database.ts
│   │   └── env.ts
│   ├── middleware/         # Security, JWT auth, RBAC, error handling
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   ├── modules/
│   │   ├── auth/           # User profile sync & claims
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── resources/      # Catalog browsing, filtering, admin CRUD
│   │   │   ├── resource.controller.ts
│   │   │   ├── resource.service.ts
│   │   │   ├── resource.repository.ts
│   │   │   └── resource.dto.ts
│   │   └── bookings/       # Booking engine, concurrency control, dashboards
│   │       ├── booking.controller.ts
│   │       ├── booking.service.ts
│   │       ├── booking.repository.ts
│   │       └── booking.dto.ts
│   ├── utils/              # Time helpers (UTC), logger
│   │   ├── time.util.ts
│   │   └── logger.ts
│   ├── app.ts              # Express application setup
│   └── server.ts           # HTTP server listener
├── tests/
│   ├── unit/               # Timezone math, validation tests
│   ├── integration/        # Auth, RBAC endpoints tests
│   └── concurrency/        # Multi-threaded simultaneous race condition tests
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

### 5.2 Core Backend Logic & Code Snippets

#### 1. JWT Verification & RBAC Middleware (`auth.middleware.ts` & `rbac.middleware.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

const jwksClient = jwksRsa({
  jwksUri: process.env.AUTH0_JWKS_URI || 'https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err || !key) return callback(err || new Error('Public key not found'));
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(
    token,
    getKey,
    {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: process.env.AUTH0_ISSUER,
      algorithms: ['RS256']
    },
    (err, decoded: any) => {
      if (err || !decoded) {
        return res.status(401).json({ error: 'Invalid or expired token', details: err?.message });
      }

      // Extract custom RBAC claims configured in Auth0 Action/Rule
      const rolesClaim = decoded['https://officelink.app/roles'] || decoded['roles'] || [];
      const role = rolesClaim.includes('Admin') ? 'ADMIN' : 'USER';

      req.user = {
        id: decoded.sub,
        email: decoded.email || decoded['https://officelink.app/email'],
        role
      };
      next();
    }
  );
};

// RBAC Guard
export const requireRole = (allowedRoles: Array<'USER' | 'ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};
```

---

#### 2. Atomic Booking Transaction with Concurrency & Conflict Control (`booking.service.ts`)

```typescript
import { pool } from '../config/database';
import { PoolClient } from 'pg';

export class BookingService {
  /**
   * Real-time pre-flight conflict check (read-only query)
   */
  async checkAvailability(resourceId: string, startTimeUTC: string, endTimeUTC: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as conflicts
      FROM bookings
      WHERE resource_id = $1
        AND status = 'CONFIRMED'
        AND tstzrange(start_time, end_time, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
    `;
    const res = await pool.query(query, [resourceId, startTimeUTC, endTimeUTC]);
    return parseInt(res.rows[0].conflicts, 10) === 0;
  }

  /**
   * Commit booking atomically with dual-layer concurrency protection:
   * 1. Pessimistic lock on resource row
   * 2. DB GiST exclusion constraint safety net
   */
  async createBooking(userId: string, resourceId: string, startTimeUTC: string, endTimeUTC: string, purpose?: string) {
    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock the resource row to serialize concurrent booking requests for this resource
      const lockRes = await client.query(
        'SELECT id, is_active FROM resources WHERE id = $1 FOR UPDATE',
        [resourceId]
      );

      if (lockRes.rowCount === 0 || !lockRes.rows[0].is_active) {
        throw { statusCode: 404, message: 'Resource not found or inactive' };
      }

      // 2. Check for overlapping reservations within the locked transaction
      const conflictCheck = await client.query(
        `SELECT id FROM bookings
         WHERE resource_id = $1
           AND status = 'CONFIRMED'
           AND tstzrange(start_time, end_time, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')`,
        [resourceId, startTimeUTC, endTimeUTC]
      );

      if (conflictCheck.rowCount > 0) {
        throw { statusCode: 409, message: 'Resource is already booked for the selected time window' };
      }

      // 3. Insert the new booking
      const insertQuery = `
        INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose, status)
        VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5, 'CONFIRMED')
        RETURNING id, resource_id, user_id, start_time, end_time, status, created_at
      `;
      const result = await client.query(insertQuery, [resourceId, userId, startTimeUTC, endTimeUTC, purpose]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err: any) {
      await client.query('ROLLBACK');
      
      // Catch PostgreSQL Exclusion Constraint Violation (Error 23P01)
      if (err.code === '23P01') {
        throw { statusCode: 409, message: 'Double-booking conflict detected by database constraint' };
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
```

---

### 5.3 REST API Specification

| Method | Endpoint | Auth | Required Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/resources` | Optional / Bearer | Any | List catalog items with filters (`type`, `minCapacity`, `search`) |
| `GET` | `/api/v1/resources/:id` | Bearer | User / Admin | Get detailed resource info |
| `POST` | `/api/v1/resources` | Bearer | **Admin** | Create new resource (room/desk/equipment) |
| `PUT` | `/api/v1/resources/:id` | Bearer | **Admin** | Update resource details or toggle active state |
| `DELETE` | `/api/v1/resources/:id` | Bearer | **Admin** | Deactivate/remove resource |
| `GET` | `/api/v1/bookings/availability` | Bearer | User / Admin | Pre-check availability for a resource and time window |
| `POST` | `/api/v1/bookings` | Bearer | User / Admin | Create atomic booking (enforces conflict checks) |
| `GET` | `/api/v1/bookings/my` | Bearer | User / Admin | List bookings owned by authenticated user |
| `PATCH` | `/api/v1/bookings/:id/cancel` | Bearer | User / Admin | Cancel booking (Users can only cancel their own; Admin can cancel any) |
| `GET` | `/api/v1/admin/bookings` | Bearer | **Admin** | Global listing of all bookings across all users & resources |
| `PUT` | `/api/v1/admin/bookings/:id` | Bearer | **Admin** | Modify/reschedule any booking |

---

## 6. Frontend Implementation Blueprint (React.js)

### 6.1 Frontend Directory Structure

```
frontend/
├── src/
│   ├── api/                # Axios/Fetch client with Bearer token interceptor
│   │   ├── client.ts
│   │   ├── resources.api.ts
│   │   └── bookings.api.ts
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Button, Input, Modal, Alert, Badge
│   │   ├── layout/         # Navbar, Sidebar, Footer, ProtectedRoute
│   │   ├── catalog/        # ResourceCard, ResourceFilter, ResourceGrid
│   │   └── booking/        # TimePicker, ConflictIndicator, BookingModal
│   ├── context/            # AuthContext (OIDC), ThemeContext
│   │   └── AuthContext.tsx
│   ├── hooks/              # Custom hooks (useBookings, useAvailabilityCheck)
│   │   ├── useAvailability.ts
│   │   └── useResources.ts
│   ├── pages/              # Views
│   │   ├── CatalogPage.tsx
│   │   ├── MyBookingsPage.tsx
│   │   ├── AdminDashboardPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── utils/              # Date-fns / Luxon UTC conversion helpers
│   │   └── date.util.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 6.2 Key Frontend UX Implementations

#### 1. Timezone Handling Helper (`date.util.ts`)
```typescript
import { format, parseISO } from 'date-fns';

// Converts local user input date + time string into standard ISO-8601 UTC string for backend
export const toUTCISO = (dateStr: string, timeStr: string): string => {
  const localDate = new Date(`${dateStr}T${timeStr}:00`);
  return localDate.toISOString(); // e.g. "2026-10-28T04:30:00.000Z"
};

// Formats UTC backend timestamp to user-friendly local display
export const formatUTCToLocal = (utcIsoStr: string, formatStr: string = 'PPpp'): string => {
  const parsed = parseISO(utcIsoStr);
  return format(parsed, formatStr);
};
```

#### 2. Real-Time Pre-Commit Conflict Check Hook (`useAvailability.ts`)
```typescript
import { useState, useEffect } from 'react';
import { bookingsApi } from '../api/bookings.api';

export const useAvailability = (resourceId: string, startTimeUTC?: string, endTimeUTC?: string) => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceId || !startTimeUTC || !endTimeUTC) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      setError(null);
      try {
        const available = await bookingsApi.checkAvailability(resourceId, startTimeUTC, endTimeUTC);
        setIsAvailable(available);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to check slot availability');
      } finally {
        setChecking(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [resourceId, startTimeUTC, endTimeUTC]);

  return { isAvailable, checking, error };
};
```

#### 3. Role-Guarded Route Component (`ProtectedRoute.tsx`)
```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'USER';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Verifying credentials...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRole === 'ADMIN' && user?.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

---

## 7. Concurrency & Race Condition Verification (35% Weight)

To convincingly satisfy the **35% Data Integrity** evaluation criterion, include an automated concurrency test script in the submission. This script fires simultaneous overlapping booking requests against the same resource.

### Concurrency Stress Test Script (`tests/concurrency/race-condition.test.ts`)

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';
const RESOURCE_ID = '00000000-0000-0000-0000-000000000001'; // Target resource
const START_TIME = '2026-10-28T10:00:00.000Z';
const END_TIME = '2026-10-28T11:30:00.000Z';

// Mock tokens or real test tokens for 10 concurrent requests
async function runConcurrencyTest() {
  console.log('⚡ Starting Concurrency Race Condition Test...');
  console.log(`Target Resource: ${RESOURCE_ID} | Slot: 10:00 - 11:30 UTC\n`);

  const NUM_REQUESTS = 10;
  const requests = Array.from({ length: NUM_REQUESTS }, (_, i) => {
    return axios.post(
      `${API_URL}/bookings`,
      {
        resourceId: RESOURCE_ID,
        startTime: START_TIME,
        endTime: END_TIME,
        purpose: `Concurrent Test Slot User #${i + 1}`
      },
      {
        headers: { Authorization: `Bearer ${process.env.TEST_JWT_TOKEN}` },
        validateStatus: () => true // Prevent axios from throwing on non-2xx
      }
    );
  });

  // Launch all 10 requests at the exact same instant
  const responses = await Promise.all(requests);

  const succeeded = responses.filter(r => r.status === 201);
  const conflicts = responses.filter(r => r.status === 409);
  const others = responses.filter(r => r.status !== 201 && r.status !== 409);

  console.log('--- TEST RESULTS ---');
  console.log(`Total Requests Sent : ${NUM_REQUESTS}`);
  console.log(`Successful Bookings : ${succeeded.length} (Expected: exactly 1)`);
  console.log(`Conflict Rejections : ${conflicts.length} (Expected: exactly 9)`);
  console.log(`Other Unexpected   : ${others.length} (Expected: 0)`);

  if (succeeded.length === 1 && conflicts.length === NUM_REQUESTS - 1) {
    console.log('\n✅ PASS: Concurrency control proved! Zero double-bookings occurred.');
    process.exit(0);
  } else {
    console.error('\n❌ FAIL: Race condition detected! Multiple bookings allowed or unhandled error.');
    process.exit(1);
  }
}

runConcurrencyTest();
```

---

## 8. Step-by-Step Project Execution Roadmap

Follow these 8 steps to construct, verify, and document the Office Link project from zero to complete submission:

### Step 1: Initialize Workspace & Repositories
1. Create a root directory containing `/backend`, `/frontend`, `/docs`, and orchestration files.
2. Initialize Git repository: `git init`.
3. Create `.gitignore` ignoring `node_modules/`, `.env`, `dist/`, `coverage/`.

### Step 2: Docker Compose Orchestration Setup
Create `docker-compose.yml` to spin up PostgreSQL with the `btree_gist` extension pre-enabled:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: officelink_db
    environment:
      POSTGRES_USER: officelink_user
      POSTGRES_PASSWORD: officelink_password
      POSTGRES_DB: officelink_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/src/database/init.sql:/docker-entrypoint-initdb.d/init.sql
volumes:
  pgdata:
```

### Step 3: Database Migration & Schema Seeding
1. Execute the DDL schema with `btree_gist` and `prevent_double_booking` exclusion constraint.
2. Seed initial data:
   - 3 Meeting Rooms (Alpha, Beta, Executive Boardroom)
   - 5 Desks (Desk 101 to Desk 105)
   - 2 Equipment items (4K Projector, VR Test Kit)
   - 1 Admin user and 2 Standard users.

### Step 4: Backend Implementation
1. Configure database connection pool with transaction support.
2. Implement Auth0/Keycloak JWKS RS256 token verification middleware.
3. Implement RBAC authorization guard for `Admin` and `User`.
4. Implement `ResourceController` and `ResourceService` for catalog operations.
5. Implement `BookingController` and `BookingService` containing the **Pessimistic Lock + GiST constraint** double-booking prevention.
6. Implement the pre-flight conflict check endpoint `/api/v1/bookings/availability`.

### Step 5: Frontend Implementation
1. Initialize React + Vite + TypeScript: `npm create vite@latest frontend -- --template react-ts`.
2. Configure Tailwind CSS for modern styling.
3. Set up Auth0 React SDK (`@auth0/auth0-react`) or custom OIDC provider wrapper.
4. Build the **Resource Catalog**:
   - Filter chips for Desks, Meeting Rooms, Equipment.
   - Resource search by name/location.
5. Build the **Booking Modal**:
   - Date picker and start/end time block selectors (e.g. 10:00 AM–11:30 AM).
   - Dynamic real-time conflict badge (Green: "Available", Red: "Slot Occupied").
   - Error toast handling `409 Conflict` gracefully.
6. Build **My Bookings Dashboard**:
   - Card list of bookings with time formatted in local timezone.
   - One-click cancellation with confirmation prompt.
7. Build **Admin Dashboard**:
   - Table of all reservations across all users.
   - Capability to cancel or modify any reservation.

### Step 6: Concurrency & Unit Testing
1. Run the automated concurrency test script (`race-condition.test.ts`) with 10 simultaneous requests.
2. Confirm exactly 1 succeeds and 9 receive `409 Conflict`.
3. Add unit tests verifying UTC normalization (handling DST offsets).
4. Add RBAC tests ensuring standard users cannot access admin endpoints.

### Step 7: Environment Configuration
Create `.env.example` in both backend and frontend directories:
```env
# Backend .env.example
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://officelink_user:officelink_password@localhost:5432/officelink_db
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.officelink.com
AUTH0_ISSUER=https://your-tenant.auth0.com/
AUTH0_JWKS_URI=https://your-tenant.auth0.com/.well-known/jwks.json

# Frontend .env.example
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id_here
VITE_AUTH0_AUDIENCE=https://api.officelink.com
```

### Step 8: Documentation & Final Submission Preparation
1. Draft comprehensive `README.md` containing:
   - Quickstart guide with Docker Compose.
   - Architectural Decisions (ADR) justifying PostgreSQL GiST constraints and layered architecture.
   - Concurrency strategy explanation with test execution instructions.
   - AI Disclosure statement.
2. Push code to a public/private Git repository.

---

## 9. Submission Deliverables & Evaluation Readiness Checklist

| Deliverable | Checklist Item | Status |
| :--- | :--- | :---: |
| **Git Repository** | Clean commit history, sensible branch names, `.gitignore` active | [ ] |
| **Data Integrity (35%)** | GiST exclusion constraint active in PostgreSQL DDL | [ ] |
| | Pessimistic / serializable transaction around booking insertion | [ ] |
| | All dates/times stored in UTC `TIMESTAMPTZ` | [ ] |
| | Automated concurrency test script included and passing (1 success, N conflicts) | [ ] |
| **Security (25%)** | OIDC Bearer token RS256 JWKS verification on all protected routes | [ ] |
| | Admin privileges validated via verified JWT claims, not frontend state | [ ] |
| | Ownership check prevents users from cancelling other users' bookings | [ ] |
| **Code Architecture (20%)** | Clean layered architecture (Controllers, Services, Repositories) | [ ] |
| | Centralized error handling middleware with proper HTTP status codes | [ ] |
| | DTO validation (Joi, Zod, or class-validator) on all request payloads | [ ] |
| **Frontend UX (10%)** | Intuitive time block selection (10:00 AM–11:30 AM) | [ ] |
| | Real-time conflict feedback before submission | [ ] |
| | Clean error toasts on conflict/network issues | [ ] |
| **Documentation (10%)** | `README.md` with zero-friction setup commands | [ ] |
| | Architectural Decisions (ADR) section explaining concurrency choices | [ ] |
| | AI Disclosure section specifying tools and prompts used | [ ] |
| | `.env.example` provided with zero committed secrets | [ ] |
