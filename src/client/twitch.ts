import type { ExtensionRole } from "../shared/types";

interface TwitchAuth {
  channelId: string;
  clientId: string;
  token: string;
  helixToken?: string;
  userId: string;
}

interface TwitchViewer {
  id: string | null;
  opaqueId: string | null;
  role: ExtensionRole;
  isLinked: boolean;
  helixToken?: string;
}

interface TwitchExt {
  onAuthorized(callback: (auth: TwitchAuth) => void): void;
  actions: {
    requestIdShare(): void;
  };
  viewer: TwitchViewer;
}

declare global {
  interface Window {
    Twitch?: {
      ext: TwitchExt;
    };
  }
}

export interface ExtensionSession {
  channelId: string;
  clientId: string;
  token: string;
  helixToken?: string;
  userId?: string | null;
  role: ExtensionRole;
  isLinked: boolean;
}

export function onTwitchAuthorized(callback: (session: ExtensionSession) => void) {
  const ext = window.Twitch?.ext;
  if (!ext) {
    callback(createLocalSession());
    return;
  }

  ext.onAuthorized((auth) => {
    callback({
      channelId: auth.channelId,
      clientId: auth.clientId,
      token: auth.token,
      helixToken: auth.helixToken,
      userId: ext.viewer.id,
      role: ext.viewer.role,
      isLinked: ext.viewer.isLinked
    });
  });
}

export function requestIdentityShare() {
  window.Twitch?.ext.actions.requestIdShare();
}

export async function fetchDisplayName(session: ExtensionSession): Promise<string> {
  if (!session.helixToken || !session.clientId || !session.userId) {
    return session.userId ?? "viewer";
  }

  const response = await fetch(`https://api.twitch.tv/helix/users?id=${encodeURIComponent(session.userId)}`, {
    headers: {
      "Client-Id": session.clientId,
      Authorization: `Extension ${session.helixToken}`
    }
  });

  if (!response.ok) {
    return session.userId;
  }

  const body = (await response.json()) as { data?: Array<{ display_name?: string; login?: string }> };
  return body.data?.[0]?.display_name ?? body.data?.[0]?.login ?? session.userId;
}

function createLocalSession(): ExtensionSession {
  const params = new URLSearchParams(window.location.search);
  return {
    channelId: params.get("channelId") ?? "local-channel",
    clientId: params.get("clientId") ?? "local-client",
    token: params.get("token") ?? "",
    userId: params.get("userId") ?? "local-user",
    role: (params.get("role") as ExtensionRole | null) ?? "broadcaster",
    isLinked: params.get("linked") !== "false"
  };
}
