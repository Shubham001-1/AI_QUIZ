# QuizAI — AI-Powered Live Quiz Platform

> A full-stack, production-ready real-time quiz platform powered by Google Gemini AI. Generate quizzes on any topic, host live games, and compete with friends — with real-time leaderboards, anti-cheat systems, and streak bonuses.

![QuizAI Banner](https://img.shields.io/badge/QuizAI-AI--Powered%20Quizzes-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-ioredis-DC382D?style=flat-square&logo=redis)

---

## 🚀 Features

- **AI Question Generation** — Enter any topic; Gemini generates 10 perfect quiz questions
- **Real-Time Gameplay** — Socket.io keeps all players perfectly in sync
- **Live Leaderboard** — Redis sorted sets update every 2 seconds
- **Speed + Streak Scoring** — Faster answers and consecutive correct answers give bonus points (up to 3×)
- **Anti-Cheat** — Tab switch detection, answer lock, and server-side time validation
- **JWT Auth** — Hosts register/login; guest players just need a nickname
- **Confetti & Podium** — Spectacular end-game screen with top 3 podium and animations

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     CLIENT (React)                   │
│  Home → Register/Login → Host / Play → Leaderboard  │
│  Socket.io client (singleton) + Axios HTTP           │
└────────────────────────┬────────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────▼────────────────────────────┐
│               SERVER (Express + Socket.io)           │
│  /api/auth    → authController (JWT + bcrypt)        │
│  /api/quiz    → quizController (generate, get, hist) │
│  Socket.io    → gameHandlers (full game lifecycle)   │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
┌──────────▼──────────┐  ┌────────────▼──────────────┐
│   MongoDB (Mongoose) │  │    Redis (ioredis)         │
│   Users + Quizzes    │  │    Sorted set leaderboard  │
│   Final leaderboard  │  │    Streaks, answered sets  │
└─────────────────────┘  └───────────────────────────┘
           │
┌──────────▼──────────┐
│  Google Gemini AI    │
│  gemini-1.5-flash    │
│  10-question gen     │
└─────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Cache / Leaderboard | Redis + ioredis |
| Real-Time | Socket.io (server + client) |
| AI | Google Gemini API (`gemini-1.5-flash`) |
| Auth | JWT + bcryptjs |

---

## 📁 Project Structure

```
quiz_prototype/
├── docker-compose.yml         # MongoDB + Redis services
├── README.md
│
├── server/
│   ├── server.js              # Entry point
│   ├── .env.example
│   ├── package.json
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── redis.js           # Redis connection
│   ├── models/
│   │   ├── User.js
│   │   └── Quiz.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── quizRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── quizController.js
│   ├── services/
│   │   ├── geminiService.js
│   │   └── redisService.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── socket/
│       └── gameHandlers.js
│
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── socket.js
        ├── index.css
        ├── hooks/
        │   └── useSocket.js
        ├── components/
        │   ├── Navbar.jsx
        │   ├── QuestionCard.jsx
        │   ├── LiveLeaderboard.jsx
        │   └── PlayerList.jsx
        └── pages/
            ├── Home.jsx
            ├── Register.jsx
            ├── Login.jsx
            ├── Host.jsx
            ├── Play.jsx
            └── Leaderboard.jsx
```

---

## ⚙️ Setup Instructions

### Prerequisites

- **Node.js** ≥ 18.x
- **Docker** (for MongoDB + Redis) — or install them locally
- **Google Gemini API Key** — get one at https://makersuite.google.com/app/apikey

---

### Step 1: Start MongoDB + Redis

```bash
# From the project root
docker-compose up -d
```

This starts:
- **MongoDB** on `localhost:27017`
- **Redis** on `localhost:6379`

---

### Step 2: Set Up the Server

```bash
cd server

# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/quizai
JWT_SECRET=some-long-random-secret-change-this
GEMINI_API_KEY=your_actual_gemini_api_key_here
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
```

```bash
# Start the server in development mode
npm run dev
```

The server will be available at `http://localhost:5000`.

---

### Step 3: Set Up the Client

```bash
cd client

# Install dependencies
npm install

# Copy env file
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

```bash
# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🎮 How to Play

### As a Host:
1. Register or log in
2. Go to **Host a Quiz**
3. Enter a topic (e.g., "Python basics")
4. Click **Generate Quiz with AI** — wait ~5 seconds for Gemini
5. Share the 6-character **Room Code** with players
6. Click **Start Game** when everyone has joined
7. Click **Next Question** between rounds
8. **Show Final Results** ends the game

### As a Player:
1. Go to `http://localhost:5173/play`
2. Enter the Room Code + a Nickname
3. Wait in lobby for host to start
4. Answer questions before the 20-second timer runs out
5. Faster = more points. Streak bonuses for consecutive correct answers!

---

## 📡 Socket.io Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `HOST_JOIN_ROOM` | `{ roomCode, userId, userName }` | Host joins their room after quiz creation |
| `PLAYER_JOIN_ROOM` | `{ roomCode, nickname }` | Player joins with a nickname |
| `START_GAME` | `{ roomCode }` | Host starts the game (host only) |
| `SUBMIT_ANSWER` | `{ roomCode, userId, selectedOption, timeLeft }` | Player submits an answer |
| `NEXT_QUESTION` | `{ roomCode }` | Host advances to next question |
| `END_GAME` | `{ roomCode }` | Host ends the game manually |
| `TAB_SWITCH_DETECTED` | `{ userId, roomCode }` | Anti-cheat: client reports tab switch |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `ROOM_JOINED` | `{ roomCode, players[], userId }` | Confirms join, returns player list |
| `PLAYER_JOINED` | `{ players[] }` | Broadcast when anyone joins lobby |
| `GAME_STARTED` | — | Signals game is beginning |
| `NEW_QUESTION` | `{ question, questionIndex, totalQuestions, timeLimit }` | Next question (no correct answer) |
| `ANSWER_RESULT` | `{ correct, pointsEarned, totalScore, correctOptionIndex }` | Sent only to answering player |
| `TIME_UP` | `{ correctOptionIndex, questionIndex }` | 20-second timer expired |
| `LEADERBOARD_UPDATE` | `{ leaderboard[] }` | Top 10 scores, every 2 seconds |
| `GAME_OVER` | `{ finalLeaderboard[] }` | Game ended, full results |
| `HOST_DISCONNECTED` | `{ message }` | Host left the game |
| `TAB_SWITCH_WARNING` | `{ message }` | First tab-switch warning |
| `TAB_SWITCH_PENALTY` | `{ message, deduction, totalScore }` | -50pts on second offense |
| `ERROR` | `{ message }` | General error message |

---

## 🧮 Scoring Formula

```
streak = consecutive correct answers (auto-incremented in Redis)
streakMultiplier = min(streak, 3)          // max 3×
timeFraction = timeLeft / 20               // 1.0 = answered instantly
pointsEarned = round(basePoints × streakMultiplier × timeFraction)
```

- **Base points**: 100 per question
- **Max possible**: 100 × 3 × 1 = **300 points** per question (instant answer, 3× streak)
- **Wrong answer**: streak resets to 0

---

## 🛡️ Anti-Cheat System

| Feature | Implementation |
|---------|---------------|
| Tab switch detection | `visibilitychange` event → `TAB_SWITCH_DETECTED` socket event |
| Tab switch penalty | 1st offense: warning; 2nd+: -50 pts |
| Answer lock | Redis `SADD quiz:answered:{roomCode}:{qIndex} userId` — prevents double submit |
| Time validation | Server tracks `questionStartTime`; rejects implausible `timeLeft` values |

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login user |

### Quiz
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/quiz/generate` | JWT Required | Generate AI quiz |
| GET | `/api/quiz/:roomCode` | Public | Get quiz by room code |
| GET | `/api/quiz/history/:userId` | JWT Required | Get host's quiz history |

---

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Remove all data (⚠️ destructive)
docker-compose down -v
```

---

## 📝 Environment Variables

### Server (`server/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/quizai` |
| `JWT_SECRET` | Secret for JWT signing | *(required)* |
| `GEMINI_API_KEY` | Google Gemini API key | *(required)* |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |

### Client (`client/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000` |
| `VITE_SOCKET_URL` | Socket.io server URL | `http://localhost:5000` |

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT © QuizAI
