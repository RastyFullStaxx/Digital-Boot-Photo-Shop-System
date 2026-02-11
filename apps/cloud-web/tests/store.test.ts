import { describe, expect, it } from "vitest";
import { upsertSession, listSessions } from "../lib/store";

describe("cloud store", () => {
  it("stores and lists synced sessions", () => {
    upsertSession({
      id: "session-test-1",
      boothId: "booth-001",
      status: "active",
      startedAt: new Date().toISOString(),
      endedAt: null
    });

    const result = listSessions(1, 20);
    const hasSession = result.items.some((item) => item.id === "session-test-1");

    expect(hasSession).toBe(true);
  });
});
