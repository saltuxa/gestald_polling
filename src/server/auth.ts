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

function getJwtSecrets(): Array<Buffer | string> {
  const secret = process.env.TWITCH_EXTENSION_SECRET;
  if (!secret) {
    throw new Error("TWITCH_EXTENSION_SECRET is required");
  }

  return [decodeExtensionSecret(secret), secret.trim()];
}

export function decodeExtensionSecret(secret: string): Buffer | string {
  const normalized = secret.trim();
  if (!/^[A-Za-z0-9+/_-]+=*$/.test(normalized)) {
    return normalized;
  }

  const base64 = normalized.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(base64, "base64");
}

export function verifyExtensionToken(token: string): AuthContext {
  let payload: TwitchJwtPayload | null = null;
  for (const secret of getJwtSecrets()) {
    try {
      payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as TwitchJwtPayload;
      break;
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    throw new AppError(401, "Invalid Twitch extension token");
  }

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
