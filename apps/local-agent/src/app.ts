import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { config } from "./config/index.js";
import { LocalAgentDatabase } from "./db/index.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerPrintJobRoutes } from "./routes/printJobs.js";
import { registerSyncRoutes } from "./routes/sync.js";
import { registerTemplateRoutes } from "./routes/templates.js";
import { PrintQueueService, WindowsSpoolAdapter } from "./services/printQueue.js";
import { SyncService } from "./services/sync.js";
import { ensureDirectories } from "./utils/fs.js";
import type { AppContext } from "./types/context.js";
import { startMediaWatcher } from "./services/mediaWatcher.js";

export interface BuildAppOptions {
  startWatcher?: boolean;
}

export function buildApp(options: BuildAppOptions = {}) {
  ensureDirectories([
    config.dataDirectory,
    config.watchedDirectory,
    config.mediaDirectory,
    config.previewDirectory,
    config.renderDirectory
  ]);

  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  const db = new LocalAgentDatabase();
  db.initialize();

  const printAdapter = new WindowsSpoolAdapter(app.log);
  const printQueue = new PrintQueueService(db, printAdapter, app.log);
  const sync = new SyncService(db, app.log);

  const context: AppContext = {
    db,
    printQueue,
    sync
  };

  void app.register(cors, {
    origin: true,
    credentials: true
  });

  void app.register(fastifyStatic, {
    root: path.resolve(config.previewDirectory),
    prefix: "/files/previews/"
  });

  void app.register(fastifyStatic, {
    root: path.resolve(config.renderDirectory),
    prefix: "/files/renders/",
    decorateReply: false
  });

  void app.register(fastifyStatic, {
    root: path.resolve(config.mediaDirectory),
    prefix: "/files/media/",
    decorateReply: false
  });

  void registerHealthRoutes(app, context);
  void registerSessionRoutes(app, context);
  void registerProjectRoutes(app, context);
  void registerPrintJobRoutes(app, context);
  void registerSyncRoutes(app, context);
  void registerTemplateRoutes(app, context);

  app.get("/api/v1/brand-profile", async () => context.db.getBrandProfile("brand-default"));

  if (options.startWatcher !== false) {
    startMediaWatcher(db, app.log);
  }

  app.addHook("onClose", async () => {
    db.close();
  });

  return app;
}
