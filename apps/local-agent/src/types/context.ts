import type { LocalAgentDatabase } from "../db/index.js";
import type { PrintQueueService } from "../services/printQueue.js";
import type { SyncService } from "../services/sync.js";

export interface AppContext {
  db: LocalAgentDatabase;
  printQueue: PrintQueueService;
  sync: SyncService;
}
