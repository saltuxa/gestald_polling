export type PrivacyMode = "anonymous_choice" | "public_choice";
export type PollStatus = "active" | "closed";
export type ExtensionRole = "broadcaster" | "moderator" | "viewer" | "external";

export interface PollOption {
  id: string;
  label: string;
}

export interface Poll {
  id: string;
  channelId: string;
  question: string;
  options: PollOption[];
  privacyMode: PrivacyMode;
  status: PollStatus;
  createdBy: string;
  createdAt: string;
  closedAt?: string;
}

export interface Vote {
  pollId: string;
  userId: string;
  displayName: string;
  optionId: string;
  createdAt: string;
}

export interface PublicVoter {
  userId: string;
  displayName: string;
  optionId?: string;
  createdAt: string;
}

export interface PollState {
  poll: Poll | null;
  counts: Record<string, number>;
  voters: PublicVoter[];
  viewerVoteOptionId?: string;
}

export interface AuthContext {
  channelId: string;
  role: ExtensionRole;
  opaqueUserId?: string;
  userId?: string;
  isUnlinked?: boolean;
}

export interface CreatePollInput {
  question: string;
  options: string[];
  privacyMode: PrivacyMode;
}

export interface CastVoteInput {
  optionId: string;
  displayName: string;
}
