// Tier-1 unit + MCP-protocol e2e for the Weather capability (ADR 0009).
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  buildWeatherServer, WeatherStore, UI_WEATHER, describeCode, type WeatherFetcher, type WeatherDeps,
} from "../src/server.js";

const stubFetch: WeatherFetcher = async () => ({
  location: "Brooklyn, New York, US",
  tempC: 21, tempF: 70, code: 2, description: "Partly cloudy", observedAt: 1_000,
});

describe("WeatherStore (unit)", () => {
  it("records a fresh card, goes stale past its TTL, and dismisses", () => {
    let t = 10_000;
    const s = new WeatherStore(() => t, 60); // 60s ttl
    const rep = s.record("brooklyn", { location: "Brooklyn", tempC: 21, tempF: 70, code: 2, description: "Partly cloudy", observedAt: 0 });
    expect(rep.status).toBe("fresh");
    expect(rep.freshUntil).toBe(70_000);
    expect(s.isStale(rep.reportId)).toBe(false);
    t = 80_000; // past freshUntil
    expect(s.isStale(rep.reportId)).toBe(true);
    expect(s.dismiss(rep.reportId)?.status).toBe("dismissed");
    expect(s.isStale(rep.reportId)).toBe(false); // a retired card is not "stale"
  });

  it("returns undefined dismissing an unknown id", () => {
    expect(new WeatherStore().dismiss("nope")).toBeUndefined();
  });

  it("maps WMO codes to text (with an Unknown fallback)", () => {
    expect(describeCode(0)).toBe("Clear");
    expect(describeCode(95)).toBe("Thunderstorm");
    expect(describeCode(-1)).toBe("Unknown");
  });
});

describe("Weather MCP server (protocol e2e, in-memory transport)", () => {
  async function connect(deps: WeatherDeps = {}) {
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const { server, store } = buildWeatherServer({ fetchWeather: stubFetch, ...deps });
    await server.connect(st);
    const c = new Client({ name: "test", version: "0" });
    await c.connect(ct);
    return { c, store };
  }

  it("get_weather returns structured state + ui resource meta", async () => {
    const { c } = await connect();
    const r: any = await c.callTool({ name: "get_weather", arguments: { location: "brooklyn" } });
    expect(r.structuredContent.status).toBe("fresh");
    expect(r.structuredContent.tempF).toBe(70);
    expect(r.structuredContent.description).toBe("Partly cloudy");
    expect(r.structuredContent.query).toBe("brooklyn");
    expect(r._meta.ui.resourceUri).toBe(UI_WEATHER);
  });

  it("serves the ui:// weather card resource", async () => {
    const { c } = await connect();
    const r: any = await c.readResource({ uri: UI_WEATHER });
    expect(r.contents[0].mimeType).toBe("text/html+skybridge");
    expect(r.contents[0].text).toContain("intercom-app");
  });

  it("surfaces fetch failures as tool errors (not a thrown protocol error)", async () => {
    const failing: WeatherFetcher = async () => { throw new Error("no match"); };
    const { c } = await connect({ fetchWeather: failing });
    const r: any = await c.callTool({ name: "get_weather", arguments: { location: "nowhere" } });
    expect(r.isError).toBe(true);
  });

  it("dismiss_weather errors on an unknown id", async () => {
    const { c } = await connect();
    const r: any = await c.callTool({ name: "dismiss_weather", arguments: { reportId: "missing" } });
    expect(r.isError).toBe(true);
  });

  it("round-trips get_weather -> dismiss_weather", async () => {
    const { c } = await connect();
    const got: any = await c.callTool({ name: "get_weather", arguments: { location: "brooklyn" } });
    const id = got.structuredContent.reportId;
    const dis: any = await c.callTool({ name: "dismiss_weather", arguments: { reportId: id } });
    expect(dis.structuredContent.status).toBe("dismissed");
  });
});
