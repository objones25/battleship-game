# Battleship User Persistence Implementation Plan

## 1. User Authentication System

### Backend Changes

#### New User Model

```typescript
// backend/src/types/index.ts
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastActive: Date;
  currentRoomId?: string;
  currentGameState?: UserGameState;
}

export interface UserGameState {
  playerId: string;
  roomId: string;
  ships?: Ship[];
  isReady: boolean;
  lastActivity: Date;
}

export interface AuthToken {
  userId: string;
  username: string;
  exp: number;
  iat: number;
}
```

#### New Authentication Controllers

```typescript
// backend/src/controllers/AuthController.ts
export class AuthController {
  static async register(req: Request, res: Response);
  static async login(req: Request, res: Response);
  static async logout(req: Request, res: Response);
  static async getCurrentUser(req: Request, res: Response);
  static async refreshToken(req: Request, res: Response);
}
```

#### JWT Middleware

```typescript
// backend/src/middleware/auth.ts
export const authenticateToken = (req: Request, res: Response, next: NextFunction);
```

#### User Service

```typescript
// backend/src/services/UserService.ts
export class UserService {
  static async createUser(
    username: string,
    email: string,
    password: string
  ): Promise<User>;
  static async authenticateUser(
    email: string,
    password: string
  ): Promise<User | null>;
  static async getUserById(id: string): Promise<User | null>;
  static async updateUserGameState(
    userId: string,
    gameState: UserGameState
  ): Promise<void>;
  static async clearUserGameState(userId: string): Promise<void>;
}
```

### Frontend Changes

#### Authentication Context

```typescript
// frontend/src/context/AuthContext.tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function AuthProvider({ children }: { children: ReactNode });
export function useAuth(): AuthContextType;
```

#### Login/Register Components

```typescript
// frontend/src/components/auth/LoginForm.tsx
// frontend/src/components/auth/RegisterForm.tsx
// frontend/src/components/auth/AuthGuard.tsx
```

## 2. Session Persistence

### Backend Session Management

#### Session Store (In-Memory Initially)

```typescript
// backend/src/services/SessionService.ts
export class SessionService {
  private static userSessions = new Map<string, UserSession>();

  static saveUserSession(userId: string, session: UserSession): void;
  static getUserSession(userId: string): UserSession | null;
  static clearUserSession(userId: string): void;
  static updateUserActivity(userId: string): void;
}

interface UserSession {
  userId: string;
  username: string;
  currentRoomId?: string;
  currentPlayerId?: string;
  gameState?: UserGameState;
  lastActivity: Date;
  socketId?: string;
}
```

#### Enhanced GameRoom Model

```typescript
// Modify existing GameRoomModel to support user-based players
export class GameRoomModel {
  // New methods:
  static addUserToRoom(
    roomId: string,
    userId: string,
    username: string
  ): boolean;
  static removeUserFromRoom(roomId: string, userId: string): boolean;
  static getUserRoom(userId: string): GameRoom | null;
  static reconnectUserToRoom(userId: string, socketId: string): GameRoom | null;
}
```

### Frontend Session Management

#### Session Storage Service

```typescript
// frontend/src/services/session.ts
export class SessionService {
  static saveAuthToken(token: string): void;
  static getAuthToken(): string | null;
  static clearAuthToken(): void;
  static saveGameState(gameState: Partial<GameState>): void;
  static getGameState(): Partial<GameState> | null;
  static clearGameState(): void;
}
```

## 3. Reconnection Logic

### Backend Reconnection Handler

#### Enhanced Socket Handler

```typescript
// Modify backend/src/sockets/GameSocketHandler.ts
export class GameSocketHandler {
  // New reconnection methods:
  private handleUserReconnection(socket: Socket, userId: string): void;
  private restoreUserGameState(socket: Socket, userId: string): void;
  private notifyReconnection(roomId: string, userId: string): void;
}
```

#### New Socket Events

```typescript
// Add to socket events
Client → Server:
- "authenticate" - { token: string }
- "reconnect-user" - { userId: string, token: string }

Server → Client:
- "authenticated" - { success: boolean, user?: User, error?: string }
- "user-reconnected" - { userId: string, username: string }
- "game-state-restored" - { room: GameRoom, player: Player }
```

### Frontend Reconnection Logic

#### Enhanced Game Context

```typescript
// Modify frontend/src/context/GameContext.tsx
export function GameProvider({ children }: GameProviderProps) {
  // New reconnection methods:
  const attemptReconnection = async (): Promise<void>;
  const restoreGameState = (savedState: Partial<GameState>): void;

  // Enhanced useEffect for auto-reconnection
  useEffect(() => {
    if (isAuthenticated && !isConnected) {
      attemptReconnection();
    }
  }, [isAuthenticated]);
}
```

## 4. Database Integration (Phase 2)

### User Data Persistence

```typescript
// backend/src/models/User.ts (MongoDB/PostgreSQL)
export class UserModel {
  static async create(userData: CreateUserData): Promise<User>;
  static async findById(id: string): Promise<User | null>;
  static async findByEmail(email: string): Promise<User | null>;
  static async updateGameState(
    userId: string,
    gameState: UserGameState
  ): Promise<void>;
}
```

### Game History

```typescript
// backend/src/models/GameHistory.ts
export class GameHistoryModel {
  static async saveGame(gameData: GameHistoryData): Promise<void>;
  static async getUserGames(userId: string): Promise<GameHistory[]>;
  static async getGameById(gameId: string): Promise<GameHistory | null>;
}
```

## 5. Implementation Phases

### Phase 1: Basic Authentication (Week 1-2)

- [ ] Implement JWT-based auth system
- [ ] Add login/register components
- [ ] Create auth middleware
- [ ] Update socket authentication

### Phase 2: Session Persistence (Week 2-3)

- [ ] Implement session storage
- [ ] Add game state persistence
- [ ] Create reconnection logic
- [ ] Handle page refresh scenarios

### Phase 3: Enhanced Reconnection (Week 3-4)

- [ ] Advanced reconnection scenarios
- [ ] Handle disconnection during gameplay
- [ ] Optimize user experience
- [ ] Add loading states

### Phase 4: Database Integration (Week 4-5)

- [ ] Set up database (MongoDB/PostgreSQL)
- [ ] Migrate to persistent storage
- [ ] Add game history
- [ ] Implement user statistics

## 6. Key Technical Decisions

### Authentication Method

- **JWT tokens** for stateless authentication
- **Refresh tokens** for extended sessions
- **HTTP-only cookies** vs **localStorage** for token storage

### Session Storage

- **In-memory initially** for rapid development
- **Redis** for production scalability
- **Database backup** for persistence

### Reconnection Strategy

- **Automatic reconnection** on page load if authenticated
- **Game state restoration** from server
- **Graceful handling** of invalid/expired sessions

## 7. Security Considerations

### Token Security

- JWT tokens with reasonable expiration
- Secure token storage (HTTP-only cookies recommended)
- Token refresh mechanism

### Socket Authentication

- Authenticate socket connections with JWT
- Validate user identity on each game action
- Prevent unauthorized access to game rooms

### Game State Validation

- Server-side validation of all game actions
- Prevent state manipulation through client
- Audit trail for game actions

## 8. Testing Strategy

### Authentication Tests

- Login/logout flows
- Token validation
- Invalid credential handling

### Reconnection Tests

- Page refresh scenarios
- Network interruption handling
- Multiple device scenarios

### Game State Tests

- State persistence accuracy
- Concurrent user handling
- Edge case scenarios

## 9. Migration Path

### From Current System

1. **Backwards compatibility** during transition
2. **Gradual rollout** of auth features
3. **Fallback mechanisms** for unauthenticated users
4. **Data migration** scripts

### User Experience

- **Optional authentication** initially
- **Progressive enhancement** of features
- **Clear communication** of benefits
- **Smooth onboarding** process
