import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthContext, ExtensionRole } from "../shared/types.js";
import { AppError } from "./errors.js";

interface TwitchJwtPayload extends jwt.JwtPayload {
  channel_id?: string;
  opaque_user_id?: string;
  role?: ExtensionRole;
  user_id?: string;
  is_unlinked?: boolean | string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function getJwtSecret(): Buffer | string {
  const secret = process.env.TWITCH_EXTENSION_SECRET;
  if (!secret) {
    throw new Error("TWITCH_EXTENSION_SECRET is required");
  }

  const normalized = secret.trim();
  if (/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    try {
      return Buffer.from(normalized, "base64");
    } catch {
      return normalized;
    }
  }

  return normalized;
}

export function verifyExtensionToken(token: string): AuthContext {
  const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as TwitchJwtPayload;

  if (!payload.channel_id || !payload.role) {
    throw new AppError(401, "Invalid Twitch extension token");
  }

  return {
    channelId: payload.channel_id,
    role: payload.role,
    opaqueUserId: payload.opaque_user_id,
    userId: payload.user_id,
    isUnlinked: payload.is_unlinked === true || payload.is_unlinked === "true"
  };
}

export function requireExtensionAuth(req: Request, _res: Response, next: NextFunction) {
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = req.header("x-extension-jwt") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? queryToken;

  if (!token) {
    next(new AppError(401, "Missing Twitch extension token"));
    return;
  }

  try {
    req.auth = verifyExtensionToken(token);
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Invalid Twitch extension token"));
  }
}

export function requireChannelMatch(req: Request) {
  if (!req.auth || req.auth.channelId !== req.params.channelId) {
    throw new AppError(403, "Token channel does not match request channel");
  }
}

export function requireManager(auth: AuthContext) {
  if (auth.role !== "broadcaster" && auth.role !== "moderator") {
    throw new AppError(403, "Only broadcasters and moderators can manage polls");
  }
  if (auth.role === "moderator" && !auth.userId) {
    throw new AppError(403, "Moderators must share Twitch identity to manage polls");
  }
}

export function requireLinkedViewer(auth: AuthContext) {
  if (!auth.userId || auth.isUnlinked) {
    throw new AppError(403, "Twitch identity sharing is required to vote");
  }
}
