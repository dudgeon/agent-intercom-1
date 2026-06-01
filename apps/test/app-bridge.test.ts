// Tier-1 unit: the host<->app iframe contract (ADR 0010 / Q5), with a fake app.
import { describe, it, expect, vi } from "vitest";
import { AppBridge } from "../src/core/app-bridge.js";
import { APP_SOURCE } from "../src/core/protocol.js";

function makeBridge() {
  const posted: any[] = [];
  const calls: Array<{ tool: string; args: any }> = [];
  const bridge = new AppBridge("a", (m) => posted.push(m), (tool, args) => calls.push({ tool, args }));
  return { bridge, posted, calls };
}

describe("AppBridge", () => {
  it("waits for the app's ready before sending init (buffers state)", () => {
    const { bridge, posted } = makeBridge();
    bridge.renderState({ timerId: "t1" });          // app not ready yet
    expect(posted).toHaveLength(0);
    bridge.handleAppMessage({ source: APP_SOURCE, type: "ready" });
    expect(posted).toEqual([{ type: "init", payload: { state: { timerId: "t1" } } }]);
  });

  it("forwards tick/state and hardware events to the app", () => {
    const { bridge, posted } = makeBridge();
    bridge.handleAppMessage({ source: APP_SOURCE, type: "ready" });
    posted.length = 0;
    bridge.tick(2500);
    bridge.state({ status: "done" });
    bridge.hardware("softbutton", "Dismiss");
    expect(posted).toEqual([
      { type: "tick", payload: { remainingMs: 2500 } },
      { type: "state", payload: { status: "done" } },
      { type: "hw", payload: { control: "softbutton", id: "Dismiss" } },
    ]);
  });

  it("captures soft-button labels and forwards callTool out to the gateway", () => {
    const { bridge, calls } = makeBridge();
    bridge.handleAppMessage({ source: APP_SOURCE, type: "softButtons", payload: { labels: ["Dismiss"] } });
    expect(bridge.softButtons).toEqual(["Dismiss"]);
    bridge.handleAppMessage({ source: APP_SOURCE, type: "callTool", payload: { tool: "dismiss_timer", args: { timerId: "t1" } } });
    expect(calls).toEqual([{ tool: "dismiss_timer", args: { timerId: "t1" } }]);
  });

  it("ignores messages that aren't from the app", () => {
    const { bridge, calls } = makeBridge();
    bridge.handleAppMessage({ source: "someone-else" as any, type: "callTool", payload: { tool: "x" } });
    expect(calls).toHaveLength(0);
  });
});
