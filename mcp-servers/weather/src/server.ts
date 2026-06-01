/*
 * Weather — capability MCP server (Workers-compatible: no fs/process, HTML embedded).
 *
 * Exposes get_weather / dismiss_weather and the ui://weather/card MCP App resource. Unlike the
 * Timer (which self-retires when done), a weather card is an *ambient, timed-persistence* surface
 * (Q6): it stays `fresh` for `ttlSeconds`, then the gateway can drive it `stale` and finally retire
 * it. Same host<->app bridge contract as the Timer/relay spike, so a "Refresh" soft button still
 * round-trips `callServerTool`. In the deployed shape this becomes a standalone remote MCP Worker
 * over streamable HTTP shared by the fleet (ADR 0005); the live fetch uses the platform `fetch`
 * (injectable so tests stay hermetic).   // SEAM: remote streamable-HTTP MCP
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WEATHER_CARD_HTML } from "./card.js";

export const UI_WEATHER = "ui://weather/card";

/** Default freshness window for an ambient weather card (Q6 timed-persistence). */
export const DEFAULT_TTL_SECONDS = 1800; // 30 min

export type WeatherStatus = "fresh" | "stale" | "dismissed";

/** A single upstream observation (what the fetcher returns). */
export interface WeatherObservation {
  location: string;    // resolved, human-readable place name
  tempC: number;
  tempF: number;
  code: number;        // WMO weather-interpretation code
  description: string; // derived from `code`
  observedAt: number;  // epoch ms of the upstream observation
}

/** A recorded card: an observation plus its lifecycle bookkeeping. */
export interface WeatherReport extends WeatherObservation {
  reportId: string;
  query: string;     // what the user asked for (used by the Refresh soft button)
  freshUntil: number; // epoch ms; at/after this the card is stale (Q6)
  status: WeatherStatus;
}

/** Injectable fetcher so tests stay hermetic (no network), mirroring the Timer's purity. */
export type WeatherFetcher = (query: string) => Promise<WeatherObservation>;

export interface WeatherDeps {
  fetchWeather?: WeatherFetcher;
  now?: () => number;
  ttlSeconds?: number;
}

/** WMO weather-code -> short description (covers Open-Meteo's `weather_code`). */
const WMO: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
  85: "Snow showers", 86: "Snow showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ hail",
};

export function describeCode(code: number): string {
  return WMO[code] ?? "Unknown";
}

/**
 * Default network fetcher: Open-Meteo (no API key). Geocode the query, then read current weather.
 * Uses the platform `fetch` (Workers + Node 18+). Swapped for a stub in tests.
 */
export const defaultFetchWeather: WeatherFetcher = async (query) => {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) throw new Error(`geocoding failed (${geoRes.status})`);
  const geo = (await geoRes.json()) as any;
  const place = geo?.results?.[0];
  if (!place) throw new Error(`no match for "${query}"`);
  const fcUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}` +
    `&longitude=${place.longitude}&current=temperature_2m,weather_code`;
  const fcRes = await fetch(fcUrl);
  if (!fcRes.ok) throw new Error(`forecast failed (${fcRes.status})`);
  const fc = (await fcRes.json()) as any;
  const cur = fc?.current ?? {};
  const tempC = Number(cur.temperature_2m);
  const code = Number(cur.weather_code ?? 0);
  const name = [place.name, place.admin1, place.country_code].filter(Boolean).join(", ");
  return {
    location: name,
    tempC,
    tempF: Math.round((tempC * 9) / 5 + 32),
    code,
    description: describeCode(code),
    observedAt: Date.parse(cur.time) || Date.now(),
  };
};

export class WeatherStore {
  private reports = new Map<string, WeatherReport>();
  constructor(
    private now: () => number = () => Date.now(),
    private ttlSeconds = DEFAULT_TTL_SECONDS,
  ) {}

  record(query: string, obs: WeatherObservation): WeatherReport {
    const reportId = "w_" + Math.random().toString(36).slice(2, 9);
    const rep: WeatherReport = {
      ...obs,
      reportId,
      query,
      freshUntil: this.now() + this.ttlSeconds * 1000,
      status: "fresh",
    };
    this.reports.set(reportId, rep);
    return rep;
  }

  get(id: string): WeatherReport | undefined {
    return this.reports.get(id);
  }

  dismiss(id: string): WeatherReport | undefined {
    const rep = this.reports.get(id);
    if (rep) rep.status = "dismissed";
    return rep;
  }

  /** Lifecycle helper (Q6): a live card is stale once it passes its freshness window. */
  isStale(id: string): boolean {
    const rep = this.reports.get(id);
    return !!rep && rep.status !== "dismissed" && this.now() >= rep.freshUntil;
  }
}

export function buildWeatherServer(deps: WeatherDeps = {}): { server: McpServer; store: WeatherStore } {
  const fetchWeather = deps.fetchWeather ?? defaultFetchWeather;
  const now = deps.now ?? (() => Date.now());
  const store = new WeatherStore(now, deps.ttlSeconds ?? DEFAULT_TTL_SECONDS);

  const server = new McpServer({ name: "weather", version: "0.0.1" }, { capabilities: { tools: {}, resources: {} } });

  server.registerResource(
    "card", UI_WEATHER,
    { title: "Weather card", description: "Ambient current-conditions card (e-ink, 1-bit)", mimeType: "text/html+skybridge" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/html+skybridge", text: WEATHER_CARD_HTML }] }),
  );

  server.registerTool(
    "get_weather",
    {
      title: "Get weather",
      description: "Fetch current conditions for a place and render an ambient card that persists until it goes stale.",
      inputSchema: { location: z.string().min(1) },
      _meta: { ui: { resourceUri: UI_WEATHER } },
    },
    async ({ location }) => {
      let obs: WeatherObservation;
      try {
        obs = await fetchWeather(location);
      } catch (err) {
        return { isError: true, content: [{ type: "text", text: `Couldn't get weather for "${location}": ${(err as Error).message}` }] };
      }
      const rep = store.record(location, obs);
      return {
        content: [{ type: "text", text: `${rep.location}: ${rep.tempF}°F (${rep.tempC}°C), ${rep.description}.` }],
        structuredContent: { ...rep } as Record<string, unknown>,
        _meta: { ui: { resourceUri: UI_WEATHER } },
      };
    },
  );

  server.registerTool(
    "dismiss_weather",
    { title: "Dismiss weather card", description: "Retire a weather card.", inputSchema: { reportId: z.string() } },
    async ({ reportId }) => {
      const rep = store.dismiss(reportId);
      if (!rep) return { isError: true, content: [{ type: "text", text: `No weather card ${reportId}` }] };
      return { content: [{ type: "text", text: `Dismissed weather for "${rep.location}".` }], structuredContent: { ...rep } as Record<string, unknown> };
    },
  );

  return { server, store };
}
