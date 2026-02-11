import fs from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../config/index.js";
import { LocalAgentDatabase } from "../db/index.js";
import { detectMediaKind, fileSha1, generatePhotoPreview } from "./media.js";

export function startMediaWatcher(db: LocalAgentDatabase, logger: FastifyBaseLogger): void {
  const watcher = chokidar.watch(config.watchedDirectory, {
    ignoreInitial: false,
    depth: 0
  });

  watcher.on("add", async (filePath) => {
    const kind = detectMediaKind(filePath);
    if (!kind) {
      logger.debug({ filePath }, "Skipping non-media file");
      return;
    }

    try {
      const activeSession = db.ensureActiveSession(config.boothId);
      const ext = path.extname(filePath).toLowerCase();
      const basename = path.basename(filePath, ext);
      const ingestTs = Date.now();
      const mediaName = `${basename}-${ingestTs}${ext}`;
      const mediaPath = path.join(config.mediaDirectory, mediaName);
      const previewName = `${basename}-${ingestTs}.preview.jpg`;
      const previewPath = path.join(config.previewDirectory, previewName);
      fs.copyFileSync(filePath, mediaPath);

      if (kind === "photo") {
        await generatePhotoPreview(mediaPath, previewPath);
      }

      const media = db.addMediaAsset({
        sessionId: activeSession.id,
        kind,
        localPath: mediaPath,
        previewPath: kind === "photo" ? previewPath : null,
        capturedAt: new Date().toISOString(),
        hash: fileSha1(mediaPath)
      });

      logger.info({ mediaId: media.id, sessionId: activeSession.id, filePath: mediaPath, kind }, "Ingested media asset");
    } catch (error) {
      logger.error({ error, filePath }, "Failed to ingest media asset");
    }
  });

  watcher.on("error", (error) => {
    logger.error({ error }, "Media watcher error");
  });

  logger.info({ watchedDirectory: config.watchedDirectory }, "Media watcher started");
}
