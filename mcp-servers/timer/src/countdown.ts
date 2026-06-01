/*
 * Timer MCP App — e-ink build (ADR 0007).
 *
 * 1-bit, high-contrast, NO animation/transitions. It does not self-tick (e-ink can't); it
 * repaints only when the host sends an `init`/`tick`/`state` message (gateway drives ticks on a
 * ~5s cadence). Same host<->app bridge contract as the relay spike, so hardware events
 * (mic/soft buttons) and `callServerTool` still round-trip.
 */
export const COUNTDOWN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Timer</title>
<style>
  html,body{margin:0;height:100%;background:#fff;color:#000;font-family:Georgia,serif;}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}
  #label{font-size:20px;letter-spacing:.12em;text-transform:uppercase;}
  #time{font-size:96px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1;}
  #bar{width:70%;height:10px;border:2px solid #000;}
  #fill{height:100%;background:#000;width:100%;}
  #status{font-size:18px;min-height:22px;}
  .done #time{ text-decoration:underline; }
  .dismissed{ opacity:.4; }
  #hint{position:fixed;bottom:8px;font-size:12px;}
</style>
</head>
<body>
  <div id="label">Timer</div>
  <div id="time">--:--</div>
  <div id="bar"><div id="fill"></div></div>
  <div id="status"></div>
  <div id="hint">mic switch · Dismiss</div>
<script>
const HOST="intercom-host",APP="intercom-app";
function send(t,p){parent.postMessage({source:APP,type:t,payload:p},"*");}
let timerId=null,endTime=0,durationMs=0;
function fmt(ms){ms=Math.max(0,ms);var s=Math.round(ms/1000),m=Math.floor(s/60);return m+":"+String(s%60).padStart(2,"0");}
function paint(rem){document.getElementById("time").textContent=fmt(rem);
  var pct=durationMs>0?Math.max(0,Math.min(1,rem/durationMs)):0;
  document.getElementById("fill").style.width=(pct*100).toFixed(0)+"%";}
function init(s){timerId=s.timerId;endTime=s.endTime;durationMs=s.durationSeconds*1000;
  document.getElementById("label").textContent=s.label||"Timer";document.body.className="";
  document.getElementById("status").textContent="";paint(endTime-Date.now());
  send("softButtons",{labels:["Dismiss"]});send("ready",{});}
window.addEventListener("message",function(e){var m=e.data||{};if(m.source!==HOST)return;
  if(m.type==="init")init(m.payload.state);
  else if(m.type==="tick")paint(m.payload.remainingMs);
  else if(m.type==="state"){var st=m.payload.status;
    if(st==="done"){document.body.className="done";paint(0);document.getElementById("status").textContent="Done — press Dismiss";}
    else if(st==="dismissed"){document.body.className="dismissed";document.getElementById("status").textContent="Dismissed";}}
  else if(m.type==="hw"){var c=m.payload.control;
    if(c==="softbutton"&&m.payload.id==="Dismiss")send("callTool",{tool:"dismiss_timer",args:{timerId:timerId}});}
});
send("ready",{});
</script>
</body>
</html>`;
