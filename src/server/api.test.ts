import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const secret = "test-secret";

function token(role: string, overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      channel_id: "channel-1",
      opaque_user_id: "Uopaque",
      role,
      user_id: role === "viewer" || role === "moderator" || role === "broadcaster" ? `${role}-1` : undefined,
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides
    },
    secret,
    { algorithm: "HS256" }
  );
}

describe("poll API", () => {
  beforeEach(() => {
    process.env.TWITCH_EXTENSION_SECRET = secret;
  });

  it("allows moderators to create polls and viewers to vote once", async () => {
    const app = createApp();
    const managerToken = token("moderator");
    const viewerToken = token("viewer", { user_id: "viewer-42" });

    const createResponse = await request(app)
      .post("/api/channel/channel-1/poll")
      .set("x-extension-jwt", managerToken)
      .send({ question: "Pick one", options: ["A", "B"], privacyMode: "public_choice" })
      .expect(201);

    const optionId = createResponse.body.poll.options[0].id;

    await request(app)
      .post("/api/channel/channel-1/vote")
      .set("x-extension-jwt", viewerToken)
      .send({ optionId, displayName: "Viewer42" })
      .expect(201);

    await request(app)
      .post("/api/channel/channel-1/vote")
      .set("x-extension-jwt", viewerToken)
      .send({ optionId, displayName: "Viewer42" })
      .expect(409);

    const state = await request(app).get("/api/channel/channel-1/poll").set("x-extension-jwt", viewerToken).expect(200);
    expect(state.body.counts[optionId]).toBe(1);
    expect(state.body.voters[0]).toMatchObject({ displayName: "Viewer42", optionId });
  });

  it("rejects unlinked voters", async () => {
    const app = createApp();
    const managerToken = token("broadcaster");
    const unlinkedToken = token("viewer", { user_id: undefined, is_unlinked: true });

    const createResponse = await request(app)
      .post("/api/channel/channel-1/poll")
      .set("x-extension-jwt", managerToken)
      .send({ question: "Pick one", options: ["A", "B"], privacyMode: "anonymous_choice" })
      .expect(201);

    await request(app)
      .post("/api/channel/channel-1/vote")
      .set("x-extension-jwt", unlinkedToken)
      .send({ optionId: createResponse.body.poll.options[0].id, displayName: "Anon" })
      .expect(403);
  });
});
