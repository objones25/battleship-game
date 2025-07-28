import mongoose, { Schema, Document } from "mongoose";
import { User as UserType, UserGameState } from "../types";

// Mongoose document interface
export interface UserDocument extends Document {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastActive: Date;
  currentGame?: UserGameState;

  // Instance methods
  updateLastActive(): Promise<UserDocument>;
  setGameState(gameState: UserGameState | undefined): Promise<UserDocument>;
  clearGameState(): Promise<UserDocument>;
  toUserType(): UserType;
}

// Static methods interface
export interface UserModel extends mongoose.Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
  findByCustomId(id: string): Promise<UserDocument | null>;
}

// User game state schema
const userGameStateSchema = new Schema<UserGameState>(
  {
    roomId: { type: String, required: true },
    playerId: { type: String, required: true },
    ships: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        length: { type: Number, required: true },
        positions: [
          {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
          },
        ],
        isDestroyed: { type: Boolean, required: true },
      },
    ],
    isReady: { type: Boolean, required: true },
    gamePhase: {
      type: String,
      enum: ["setup", "playing", "finished"],
      required: true,
    },
    opponentId: { type: String },
    lastActivity: { type: Date, required: true },
  },
  { _id: false }
);

// User schema
const userSchema = new Schema<UserDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
    currentGame: {
      type: userGameStateSchema,
      default: undefined,
    },
  },
  {
    timestamps: false, // We handle timestamps manually
    versionKey: false,
    toJSON: {
      transform: function (_doc, ret) {
        // Remove MongoDB _id and keep our custom id
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes for performance (additional indexes beyond those defined in schema)
userSchema.index({ lastActive: -1 });
userSchema.index({ "currentGame.roomId": 1 });

// Static methods
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username: username.toLowerCase() });
};

userSchema.statics.findByCustomId = function (id: string) {
  return this.findOne({ id });
};

// Instance methods
userSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};

userSchema.methods.setGameState = function (
  gameState: UserGameState | undefined
) {
  this.currentGame = gameState;
  return this.save();
};

userSchema.methods.clearGameState = function () {
  this.currentGame = undefined;
  return this.save();
};

// Convert to plain User type
userSchema.methods.toUserType = function (): UserType {
  return {
    id: this.id,
    username: this.username,
    email: this.email,
    passwordHash: this.passwordHash,
    createdAt: this.createdAt,
    lastActive: this.lastActive,
    currentGame: this.currentGame,
  };
};

export const UserModel = mongoose.model<UserDocument, UserModel>(
  "User",
  userSchema
);
