# Battleship Backend Project Structure

This is a well-organized TypeScript backend for a battleship game using Express.js and Socket.io.

## Project Structure

```text
src/
├── app.ts                 # Main application entry point
├── types/
│   └── index.ts          # TypeScript interfaces and types
├── models/
│   └── GameRoom.ts       # Data models and business logic
├── services/
│   └── GameService.ts    # Game logic and utilities
├── controllers/
│   └── RoomController.ts # HTTP request handlers
├── routes/
│   └── index.ts          # Express route definitions
├── sockets/
│   └── GameSocketHandler.ts # Socket.io event handlers
├── utils/
│   └── index.ts          # Utility functions
└── middleware/           # Custom middleware (empty for now)
```

## Architecture Overview

- **app.ts**: Main server setup with Express and Socket.io
- **types/**: TypeScript interfaces for type safety
- **models/**: Data models and database interactions
- **services/**: Business logic and game mechanics
- **controllers/**: HTTP endpoint handlers
- **routes/**: Route definitions and middleware
- **sockets/**: Real-time communication handlers
- **utils/**: Helper functions and utilities

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

- `GET /` - Health check
- `GET /api/status` - Server status
- `POST /api/rooms` - Create new game room
- `GET /api/rooms/:roomId` - Get room details
- `POST /api/rooms/:roomId/join` - Join a room
- `GET /api/rooms` - List available rooms

## Socket Events

- `join-room` - Player joins a game room
- `leave-room` - Player leaves a room
- `place-ships` - Player places ships on board
- `player-ready` - Player marks ready status
- `make-move` - Player fires at opponent's board
- `chat-message` - In-game chat functionality
- `restart-game` - Request game restart
- `disconnect` - Handle player disconnection

All components are currently set up with TODO placeholders for implementation.
