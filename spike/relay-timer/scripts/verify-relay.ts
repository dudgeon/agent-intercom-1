/*
 * Automated end-to-end verification of the brain->renderer relay (ADR 0005).
 *
 * Proves, over a real WebSocket between an external renderer and the gateway:
 *   A. prompt -> harness -> MCP set_timer -> tool result carries _meta.ui.resourceUri
 *      -> gateway reads the ui:// resource and relays HTML + state to the device.
 *   B. gateway-owned lifecycle: live ticks stream down; timer retires (status "done") on expiry.
 *   C. hardware soft button -> app callServerTool(dismiss_timer) -> proxied to the MCP server
 *      (source of truth) -> dismissed state relayed back; ticking stops.
 */
import { Gateway } from "../src/gateway/server.js";
import { HeadlessDevice } from "../src/device/headless-device.js";
import { UI_COUNTDOWN } from "../src/mcp/timer-server.js";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
}

const gw = new Gateway();
const port = await gw.start(0);
const dev = new HeadlessDevice("kitchen-01", "Kitchen", `ws://localhost:${port}`);
await dev.connect();

// ---- Scenario A + B: short timer renders, ticks, and retires on expiry --------------------
console.log("\nScenario A/B — render + live ticks + expiry");
dev.prompt("set a 3 second timer for the tea");

const created = await dev.once((m) => m.t === "thread.created");
check("thread created with prompt echoed", created.prompt.includes("tea"));

const render = await dev.once((m) => m.t === "app.render");
check("app.render carries the ui:// resource", render.resourceUri === UI_COUNTDOWN, render.resourceUri);
check("relayed HTML is the countdown bundle", typeof render.html === "string" && render.html.includes("Agent Intercom — MCP App bridge"));
check("initial state has timerId + endTime", !!render.state.timerId && render.state.endTime > Date.now());

const ticks = await dev.waitForTicks(render.threadId, 3);
check("live ticks stream to the device", ticks.length >= 3, `remaining(ms): ${ticks.slice(0, 3).join(", ")}…`);
check("ticks count down", ticks[0] > ticks[ticks.length - 1]);

const done = await dev.once((m) => m.t === "app.state" && m.state?.status === "done", 6000);
check("timer retires itself (status=done)", done.state.status === "done");

// ---- Scenario C: hardware soft button dismisses via callServerTool ------------------------
console.log("\nScenario C — soft button -> callServerTool(dismiss_timer) round-trip");
dev.prompt("set a 30 minute timer for the laundry");
const render2 = await dev.once((m) => m.t === "app.render");
check("second timer rendered", !!render2.state.timerId, render2.state.label);
await dev.waitForTicks(render2.threadId, 1);

dev.pressSoftButton(render2.threadId, "Dismiss"); // hardware press -> app bridge -> callTool
const dismissed = await dev.once((m) => m.t === "app.state" && m.state?.status === "dismissed", 4000);
check("MCP server confirmed dismissal (source of truth)", dismissed.state.status === "dismissed");
check("dismissed state echoes the right timer", dismissed.state.timerId === render2.state.timerId);

// no more ticks should arrive for the dismissed thread
const ticksBefore = dev.tickCount(render2.threadId);
await new Promise((r) => setTimeout(r, 600));
check("ticking stopped after dismissal", dev.tickCount(render2.threadId) === ticksBefore);

// ---- transcript + teardown ----------------------------------------------------------------
console.log("\nDevice transcript:");
for (const line of dev.log) console.log("   " + line);

dev.close();
await gw.stop();

console.log(`\n${failures === 0 ? "✅ RELAY VERIFIED — all checks passed" : `❌ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
