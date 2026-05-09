import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { requireExtensionAuth } from "./auth.js";
import { AppError, isAppError } from "./errors.js";
import { createApiRouter } from "./routes.js";
import { InMemoryPollStore, type PollStore } from "./store.js";

export function createApp(store: PollStore = new InMemoryPollStore()) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", requireExtensionAuth, createApiRouter(store));

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../client");
  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.issues });
      return;
    }

    if (isAppError(error)) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    const status = error instanceof AppError ? error.status : 500;
    res.status(status).json({ error: status === 500 ? "Internal server error" : String(error) });
  });

  return app;
}
