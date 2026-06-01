// Wire protocol with the gateway (mirror of agent/src/session-do.ts).
// Keep in lockstep with the backend; this is the device side of ADR 0005's relay.

export type ServerMsg =
  | { t: "ready"; room: string }
  | { t: "thread.created"; threadId: string; prompt: string }
  | { t: "app.render"; threadId: string; resourceUri: string; html: string; state: Record<string, any> }
  | { t: "app.tick"; threadId: string; remainingMs: number }
  | { t: "app.state"; threadId: string; state: Record<string, any> }
  | { t: "say"; text: string }
  | { t: "error"; message: string };

export type ClientMsg =
  | { t: "hello"; room: string }
  | { t: "prompt"; text: string }
  | { t: "appEvent"; threadId: string; tool: string; args: Record<string, unknown> };

// host <-> MCP App iframe bridge (the Q5 contract). Messages are tagged by `source`.
export const HOST_SOURCE = "intercom-host";
export const APP_SOURCE = "intercom-app";
export type HostToApp = { source: typeof HOST_SOURCE; type: "init" | "tick" | "state" | "hw"; payload?: any };
export type AppToHost = { source: typeof APP_SOURCE; type: "ready" | "softButtons" | "callTool"; payload?: any };
