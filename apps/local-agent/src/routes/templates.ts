import type { FastifyInstance } from "fastify";
import { TemplateSchema } from "@photobooth/shared-types";
import type { AppContext } from "../types/context.js";

export async function registerTemplateRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get("/api/v1/templates", async () => {
    return context.db.listTemplates();
  });

  app.post("/api/v1/templates", async (request, reply) => {
    const parsed = TemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      });
    }

    const template = context.db.upsertTemplate(parsed.data);
    return reply.status(201).send(template);
  });
}
