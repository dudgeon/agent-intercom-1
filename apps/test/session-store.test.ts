// Tier-1 unit: the server-authoritative session mirror (ADR 0009/0010).
import { describe, it, expect } from "vitest";
import { SessionStore } from "../src/core/session-store.js";

describe("SessionStore", () => {
  it("creates side-by-side threads in arrival order", () => {
    const s = new SessionStore();
    s.apply({ t: "thread.created", threadId: "a", prompt: "tea" });
    s.apply({ t: "thread.created", threadId: "b", prompt: "pasta" });
    expect(s.order).toEqual(["a", "b"]);
    expect(s.threads.get("b")!.prompt).toBe("pasta");
  });

  it("renders an app, then tracks ticks and state", () => {
    const changes: string[] = [];
    const s = new SessionStore((_t, kind) => changes.push(kind));
    s.apply({ t: "thread.created", threadId: "a", prompt: "tea" });
    s.apply({ t: "app.render", threadId: "a", resourceUri: "ui://timer/countdown", html: "<x>", state: { timerId: "t1", status: "running" } });
    s.apply({ t: "app.tick", threadId: "a", remainingMs: 4200 });
    s.apply({ t: "app.state", threadId: "a", state: { status: "dismissed" } });
    const th = s.threads.get("a")!;
    expect(th.resourceUri).toBe("ui://timer/countdown");
    expect(th.state.remainingMs).toBe(4200);
    expect(th.state.timerId).toBe("t1");        // state is merged, not replaced
    expect(th.state.status).toBe("dismissed");
    expect(changes).toEqual(["created", "render", "tick", "state"]);
  });

  it("ignores tick/state for unknown threads", () => {
    const s = new SessionStore();
    s.apply({ t: "app.tick", threadId: "ghost", remainingMs: 1 });
    expect(s.threads.size).toBe(0);
  });
});
