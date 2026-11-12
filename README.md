# Real-Time Chat Application

A full-stack real-time chat application built with **React** and **Node.js + Express** using **Server-Sent Events (SSE)** for live updates. No external databases, auth libraries, or third-party real-time frameworks — everything is built from scratch.

## Features

- **Group rooms and direct messages** — Create channels or start private conversations
- **Real-time messaging** — Instant message delivery via SSE (Server-Sent Events)
- **Online indicators** — See who is currently online
- **Typing indicators** — See when someone is typing
- **Emoji reactions** — React to messages with emojis (👍 ❤️ 😂 😮 😢 🔥)
- **Message history with pagination** — Load older messages on demand
- **Unread counts** — Badge showing unread message count per room
- **Optimistic sends** — Messages appear instantly before server confirmation
- **Auto-reconnection** — SSE automatically reconnects on disconnect
- **Authentication** — Login/register with session-based auth using Node's built-in crypto

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + hooks + Context | Vite as build tool |
| Backend | Node.js + Express | express.json(), express.static() |
| Data | In-memory arrays | Seeded with sample data |
| Auth | Node crypto + session map | No JWT or bcrypt |
| Live updates | Server-Sent Events | No Socket.IO |
| Charts/DnD | N/A | Not needed for this project |
| Testing | node:test + fetch | No Jest or Postman |

## Project Structure

```
real-time-chat/
├── server/
│   ├── index.js            # Express server entry point
│   ├── data/
│   │   └── store.js        # In-memory data store with seed data
│   ├── middleware/
│   │   └── auth.js         # Auth middleware & error handler
│   ├── routes/
│   │   ├── auth.js         # Login, register, logout, me
│   │   └── chat.js         # Rooms, messages, typing, reactions, SSE
│   └── package.json
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx         # React entry point
│       ├── App.jsx          # Root component with auth routing
│       ├── index.css        # All styles
│       ├── api.js           # API client (fetch wrapper)
│       ├── context/
│       │   ├── AuthContext.jsx   # Authentication state
│       │   └── ChatContext.jsx   # Chat state & SSE connection
│       ├── components/
│       │   ├── Sidebar.jsx       # Room list, online users
│       │   ├── MessageArea.jsx   # Messages, input, typing indicator
│       │   ├── Message.jsx       # Individual message with reactions
│       │   └── NewRoomModal.jsx  # Create channel or start DM
│       └── pages/
│           ├── Login.jsx         # Login/Register page
│           └── ChatPage.jsx      # Main chat interface
├── tests/
│   └── api.test.js          # API tests with node:test
├── package.json             # Root scripts
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies (server + client)
npm run install:all
```

### Development

```bash
# Terminal 1: Start the Express server
npm run dev:server

# Terminal 2: Start the Vite dev server
npm run dev:client
```

The app will be available at `http://localhost:5173`

### Production Build

```bash
# Build the client
npm run build

# Start the server (serves both API and static files)
npm start
```

The app will be available at `http://localhost:3001`

### Running Tests

```bash
# Make sure the server is running first (npm run dev:server), then:
npm test
```

## Demo Accounts

Three sample users are pre-seeded:

| Username | Password |
|----------|----------|
| alice    | password123 |
| bob      | password123 |
| charlie  | password123 |

You can also register new accounts through the UI.

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login with username/password |
| POST | `/api/auth/logout` | Yes | Logout and end session |
| GET | `/api/auth/me` | Yes | Get current user info |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chat/stream` | Yes | SSE stream for real-time events |
| GET | `/api/chat/rooms` | Yes | Get user's rooms |
| POST | `/api/chat/rooms` | Yes | Create a group room |
| POST | `/api/chat/rooms/dm` | Yes | Create/get DM room |
| GET | `/api/chat/users` | Yes | Get all users |
| GET | `/api/chat/online` | Yes | Get online users |
| GET | `/api/chat/rooms/:id/messages` | Yes | Get messages (paginated) |
| POST | `/api/chat/rooms/:id/messages` | Yes | Send a message |
| POST | `/api/chat/rooms/:id/messages/:mid/react` | Yes | Add/remove reaction |
| POST | `/api/chat/rooms/:id/typing` | Yes | Set typing indicator |
| POST | `/api/chat/rooms/:id/typing/clear` | Yes | Clear typing indicator |
| GET | `/api/chat/unread` | Yes | Get unread counts |
| POST | `/api/chat/rooms/:id/members` | Yes | Add member to room |

### SSE Events

| Event | Description |
|-------|-------------|
| `init` | Initial state (rooms, online users, unread counts) |
| `message:new` | New message in a room |
| `room:created` | New room created |
| `room:updated` | Room updated (member added) |
| `typing` | User started typing |
| `message:reaction` | Reaction added/removed |

## Design Decisions

1. **SSE over WebSocket** — Using Server-Sent Events instead of Socket.IO as specified. Simpler, works with standard HTTP, and sufficient for real-time chat.

2. **Session-based auth** — Using `crypto.randomBytes()` for tokens and an in-memory `Map` instead of JWT/bcrypt. Passwords are hashed with `crypto.createHash('sha256')`.

3. **In-memory data** — All data stored in arrays/objects inside the Express server, seeded with sample users, rooms, and messages.

4. **Optimistic UI** — Messages appear instantly when sent, with server confirmation replacing the optimistic version.

5. **Hand-built UI** — All components built with React hooks and Context. No Redux, no React Router — just state-based views.

6. **No external middleware** — Only `express.json()` and `express.static()` from Express. Custom middleware for auth and error handling.

## Manual Test Checklist

- [ ] Register a new account
- [ ] Login with existing accounts (alice, bob, charlie)
- [ ] View existing group rooms and DMs
- [ ] Send a message in a group room
- [ ] Open another browser tab with a different user
- [ ] Verify real-time message delivery
- [ ] Start a new DM conversation
- [ ] Create a new group channel
- [ ] React to a message with an emoji
- [ ] See typing indicators
- [ ] Check online/offline status
- [ ] Verify unread count badges
- [ ] Logout and verify session ends
- [ ] Test pagination (load older messages)
- [ ] Run API tests (`npm test`)
