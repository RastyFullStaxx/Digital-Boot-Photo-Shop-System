import type { FastifyInstance } from "fastify";
import { CreatePrintJobBodySchema } from "@photobooth/shared-types";
import type { AppContext } from "../types/context.js";

export async function registerPrintJobRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.post("/api/v1/print-jobs", async (request, reply) => {
    const parsed = CreatePrintJobBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_PAYLOAD",
        message: parsed.error.message
      });
    }

    const project = context.db.getProject(parsed.data.projectId);
    if (!project) {
      return reply.status(404).send({
        error: "PROJECT_NOT_FOUND",
        message: `No project found for id ${parsed.data.projectId}`
      });
    }

    const job = await context.printQueue.enqueue(
      parsed.data.projectId,
      parsed.data.copies,
      parsed.data.printerProfileId
    );

    return reply.status(202).send(job);
  });

  app.get("/api/v1/print-jobs/:printJobId", async (request, reply) => {
    const { printJobId } = request.params as { printJobId: string };
    const job = context.db.getPrintJob(printJobId);

    if (!job) {
      return reply.status(404).send({
        error: "PRINT_JOB_NOT_FOUND",
        message: `No print job found for id ${printJobId}`
      });
    }

    return job;
  });
}
