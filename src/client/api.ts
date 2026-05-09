import type { CastVoteInput, CreatePollInput, PollState } from "../shared/types";
import type { ExtensionSession } from "./twitch";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

function headers(session: ExtensionSession) {
  return {
    "Content-Type": "application/json",
    "x-extension-jwt": session.token
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getPoll(session: ExtensionSession) {
  const response = await fetch(`${apiBaseUrl}/api/channel/${session.channelId}/poll`, {
    headers: headers(session)
  });
  return parseResponse<PollState>(response);
}

export async function createPoll(session: ExtensionSession, input: CreatePollInput) {
  const response = await fetch(`${apiBaseUrl}/api/channel/${session.channelId}/poll`, {
    method: "POST",
    headers: headers(session),
    body: JSON.stringify(input)
  });
  return parseResponse<PollState>(response);
}

export async function closePoll(session: ExtensionSession) {
  const response = await fetch(`${apiBaseUrl}/api/channel/${session.channelId}/poll/close`, {
    method: "POST",
    headers: headers(session)
  });
  return parseResponse<PollState>(response);
}

export async function castVote(session: ExtensionSession, input: CastVoteInput) {
  const response = await fetch(`${apiBaseUrl}/api/channel/${session.channelId}/vote`, {
    method: "POST",
    headers: headers(session),
    body: JSON.stringify(input)
  });
  return parseResponse<PollState>(response);
}

export function subscribePoll(session: ExtensionSession, onState: (state: PollState) => void, onError: (error: Event) => void) {
  const url = `${apiBaseUrl}/api/channel/${session.channelId}/events?token=${encodeURIComponent(session.token)}`;
  const source = new EventSource(url);
  source.addEventListener("poll-state", (event) => onState(JSON.parse((event as MessageEvent).data) as PollState));
  source.onerror = onError;
  return () => source.close();
}
