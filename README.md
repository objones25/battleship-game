# Battleship Game

A real-time multiplayer Battleship game built with React, TypeScript, Node.js, and Socket.io.

## Features

- **Real-time multiplayer gameplay** using WebSocket connections
- **JWT-based authentication** with secure HTTP-only cookies
- **Persistent game state** - maintains user session across page refreshes
- **Interactive game board** with ship placement and attack mechanics
- **Room-based matchmaking** system
- **Automatic room cleanup** to prevent memory leaks
- **Responsive design** with Tailwind CSS
- **Type-safe development** with TypeScript throughout
- **Comprehensive testing** with Jest

## Technology Stack

### Frontend

- **React 19** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time communication
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **Socket.io** - Real-time bidirectional communication
- **Jest** - Testing framework
- **CORS** - Cross-origin resource sharing

## Project Structure

```text
battleship/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── sockets/        # Socket.io handlers
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── tests/              # Test files
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API and socket services
│   │   ├── styles/         # CSS files
│   │   └── types/          # TypeScript type definitions
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/objones25/battleship-game.git
   cd battleship-game
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

### Development

1. **Start the backend server**

   ```bash
   cd backend
   npm run dev
   ```

   The backend will run on `http://localhost:3001`

2. **Start the frontend development server**

   ```bash
   cd frontend
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

### Building for Production

1. **Build the backend**

   ```bash
   cd backend
   npm run build
   ```

2. **Build the frontend**

   ```bash
   cd frontend
   npm run build
   ```

3. **Start the production server**

   ```bash
   cd backend
   npm start
   ```

### Testing

#### Run backend tests

```bash
cd backend
npm test
```

#### Run tests with coverage

```bash
cd backend
npm run test:coverage
```

#### Run tests in watch mode

```bash
cd backend
npm run test:watch
```

## Authentication System

The game uses a robust JWT-based authentication system with the following features:

### Security Features

- **HTTP-only cookies** - JWT tokens stored securely to prevent XSS attacks
- **Automatic socket reconnection** - Seamless authentication after login/registration
- **Token validation** - Server-side JWT verification for all protected routes
- **Session persistence** - User state maintained across page refreshes

### Authentication Flow

1. User registers/logs in via REST API
2. Server sets HTTP-only cookie with JWT token
3. Socket connection automatically authenticates using cookie
4. User can join rooms and play games with verified identity

### Recent Improvements

- **Fixed JWT malformed errors** - Enhanced cookie parsing logic
- **Improved socket authentication** - Robust token extraction from cookies
- **Added automatic reconnection** - Socket reconnects after login with auth cookies
- **Enhanced debugging** - Comprehensive logging for troubleshooting

## Game Rules

1. Each player places 5 ships on their 10x10 grid:

   - Carrier (5 squares)
   - Battleship (4 squares)
   - Cruiser (3 squares)
   - Submarine (3 squares)
   - Destroyer (2 squares)

2. Players take turns attacking coordinates on the opponent's grid
3. First player to sink all opponent ships wins

## API Endpoints

### REST API

- `GET /api/status` - Server status and metrics
- `POST /api/rooms` - Create a new room
- `GET /api/rooms` - List rooms with filtering options
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join a specific room
- `POST /api/rooms/cleanup` - Manual room cleanup (admin)

### Socket Events

#### Client to Server

- `join-room` - Join a game room
- `leave-room` - Leave current room
- `place-ships` - Place ships on board
- `player-ready` - Mark player as ready
- `make-move` - Make a move (fire at opponent)
- `chat-message` - Send chat message
- `restart-game` - Request game restart

#### Server to Client

- `joined-room` - Room join confirmation
- `player-joined` - Another player joined
- `player-left` - Player left room
- `ships-placed` - Ships placement confirmation
- `opponent-ships-placed` - Opponent placed ships
- `player-ready-status` - Player ready state update
- `game-started` - Game begins (both players ready)
- `move-result` - Move result (hit/miss/win)
- `chat-message` - Chat message received
- `game-restarted` - Game was restarted
- `player-disconnected` - Player disconnected

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies
- Inspired by the classic Battleship board game
- Real-time multiplayer functionality powered by Socket.io
