// The host<->MCP App contract (ADR 0010 / Q5). One bridge per rendered ui:// app. DOM-agnostic:
// `postToApp` is how we reach the iframe; `onCallTool` is how an app action leaves for the gateway.
import { APP_SOURCE, type AppToHost, type HostToApp } from "./protocol.js";

export class AppBridge {
  private ready = false;
  private lastState: Record<string, any> = {};
  softButtons: string[] = [];

  constructor(
    readonly threadId: string,
    private postToApp: (msg: Omit<HostToApp, "source">) => void,
    private onCallTool: (tool: string, args: Record<string, unknown>) => void,
  ) {}

  // gateway -> app
  renderState(state: Record<string, any>) {
    this.lastState = state;
    if (this.ready) this.postToApp({ type: "init", payload: { state } });
  }
  tick(remainingMs: number) { this.postToApp({ type: "tick", payload: { remainingMs } }); }
  state(state: Record<string, any>) { this.postToApp({ type: "state", payload: state }); }

  // hardware -> focused app (mic switch, soft buttons, scroll wheel)
  hardware(control: string, id?: string) { this.postToApp({ type: "hw", payload: { control, id } }); }

  // app -> host
  handleAppMessage(msg: AppToHost) {
    if (!msg || msg.source !== APP_SOURCE) return;
    switch (msg.type) {
      case "ready":
        this.ready = true;
        this.postToApp({ type: "init", payload: { state: this.lastState } });
        break;
      case "softButtons":
        this.softButtons = msg.payload?.labels ?? [];
        break;
      case "callTool":
        if (msg.payload?.tool) this.onCallTool(msg.payload.tool, msg.payload.args ?? {});
        break;
    }
  }
}
