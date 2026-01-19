# BetterBe

**Analytics-first habit & goal tracker** — A beautiful, privacy-focused PWA that helps you build better habits through data-driven insights.

![Today Page](screenshots/today.png)

## ✨ Features

### 📊 Habit Tracking
- **Multiple habit types**: Binary (yes/no), Numeric (count), Duration (minutes), Scale (1-10)
- **Inline stepper controls** for quick numeric updates
- **Target values** with flexible goal directions (at least, at most, exactly)
- **Daily trend charts** showing your progress over time

### 🎯 Goal Management
- **Multi-habit goals** — Link multiple habits to a single goal
- **Visual sparklines** showing trend at a glance
- **Smart status indicators**: On Track, Making Progress, Losing Momentum, Just Started
- **Quick actions** for overdue goals: Mark Achieved or Extend deadline

### 📈 Analytics
- **Momentum tracking** — See if you're improving or declining
- **Streak counters** — Current and best streaks
- **Rolling averages** — 7, 14, and 30-day performance
- **Activity heatmaps** — GitHub-style visualization

### 🔒 Privacy First
- **Local-first by default** — All data stays on your device
- **Optional cloud sync** — Opt-in for backup & sharing (requires backend)
- **No accounts required** — Works immediately without sign-in
- **Offline-first PWA** — Works without internet
- **Export/Import** — JSON backup, CSV for spreadsheets

## Screenshots

| Today | Habits | Goals | Settings |
|-------|--------|-------|----------|
| ![Today](screenshots/today.png) | ![Habits](screenshots/habits.png) | ![Goals](screenshots/goals.png) | ![Settings](screenshots/settings.png) |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (22+ for Capacitor builds)
- npm or pnpm
- Docker & Docker Compose (for backend)

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/piyushKumar-1/betterbe.git
cd betterbe

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Setup (Optional - for cloud sync & sharing)

1. **Create environment file:**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your credentials:
   # - JWT_SECRET (generate with: openssl rand -base64 32)
   # - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (from Google Cloud Console)
   # - GOOGLE_REDIRECT_URI (http://localhost:5173/auth/google/callback)
   ```

2. **Start backend services:**
   ```bash
   docker-compose up -d
   ```

3. **Verify backend is running:**
   ```bash
   curl http://localhost:3000/health
   # Should return: OK
   ```

The backend API will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## 🛠 Tech Stack

### Frontend
- **Framework**: SvelteKit 2.0 with Svelte 5 (Runes)
- **Database**: IndexedDB via Dexie.js (local-first)
- **Styling**: Custom CSS with CSS variables
- **Icons**: Lucide Svelte
- **PWA**: @vite-pwa/sveltekit

### Backend (Optional)
- **Language**: Rust with Axum
- **Database**: PostgreSQL
- **Auth**: OAuth 2.0 (Google Sign In)
- **Deployment**: Docker Compose

## 📱 Install as App

BetterBe is a Progressive Web App (PWA). To install:

1. Open the app in Chrome/Safari
2. Click "Add to Home Screen" or install prompt
3. Enjoy native-like experience!

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

Built with ❤️ for habit builders everywhere
