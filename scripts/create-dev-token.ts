import "dotenv/config";
import jwt from "jsonwebtoken";

const args = new Map<string, string>();
const rawArgs = process.argv.slice(2);
for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (!arg.startsWith("--")) {
    continue;
  }

  const normalized = arg.replace(/^--/, "");
  if (normalized.includes("=")) {
    const [key, value = ""] = normalized.split("=");
    args.set(key, value);
  } else {
    args.set(normalized, rawArgs[index + 1] ?? "");
    index += 1;
  }
}

const secret = process.env.TWITCH_EXTENSION_SECRET;
if (!secret) {
  throw new Error("TWITCH_EXTENSION_SECRET is required");
}

function normalizeSecret(value: string): Buffer | string {
  const normalized = value.trim();
  if (/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    try {
      return Buffer.from(normalized, "base64");
    } catch {
      return normalized;
    }
  }

  return normalized;
}

const role = args.get("role") ?? process.env.npm_config_role ?? "broadcaster";
const userId = args.get("userId") ?? args.get("user-id") ?? process.env.npm_config_userid ?? process.env.npm_config_user_id ?? `${role}-local`;
const channelId = args.get("channelId") ?? args.get("channel-id") ?? process.env.npm_config_channelid ?? process.env.npm_config_channel_id ?? "local-channel";

const token = jwt.sign(
  {
    channel_id: channelId,
    opaque_user_id: `U${userId}`,
    role,
    user_id: userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    is_unlinked: false
  },
  normalizeSecret(secret),
  { algorithm: "HS256" }
);

console.log(token);
