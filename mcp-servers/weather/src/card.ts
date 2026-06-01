/*
 * Weather MCP App — e-ink build (ADR 0007).
 *
 * 1-bit, high-contrast, NO animation/transitions. It does not self-update; it repaints only when
 * the host sends an `init`/`tick`/`state` message. Unlike the Timer it is an *ambient* card with
 * timed persistence (Q6): `tick` carries the card's age so it can show "as of … ago"; `state`
 * flips it to `stale` (past its freshness window) or `dismissed` (retired). Same host<->app bridge
 * contract as the Timer/relay spike, so the Refresh/Dismiss soft buttons round-trip `callTool`.
 */
export const WEATHER_CARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Weather</title>
<style>
  html,body{margin:0;height:100%;background:#fff;color:#000;font-family:Georgia,serif;}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;}
  #place{font-size:22px;letter-spacing:.08em;text-transform:uppercase;text-align:center;padding:0 16px;}
  #temp{font-size:88px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1;}
  #desc{font-size:24px;}
  #age{font-size:16px;min-height:20px;}
  .stale{opacity:.5;}
  .stale #age:after{content:" \\00B7 say \\201Crefresh\\201D";}
  .dismissed{opacity:.25;}
  #hint{position:fixed;bottom:8px;font-size:12px;}
</style>
</head>
<body>
  <div id="place">\\2014</div>
  <div id="temp">--\\00B0</div>
  <div id="desc"></div>
  <div id="age"></div>
  <div id="hint">mic switch \\00B7 Refresh \\00B7 Dismiss</div>
<script>
const HOST="intercom-host",APP="intercom-app";
function send(t,p){parent.postMessage({source:APP,type:t,payload:p},"*");}
let reportId=null,query=null,unit="F";
function ageText(ms){if(ms==null)return"";var m=Math.max(0,Math.round(ms/60000));return m<1?"just updated":("as of "+m+" min ago");}
function paintTemp(s){var t=unit==="F"?s.tempF:s.tempC;document.getElementById("temp").textContent=Math.round(t)+"\\00B0"+unit;}
function init(s){reportId=s.reportId;query=s.query||s.location;
  document.getElementById("place").textContent=s.location||s.query||"Weather";
  paintTemp(s);
  document.getElementById("desc").textContent=s.description||"";
  document.body.className="";
  document.getElementById("age").textContent=ageText(Date.now()-(s.observedAt||Date.now()));
  send("softButtons",{labels:["Refresh","Dismiss"]});send("ready",{});}
window.addEventListener("message",function(e){var m=e.data||{};if(m.source!==HOST)return;
  if(m.type==="init")init(m.payload.state);
  else if(m.type==="tick")document.getElementById("age").textContent=ageText(m.payload.ageMs);
  else if(m.type==="state"){var st=m.payload.status;
    if(st==="stale")document.body.className="stale";
    else if(st==="fresh")document.body.className="";
    else if(st==="dismissed"){document.body.className="dismissed";document.getElementById("age").textContent="Dismissed";}}
  else if(m.type==="hw"){var c=m.payload.control;
    if(c==="softbutton"&&m.payload.id==="Refresh")send("callTool",{tool:"get_weather",args:{location:query}});
    else if(c==="softbutton"&&m.payload.id==="Dismiss")send("callTool",{tool:"dismiss_weather",args:{reportId:reportId}});}
});
send("ready",{});
</script>
</body>
</html>`;
