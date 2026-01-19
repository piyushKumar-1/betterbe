# BetterBe API

Rust backend for BetterBe habit tracking app with social auth and sharing features.

## Features

- 🔐 **Social Authentication**: Google OAuth and Apple Sign In
- 📊 **Full CRUD API**: Habits, Goals, Check-ins
- 🤝 **Shared Goals**: Collaborate with friends on goals
- ☁️ **Cloud Sync**: Optional cloud backup (privacy-respecting)
- 🔒 **Privacy First**: Local-first by default, cloud opt-in

## Tech Stack

- **Framework**: Axum (async Rust web framework)
- **Database**: PostgreSQL with SQLx
- **Auth**: JWT tokens with OAuth2 providers
- **Runtime**: Tokio async runtime

## Getting Started

### Prerequisites

- Rust 1.75+ (install via [rustup](https://rustup.rs/))
- PostgreSQL 14+
- OAuth credentials (Google, Apple)

### Setup

1. **Clone and enter backend directory**:
   ```bash
   cd backend
   ```

2. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

3. **Configure `.env`** with your database and OAuth credentials.

4. **Create database**:
   ```bash
   createdb betterbe
   ```

5. **Run migrations** (happens automatically on start, or manually):
   ```bash
   sqlx migrate run
   ```

6. **Start the server**:
   ```bash
   cargo run
   ```

   Server runs on `http://localhost:3000`

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/apple` - Get Apple Sign In config
- `POST /auth/apple/callback` - Apple Sign In callback
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile

### Habits
- `GET /api/habits` - List user's habits
- `POST /api/habits` - Create habit
- `GET /api/habits/:id` - Get habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `PUT /api/habits/:id/reminder` - Update reminder settings

### Check-ins
- `GET /api/checkins` - List check-ins (with date filters)
- `POST /api/checkins` - Create/update check-in
- `GET /api/checkins/date/:date` - Get check-ins for date
- `PUT /api/checkins/:id` - Update check-in
- `DELETE /api/checkins/:id` - Delete check-in

### Goals
- `GET /api/goals` - List user's goals
- `POST /api/goals` - Create goal
- `GET /api/goals/:id` - Get goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `GET /api/goals/:id/habits` - Get linked habits
- `POST /api/goals/:id/habits` - Link habit to goal
- `DELETE /api/goals/:id/habits/:habit_id` - Unlink habit

### Sharing
- `GET /api/sharing/goals` - List shared goals
- `POST /api/sharing/goals/:goal_id/share` - Share a goal
- `GET /api/sharing/goals/:id` - Get shared goal details
- `DELETE /api/sharing/goals/:id` - Unshare goal
- `POST /api/sharing/goals/:id/invite` - Invite user by email
- `POST /api/sharing/join` - Join by invite code
- `POST /api/sharing/goals/:id/leave` - Leave shared goal
- `GET /api/sharing/goals/:id/activity` - Activity feed

### Sync
- `GET /api/sync/status` - Get sync status
- `POST /api/sync/enable` - Enable cloud sync
- `POST /api/sync/disable` - Disable cloud sync
- `POST /api/sync/push` - Push local data to cloud
- `GET /api/sync/pull` - Pull cloud data

## Development

```bash
# Run with hot reload
cargo watch -x run

# Run tests
cargo test

# Check types
cargo check

# Format code
cargo fmt

# Lint
cargo clippy
```

## Docker Deployment

The easiest way to run the backend is with Docker Compose:

```bash
# From the project root
cd ..

# Start everything (PostgreSQL + API)
make up

# Or manually:
docker-compose up -d

# Check logs
make logs

# Stop
make down
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:3000 | Main API server |
| Health | http://localhost:3000/health | Health check endpoint |
| PostgreSQL | localhost:5432 | Database |
| pgAdmin | http://localhost:5050 | DB management (optional) |

### Start with Database Tools

```bash
make db-tools
# or
docker-compose --profile tools up -d
```

### Environment Variables

Copy `env.docker.example` to `.env` in the project root:

```bash
cp backend/env.docker.example .env
# Edit .env with your settings
```

Key variables:
- `JWT_SECRET` - **CHANGE THIS** in production
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `APPLE_*` - For Apple Sign In

### Building Manually

```dockerfile
# Build the image
docker build -t betterbe-api:latest ./backend

# Run with environment
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  betterbe-api:latest
```

## License

MIT

