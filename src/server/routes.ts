import type { Router } from "express";
import express from "express";
import { castVoteSchema, createPollSchema } from "../shared/validation.js";
import { requireChannelMatch, requireLinkedViewer, requireManager } from "./auth.js";
import type { PollStore } from "./store.js";

export function createApiRouter(store: PollStore): Router {
  const router = express.Router();

  router.get("/channel/:channelId/poll", (req, res, next) => {
    try {
      requireChannelMatch(req);
      res.json(store.getActivePoll(req.params.channelId, req.auth?.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/channel/:channelId/poll", (req, res, next) => {
    try {
      requireChannelMatch(req);
      requireManager(req.auth!);
      const input = createPollSchema.parse(req.body);
      res.status(201).json(store.createPoll(req.params.channelId, req.auth!.userId ?? req.auth!.opaqueUserId ?? "unknown", input));
    } catch (error) {
      next(error);
    }
  });

  router.post("/channel/:channelId/poll/close", (req, res, next) => {
    try {
      requireChannelMatch(req);
      requireManager(req.auth!);
      res.json(store.closePoll(req.params.channelId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/channel/:channelId/vote", (req, res, next) => {
    try {
      requireChannelMatch(req);
      requireLinkedViewer(req.auth!);
      const input = castVoteSchema.parse(req.body);
      res.status(201).json(store.castVote(req.params.channelId, req.auth!.userId!, input));
    } catch (error) {
      next(error);
    }
  });

  router.get("/channel/:channelId/events", (req, res, next) => {
    try {
      requireChannelMatch(req);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const send = (state: unknown) => {
        res.write(`event: poll-state\n`);
        res.write(`data: ${JSON.stringify(state)}\n\n`);
      };

      send(store.getActivePoll(req.params.channelId, req.auth?.userId));
      const unsubscribe = store.subscribeToChannelState(req.params.channelId, send);
      req.on("close", unsubscribe);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
