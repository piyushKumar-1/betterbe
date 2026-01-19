-- BetterBe Database Schema
-- Initial migration

-- Custom types (idempotent)
DO $$ BEGIN
    CREATE TYPE auth_provider AS ENUM ('google', 'apple');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE habit_type AS ENUM ('binary', 'numeric');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE target_direction AS ENUM ('at_least', 'at_most', 'exactly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'failed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE reminder_type AS ENUM ('interval', 'daily', 'random');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE share_role AS ENUM ('owner', 'collaborator', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('check_in', 'streak_milestone', 'goal_progress', 'joined_goal', 'encouragement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    provider auth_provider NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    cloud_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    habit_type habit_type NOT NULL DEFAULT 'binary',
    unit VARCHAR(50),
    target_value INTEGER,
    target_direction target_direction NOT NULL DEFAULT 'at_least',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(user_id, archived);

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value INTEGER NOT NULL,
    note TEXT,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (habit_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_habit ON check_ins(habit_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON check_ins(user_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON check_ins(habit_id, effective_date);

-- Habit reminders table
CREATE TABLE IF NOT EXISTS habit_reminders (
    id UUID PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_type reminder_type NOT NULL DEFAULT 'daily',
    interval_hours INTEGER,
    daily_time VARCHAR(5), -- HH:MM format
    random_window_start VARCHAR(5),
    random_window_end VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATE NOT NULL,
    status goal_status NOT NULL DEFAULT 'active',
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(user_id, status);

-- Goal-Habit linking table
CREATE TABLE IF NOT EXISTS goal_habits (
    id UUID PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    weight REAL NOT NULL DEFAULT 1.0,
    UNIQUE (goal_id, habit_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_habits_goal ON goal_habits(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_habits_habit ON goal_habits(habit_id);

-- Shared goals table
CREATE TABLE IF NOT EXISTS shared_goals (
    id UUID PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE UNIQUE,
    created_by UUID NOT NULL REFERENCES users(id),
    invite_code VARCHAR(16) NOT NULL UNIQUE,
    max_participants INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_goals_code ON shared_goals(invite_code);

-- Goal participants table
CREATE TABLE IF NOT EXISTS goal_participants (
    id UUID PRIMARY KEY,
    shared_goal_id UUID NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role share_role NOT NULL DEFAULT 'collaborator',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shared_goal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_goal ON goal_participants(shared_goal_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON goal_participants(user_id);

-- Goal invites table
CREATE TABLE IF NOT EXISTS goal_invites (
    id UUID PRIMARY KEY,
    shared_goal_id UUID NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id),
    invitee_email VARCHAR(255) NOT NULL,
    status invite_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_email ON goal_invites(invitee_email, status);

-- Shared activities (activity feed)
CREATE TABLE IF NOT EXISTS shared_activities (
    id UUID PRIMARY KEY,
    shared_goal_id UUID NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type activity_type NOT NULL,
    habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
    check_in_id UUID REFERENCES check_ins(id) ON DELETE SET NULL,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_goal ON shared_activities(shared_goal_id, created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON habit_reminders;
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON habit_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
