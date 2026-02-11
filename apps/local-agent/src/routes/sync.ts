import type { FastifyInstance } from "fastify";
import type { AppContext } from "../types/context.js";

export async function registerSyncRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.post("/api/v1/sync/run", async (_request, reply) => {
    const summary = await context.sync.run();

    return reply.status(200).send({
      ok: summary.failures === 0,
      ...summary
    });
  });
}
