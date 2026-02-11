import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";

describe("local agent health route", () => {
  const app = buildApp({ startWatcher: false });

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns health payload", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health"
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("local-agent");
  });
});
