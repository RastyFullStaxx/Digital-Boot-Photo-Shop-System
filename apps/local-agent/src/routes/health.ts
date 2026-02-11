import type { FastifyInstance } from "fastify";
import { HealthSchema } from "@photobooth/shared-types";
import { config } from "../config/index.js";
import type { AppContext } from "../types/context.js";

export async function registerHealthRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get("/api/v1/health", async () => {
    const payload = {
      ok: true,
      service: "local-agent" as const,
      uptimeSeconds: Math.round(process.uptime()),
      watchedDirectory: config.watchedDirectory,
      pendingSyncCount: context.db.countPendingSync(),
      timestamp: new Date().toISOString()
    };

    return HealthSchema.parse(payload);
  });
}
