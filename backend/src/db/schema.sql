-- ============================================================================
-- Office Link Database Schema (SQLite / Embedded Engine)
-- Fully ACID compliant with immediate serialized transactions for concurrency
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Users Table (Synchronized with OIDC / JWT claims)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')) DEFAULT 'USER',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Resources Catalog Table
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DESK', 'MEETING_ROOM', 'EQUIPMENT')),
    capacity INTEGER NOT NULL DEFAULT 1,
    location TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = inactive
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_time TEXT NOT NULL, -- UTC ISO 8601 string, e.g., '2026-10-28T10:00:00.000Z'
    end_time TEXT NOT NULL,   -- UTC ISO 8601 string, e.g., '2026-10-28T11:30:00.000Z'
    status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')) DEFAULT 'CONFIRMED',
    purpose TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (start_time < end_time)
);

-- Performance Indexes for Real-time Conflict Queries
CREATE INDEX IF NOT EXISTS idx_bookings_resource_window 
ON bookings (resource_id, status, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_bookings_user 
ON bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_resources_type 
ON resources (type, is_active);
