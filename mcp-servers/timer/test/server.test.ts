// Tier-1 unit + MCP-protocol e2e for the Timer capability (ADR 0009).
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildTimerServer, TimerStore, UI_COUNTDOWN } from "../src/server.js";

describe("TimerStore (unit)", () => {
  it("creates a running timer and dismisses it", () => {
    const s = new TimerStore();
    const rec = s.create(60, "tea");
    expect(rec.status).toBe("running");
    expect(rec.endTime).toBeGreaterThan(Date.now());
    expect(s.dismiss(rec.timerId)?.status).toBe("dismissed");
  });
  it("returns undefined dismissing an unknown id", () => {
    expect(new TimerStore().dismiss("nope")).toBeUndefined();
  });
});

describe("Timer MCP server (protocol e2e, in-memory transport)", () => {
  async function connect() {
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const { server } = buildTimerServer();
    await server.connect(st);
    const c = new Client({ name: "test", version: "0" });
    await c.connect(ct);
    return c;
  }

  it("set_timer returns structured state + ui resource meta", async () => {
    const c = await connect();
    const r: any = await c.callTool({ name: "set_timer", arguments: { durationSeconds: 60, label: "tea" } });
    expect(r.structuredContent.status).toBe("running");
    expect(r.structuredContent.label).toBe("tea");
    expect(r._meta.ui.resourceUri).toBe(UI_COUNTDOWN);
  });

  it("serves the ui:// countdown app resource", async () => {
    const c = await connect();
    const r: any = await c.readResource({ uri: UI_COUNTDOWN });
    expect(r.contents[0].mimeType).toBe("text/html+skybridge");
    expect(r.contents[0].text).toContain("intercom-app");
  });

  it("dismiss_timer errors on an unknown id", async () => {
    const c = await connect();
    const r: any = await c.callTool({ name: "dismiss_timer", arguments: { timerId: "missing" } });
    expect(r.isError).toBe(true);
  });
});
