import type { FastifyBaseLogger } from "fastify";
import type { PrintJob } from "@photobooth/shared-types";
import { LocalAgentDatabase } from "../db/index.js";

export interface PrintAdapter {
  send(job: PrintJob, outputPath: string): Promise<void>;
}

export class WindowsSpoolAdapter implements PrintAdapter {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async send(job: PrintJob, outputPath: string): Promise<void> {
    this.logger.info(
      {
        printJobId: job.id,
        printerName: job.printerName,
        outputPath,
        copies: job.copies
      },
      "Simulating Windows spool print dispatch"
    );

    await new Promise<void>((resolve) => setTimeout(resolve, 800));
  }
}

export class PrintQueueService {
  constructor(
    private readonly db: LocalAgentDatabase,
    private readonly adapter: PrintAdapter,
    private readonly logger: FastifyBaseLogger
  ) {}

  async enqueue(projectId: string, copies: number, printerProfileId: string): Promise<PrintJob> {
    const job = this.db.createPrintJob({
      projectId,
      copies,
      printerProfileId,
      printerName: "Windows Default Printer"
    });

    void this.process(job.id);
    return job;
  }

  private async process(jobId: string): Promise<void> {
    const job = this.db.getPrintJob(jobId);
    if (!job) {
      return;
    }

    const project = this.db.getProject(job.projectId);
    if (!project || !project.outputPath) {
      this.db.updatePrintJobStatus(job.id, "failed", "MISSING_RENDER_OUTPUT");
      return;
    }

    this.db.updatePrintJobStatus(job.id, "printing");

    try {
      await this.adapter.send(job, project.outputPath);
      this.db.updatePrintJobStatus(job.id, "printed");
      this.logger.info({ printJobId: job.id }, "Print job completed");
    } catch (error) {
      this.db.updatePrintJobStatus(job.id, "failed", "PRINT_ADAPTER_FAILURE");
      this.logger.error({ error, printJobId: job.id }, "Print job failed");
    }
  }
}
