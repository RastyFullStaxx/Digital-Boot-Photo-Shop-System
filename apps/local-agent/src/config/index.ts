import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

export const config = {
  port: Number(process.env.LOCAL_AGENT_PORT ?? 4477),
  host: process.env.LOCAL_AGENT_HOST ?? "127.0.0.1",
  boothId: process.env.BOOTH_ID ?? "booth-001",
  watchedDirectory: process.env.WATCHED_DIRECTORY ?? path.join(rootDir, "uploads", "inbox"),
  mediaDirectory: process.env.MEDIA_DIRECTORY ?? path.join(rootDir, "uploads", "media"),
  previewDirectory: process.env.PREVIEW_DIRECTORY ?? path.join(rootDir, "previews"),
  renderDirectory: process.env.RENDER_DIRECTORY ?? path.join(rootDir, "renders"),
  dataDirectory: process.env.DATA_DIRECTORY ?? path.join(rootDir, "data"),
  cloudApiBaseUrl: process.env.CLOUD_API_BASE_URL ?? "http://127.0.0.1:3000/api/v1",
  cloudApiToken: process.env.CLOUD_API_TOKEN ?? "",
  logLevel: process.env.LOG_LEVEL ?? "info"
};
