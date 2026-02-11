import { buildApp } from "./app.js";
import { config } from "./config/index.js";

const app = buildApp({ startWatcher: true });

app
  .listen({
    host: config.host,
    port: config.port
  })
  .then(() => {
    app.log.info(
      {
        host: config.host,
        port: config.port,
        watchedDirectory: config.watchedDirectory
      },
      "Local agent started"
    );
  })
  .catch((error) => {
    app.log.error({ error }, "Failed to start local agent");
    process.exit(1);
  });
