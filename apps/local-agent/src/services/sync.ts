import fs from "node:fs";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../config/index.js";
import { LocalAgentDatabase } from "../db/index.js";

interface SyncSummary {
  sessionsSynced: number;
  assetsSynced: number;
  finalsSynced: number;
  failures: number;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.cloudApiToken ? { authorization: `Bearer ${config.cloudApiToken}` } : {})
    },
    body: JSON.stringify(body)
  });
}

export class SyncService {
  constructor(private readonly db: LocalAgentDatabase, private readonly logger: FastifyBaseLogger) {}

  async run(): Promise<SyncSummary> {
    const summary: SyncSummary = {
      sessionsSynced: 0,
      assetsSynced: 0,
      finalsSynced: 0,
      failures: 0
    };

    for (const session of this.db.listPendingSessions()) {
      try {
        const response = await postJson(`${config.cloudApiBaseUrl}/sync/sessions`, session);
        if (response.ok) {
          this.db.markSessionSynced(session.id);
          summary.sessionsSynced += 1;
        } else {
          summary.failures += 1;
          this.logger.warn({ sessionId: session.id, status: response.status }, "Session sync failed");
        }
      } catch (error) {
        summary.failures += 1;
        this.logger.warn({ error, sessionId: session.id }, "Session sync error");
      }
    }

    for (const asset of this.db.listPendingAssets()) {
      try {
        const response = await postJson(`${config.cloudApiBaseUrl}/sync/assets`, asset);
        if (response.ok) {
          this.db.markAssetSynced(asset.id);
          summary.assetsSynced += 1;
        } else {
          summary.failures += 1;
          this.logger.warn({ assetId: asset.id, status: response.status }, "Asset sync failed");
        }
      } catch (error) {
        summary.failures += 1;
        this.logger.warn({ error, assetId: asset.id }, "Asset sync error");
      }
    }

    for (const project of this.db.listPendingProjects()) {
      const shareLink = this.db.getShareLinkByProject(project.id);
      if (!shareLink || !project.outputPath) {
        continue;
      }

      try {
        const imageBase64 = fs.existsSync(project.outputPath)
          ? fs.readFileSync(project.outputPath).toString("base64")
          : undefined;

        const response = await postJson(`${config.cloudApiBaseUrl}/sync/finals`, {
          projectId: project.id,
          sessionId: project.sessionId,
          outputPath: project.outputPath,
          shareToken: shareLink.publicToken,
          shareUrl: shareLink.url,
          imageBase64
        });

        if (response.ok) {
          this.db.markProjectSynced(project.id);
          summary.finalsSynced += 1;
        } else {
          summary.failures += 1;
          this.logger.warn({ projectId: project.id, status: response.status }, "Final output sync failed");
        }
      } catch (error) {
        summary.failures += 1;
        this.logger.warn({ error, projectId: project.id }, "Final output sync error");
      }
    }

    return summary;
  }
}
