import type { FastifyInstance } from "fastify";
import { CreateSessionBodySchema } from "@photobooth/shared-types";
import type { AppContext } from "../types/context.js";

export async function registerSessionRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.post("/api/v1/sessions", async (request, reply) => {
    const parsed = CreateSessionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      });
    }

    const session = context.db.createSession(parsed.data.boothId);
    return reply.status(201).send(session);
  });

  app.get("/api/v1/sessions/:sessionId/media", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const session = context.db.getSession(sessionId);
    if (!session) {
      return reply.status(404).send({
        error: "SESSION_NOT_FOUND",
        message: `No session found for id ${sessionId}`
      });
    }

    return context.db.listMediaBySession(sessionId);
  });

  app.post("/api/v1/sessions/:sessionId/complete", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = context.db.getSession(sessionId);
    if (!session) {
      return reply.status(404).send({
        error: "SESSION_NOT_FOUND",
        message: `No session found for id ${sessionId}`
      });
    }

    context.db.completeSession(sessionId);
    return { ok: true, sessionId };
  });

  app.get("/api/v1/sessions/active", async () => {
    return context.db.getActiveSession();
  });
}
