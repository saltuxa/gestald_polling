import { EventEmitter } from "node:events";
import crypto from "node:crypto";
import type { CastVoteInput, CreatePollInput, Poll, PollState, Vote } from "../shared/types.js";
import { AppError } from "./errors.js";

export interface PollStore {
  createPoll(channelId: string, createdBy: string, input: CreatePollInput): PollState;
  getActivePoll(channelId: string, viewerUserId?: string): PollState;
  closePoll(channelId: string): PollState;
  castVote(channelId: string, userId: string, input: CastVoteInput): PollState;
  subscribeToChannelState(channelId: string, listener: (state: PollState) => void): () => void;
}

interface ChannelRecord {
  poll: Poll | null;
  lastClosedPoll: Poll | null;
  votes: Map<string, Vote>;
  lastClosedVotes: Map<string, Vote>;
}

export class InMemoryPollStore implements PollStore {
  private readonly channels = new Map<string, ChannelRecord>();
  private readonly events = new EventEmitter();

  createPoll(channelId: string, createdBy: string, input: CreatePollInput): PollState {
    const record = this.getRecord(channelId);
    const now = new Date().toISOString();

    record.poll = {
      id: crypto.randomUUID(),
      channelId,
      question: input.question,
      options: input.options.map((label) => ({ id: crypto.randomUUID(), label })),
      privacyMode: input.privacyMode,
      status: "active",
      createdBy,
      createdAt: now
    };
    record.votes = new Map();

    return this.publish(channelId);
  }

  getActivePoll(channelId: string, viewerUserId?: string): PollState {
    return this.toPublicState(this.getRecord(channelId), viewerUserId);
  }

  closePoll(channelId: string): PollState {
    const record = this.getRecord(channelId);
    if (!record.poll || record.poll.status !== "active") {
      throw new AppError(404, "No active poll");
    }

    record.lastClosedPoll = {
      ...record.poll,
      status: "closed",
      closedAt: new Date().toISOString()
    };
    record.lastClosedVotes = new Map(record.votes);
    record.poll = null;
    record.votes = new Map();

    return this.publish(channelId);
  }

  castVote(channelId: string, userId: string, input: CastVoteInput): PollState {
    const record = this.getRecord(channelId);
    if (!record.poll || record.poll.status !== "active") {
      throw new AppError(404, "No active poll");
    }
    if (!record.poll.options.some((option) => option.id === input.optionId)) {
      throw new AppError(400, "Unknown poll option");
    }
    if (record.votes.has(userId)) {
      throw new AppError(409, "Vote already cast");
    }

    record.votes.set(userId, {
      pollId: record.poll.id,
      userId,
      displayName: input.displayName,
      optionId: input.optionId,
      createdAt: new Date().toISOString()
    });

    return this.publish(channelId, userId);
  }

  subscribeToChannelState(channelId: string, listener: (state: PollState) => void): () => void {
    const eventName = this.eventName(channelId);
    this.events.on(eventName, listener);
    return () => this.events.off(eventName, listener);
  }

  private publish(channelId: string, viewerUserId?: string): PollState {
    const state = this.getActivePoll(channelId, viewerUserId);
    this.events.emit(this.eventName(channelId), this.getActivePoll(channelId));
    return state;
  }

  private getRecord(channelId: string): ChannelRecord {
    const existing = this.channels.get(channelId);
    if (existing) {
      return existing;
    }

    const record: ChannelRecord = { poll: null, lastClosedPoll: null, votes: new Map(), lastClosedVotes: new Map() };
    this.channels.set(channelId, record);
    return record;
  }

  private toPublicState(record: ChannelRecord, viewerUserId?: string): PollState {
    const poll = record.poll ?? record.lastClosedPoll;
    const voteMap = record.poll ? record.votes : record.lastClosedVotes;

    if (!poll) {
      return { poll: null, counts: {}, voters: [] };
    }

    const counts = Object.fromEntries(poll.options.map((option) => [option.id, 0]));
    const votes = [...voteMap.values()];

    for (const vote of votes) {
      counts[vote.optionId] = (counts[vote.optionId] ?? 0) + 1;
    }

    const viewerVote = viewerUserId ? voteMap.get(viewerUserId) : undefined;

    return {
      poll,
      counts,
      voters: votes.map((vote) => ({
        userId: vote.userId,
        displayName: vote.displayName,
        optionId: poll.privacyMode === "public_choice" ? vote.optionId : undefined,
        createdAt: vote.createdAt
      })),
      viewerVoteOptionId: viewerVote?.optionId
    };
  }

  private eventName(channelId: string) {
    return `channel:${channelId}`;
  }
}
