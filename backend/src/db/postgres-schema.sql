-- ============================================================================
-- Office Link PostgreSQL Schema
-- Uses btree_gist extension and GiST Exclusion Constraints for 
-- hardware/engine-level double-booking prevention.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE resource_type AS ENUM ('DESK', 'MEETING_ROOM', 'EQUIPMENT');
CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type resource_type NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    location VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table with PostgreSQL Range & Exclusion Constraint
CREATE TABLE IF NOT EXISTS bookings (
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

    CONSTRAINT check_valid_time_interval CHECK (start_time < end_time),
    
    -- Absolute Double-Booking Prevention at Storage Engine Level
    CONSTRAINT prevent_double_booking 
    EXCLUDE USING gist (
        resource_id WITH =,
        booking_range WITH &&
    ) WHERE (status = 'CONFIRMED')
);

CREATE INDEX IF NOT EXISTS idx_pg_bookings_resource_time ON bookings (resource_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_pg_bookings_user ON bookings (user_id);
