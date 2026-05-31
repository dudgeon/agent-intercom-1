// Tier-1 unit tests for the harness boundary (ADR 0009). Pure logic, no Workers runtime.
import { describe, it, expect } from "vitest";
import { MockHarness } from "../src/harness.js";

const h = new MockHarness();

describe("MockHarness.handle", () => {
  it("parses minutes + a label into a set_timer call", async () => {
    const r = await h.handle("set a 5 minute timer for pasta");
    expect(r.actions).toHaveLength(1);
    expect(r.actions[0]).toMatchObject({
      type: "callTool", server: "timer", tool: "set_timer",
      args: { durationSeconds: 300, label: "pasta" },
    });
    expect(r.say).toContain("pasta");
  });

  it("parses plural seconds", async () => {
    const r = await h.handle("timer 30 seconds");
    expect(r.actions[0].args.durationSeconds).toBe(30);
  });

  it("parses plural minutes (regression: plurals must not be dropped)", async () => {
    const r = await h.handle("set a 10 minutes timer");
    expect(r.actions[0].args.durationSeconds).toBe(600);
  });

  it("parses hours", async () => {
    const r = await h.handle("set a 1 hour timer");
    expect(r.actions[0].args.durationSeconds).toBe(3600);
    expect(r.actions[0].args.label).toBe("Timer");
  });

  it("returns no actions when there is no timer intent", async () => {
    const r = await h.handle("what's the weather today");
    expect(r.actions).toHaveLength(0);
    expect(r.say).toMatch(/only knows timers/i);
  });
});
