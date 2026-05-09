import { describe, expect, it } from "vitest";
import { InMemoryPollStore } from "./store.js";

describe("InMemoryPollStore", () => {
  it("creates one active poll and replaces previous votes", () => {
    const store = new InMemoryPollStore();
    const first = store.createPoll("channel-1", "mod-1", {
      question: "First?",
      options: ["Yes", "No"],
      privacyMode: "anonymous_choice"
    });

    store.castVote("channel-1", "user-1", {
      optionId: first.poll!.options[0].id,
      displayName: "UserOne"
    });

    const second = store.createPoll("channel-1", "mod-1", {
      question: "Second?",
      options: ["A", "B"],
      privacyMode: "anonymous_choice"
    });

    expect(second.poll?.question).toBe("Second?");
    expect(second.voters).toHaveLength(0);
  });

  it("locks users to one vote", () => {
    const store = new InMemoryPollStore();
    const state = store.createPoll("channel-1", "mod-1", {
      question: "Pick",
      options: ["A", "B"],
      privacyMode: "anonymous_choice"
    });

    store.castVote("channel-1", "user-1", {
      optionId: state.poll!.options[0].id,
      displayName: "UserOne"
    });

    expect(() =>
      store.castVote("channel-1", "user-1", {
        optionId: state.poll!.options[1].id,
        displayName: "UserOne"
      })
    ).toThrow("Vote already cast");
  });

  it("allows a new poll after closing the previous one", () => {
    const store = new InMemoryPollStore();
    const first = store.createPoll("channel-1", "mod-1", {
      question: "First?",
      options: ["A", "B"],
      privacyMode: "anonymous_choice"
    });

    store.castVote("channel-1", "user-1", {
      optionId: first.poll!.options[0].id,
      displayName: "UserOne"
    });
    const closed = store.closePoll("channel-1");
    expect(closed.poll?.status).toBe("closed");

    const second = store.createPoll("channel-1", "mod-1", {
      question: "Second?",
      options: ["A", "B"],
      privacyMode: "anonymous_choice"
    });

    expect(second.poll?.status).toBe("active");
    expect(second.voters).toHaveLength(0);
  });

  it("hides option choice in anonymous mode and exposes it in public mode", () => {
    const store = new InMemoryPollStore();
    const anonymous = store.createPoll("channel-1", "mod-1", {
      question: "Hidden?",
      options: ["A", "B"],
      privacyMode: "anonymous_choice"
    });

    store.castVote("channel-1", "user-1", {
      optionId: anonymous.poll!.options[0].id,
      displayName: "UserOne"
    });

    expect(store.getActivePoll("channel-1").voters[0].optionId).toBeUndefined();

    const visible = store.createPoll("channel-1", "mod-1", {
      question: "Visible?",
      options: ["A", "B"],
      privacyMode: "public_choice"
    });

    store.castVote("channel-1", "user-1", {
      optionId: visible.poll!.options[0].id,
      displayName: "UserOne"
    });

    expect(store.getActivePoll("channel-1").voters[0].optionId).toBe(visible.poll!.options[0].id);
  });
});
