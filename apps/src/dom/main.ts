// DOM adapter (ADR 0010): renders the thread column + one sandboxed iframe per ui:// app, and
// wires real postMessage to the core. The same code runs in a desktop browser (dev) and the
// SBC kiosk WebView. e-ink discipline: no animation; updates flow to apps via postMessage, not
// by re-creating iframes.
import { GatewayClient } from "../core/gateway-client.js";
import { SessionStore } from "../core/session-store.js";
import { AppBridge } from "../core/app-bridge.js";
import { HOST_SOURCE, type ServerMsg } from "../core/protocol.js";

const q = new URLSearchParams(location.search);
const room = q.get("room") ?? "Kitchen";
const device = q.get("device") ?? "kitchen";
const gwBase = q.get("gw") ?? `ws://${location.hostname || "127.0.0.1"}:8788`;

const root = document.getElementById("app")!;
root.innerHTML = `
  <div class="bar">
    <span class="room">${room}</span>
    <button class="mic" id="mic">MIC LIVE</button>
    <input id="say-input" placeholder="type a prompt (dev)…" />
    <button id="send">Send</button>
  </div>
  <div class="threads" id="threads"></div>
  <div class="softbar" id="softbar"></div>
  <div class="say" id="say"></div>`;

const threadsEl = root.querySelector<HTMLDivElement>("#threads")!;
const softbarEl = root.querySelector<HTMLDivElement>("#softbar")!;
const sayEl = root.querySelector<HTMLDivElement>("#say")!;
const micBtn = root.querySelector<HTMLButtonElement>("#mic")!;

const bridges = new Map<string, AppBridge>();          // threadId -> bridge
const sources = new Map<Window, string>();             // iframe.contentWindow -> threadId
let focused: string | undefined;                       // most recent app (gets hardware events)

const store = new SessionStore();
const gw = new GatewayClient(`${gwBase}/device?device=${device}`, {
  onMessage: handle,
  onOpen: () => gw.hello(room),
});

function handle(m: ServerMsg) {
  store.apply(m);
  switch (m.t) {
    case "thread.created": createCard(m.threadId, m.prompt); break;
    case "app.render": mountApp(m.threadId, m.html, m.state); break;
    case "app.tick": bridges.get(m.threadId)?.tick(m.remainingMs); break;
    case "app.state": bridges.get(m.threadId)?.state(m.state); break;
    case "say": sayEl.textContent = `🔊 ${m.text}`; break;   // audio is the real-time channel
    case "error": sayEl.textContent = `⚠ ${m.message}`; break;
  }
}

function createCard(threadId: string, prompt: string) {
  if (document.getElementById(`th-${threadId}`)) return;
  const el = document.createElement("section");
  el.className = "thread";
  el.id = `th-${threadId}`;
  el.innerHTML = `<div class="prompt">“${prompt}”</div>`;
  threadsEl.appendChild(el);
}

function mountApp(threadId: string, html: string, state: Record<string, any>) {
  createCard(threadId, store.threads.get(threadId)?.prompt ?? "");
  const card = document.getElementById(`th-${threadId}`)!;
  if (card.querySelector("iframe")) return; // already mounted; updates go via postMessage
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.srcdoc = html;
  card.appendChild(frame);
  const win = frame.contentWindow!;
  sources.set(win, threadId);
  const bridge = new AppBridge(
    threadId,
    (msg) => win.postMessage({ source: HOST_SOURCE, ...msg }, "*"),
    (tool, args) => gw.appEvent(threadId, tool, args),
  );
  bridges.set(threadId, bridge);
  bridge.renderState(state);
  focused = threadId;
  renderSoftButtons();
}

// app -> host messages
window.addEventListener("message", (e) => {
  const id = sources.get(e.source as Window);
  if (!id) return;
  bridges.get(id)?.handleAppMessage(e.data);
  if (e.data?.type === "softButtons") renderSoftButtons();
});

function renderSoftButtons() {
  const b = focused ? bridges.get(focused) : undefined;
  softbarEl.innerHTML = "";
  for (const label of b?.softButtons ?? []) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = () => b!.hardware("softbutton", label); // simulated hardware soft-button
    softbarEl.appendChild(btn);
  }
}

// dev affordances
let muted = false;
micBtn.onclick = () => {
  muted = !muted;
  micBtn.classList.toggle("muted", muted);
  micBtn.textContent = muted ? "MIC MUTED" : "MIC LIVE";
};
const input = root.querySelector<HTMLInputElement>("#say-input")!;
const submit = () => { const t = input.value.trim(); if (t && !muted) { gw.prompt(t); input.value = ""; } };
root.querySelector<HTMLButtonElement>("#send")!.onclick = submit;
input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

gw.connect().catch((e) => { sayEl.textContent = `⚠ gateway: ${e}`; });
