import http from "k6/http";
import { check, sleep } from "k6";

export const DEFAULT_BASE_URL = "https://pratyo.infobytesnepal.com";

export const PUBLIC_ROUTES = Object.freeze([
  { name: "home", path: "/" },
  { name: "schools", path: "/schools" },
  { name: "student_voices", path: "/student-voices" },
  { name: "events", path: "/events" },
  { name: "winners", path: "/winners" },
  { name: "notices", path: "/notices" },
  { name: "certificate_verify", path: "/verify" },
]);

export const PUBLIC_API_ROUTES = Object.freeze([
  { name: "api_public_schools", path: "/api/public/schools" },
  { name: "api_public_events", path: "/api/public/events-hub" },
  { name: "api_public_feed", path: "/api/public/feed" },
]);

const SAFE_HOSTNAMES = new Set([
  "pratyo.infobytesnepal.com",
  "localhost",
  "127.0.0.1",
  "::1",
]);

export function getBaseUrl() {
  const rawBaseUrl = (__ENV.BASE_URL || DEFAULT_BASE_URL).trim();
  const urlMatch = rawBaseUrl.match(
    /^https?:\/\/(\[[^\]]+\]|[^/:?#]+)(?::\d+)?(?:[/?#]|$)/i,
  );

  if (!urlMatch) {
    throw new Error(
      `Invalid BASE_URL "${rawBaseUrl}": expected an http:// or https:// URL`,
    );
  }

  const hostname = urlMatch[1].replace(/^\[|\]$/g, "").toLowerCase();

  const productionOverride =
    String(__ENV.LOAD_TEST_ALLOW_PRODUCTION || "").toLowerCase() === "true";

  if (!SAFE_HOSTNAMES.has(hostname) && !productionOverride) {
    throw new Error(
      `Refusing to load test non-staging host "${hostname}". ` +
        "Set LOAD_TEST_ALLOW_PRODUCTION=true only with explicit authorization.",
    );
  }

  return rawBaseUrl.replace(/\/+$/, "");
}

export function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomThinkTime(minSeconds = 1, maxSeconds = 5) {
  return minSeconds + Math.random() * (maxSeconds - minSeconds);
}

export function requestRoute(baseUrl, route) {
  const response = http.get(`${baseUrl}${route.path}`, {
    tags: { endpoint: route.name },
    timeout: "10s",
  });

  check(response, {
    [`${route.name}: status is 2xx or 3xx`]: (result) =>
      result.status >= 200 && result.status < 400,
  });

  return response;
}

export function browseRandomRoute(baseUrl, routes = PUBLIC_ROUTES) {
  requestRoute(baseUrl, randomItem(routes));
  sleep(randomThinkTime());
}

export function routeThresholds(routes, p95Milliseconds) {
  return Object.fromEntries(
    routes.map((route) => [
      `http_req_duration{endpoint:${route.name}}`,
      [`p(95)<${p95Milliseconds}`],
    ]),
  );
}

export function commonThresholds(p95Milliseconds, routes = PUBLIC_ROUTES) {
  return {
    http_req_failed: ["rate<0.01"],
    http_req_duration: [`p(95)<${p95Milliseconds}`],
    checks: ["rate>0.99"],
    ...routeThresholds(routes, p95Milliseconds),
  };
}

export function publicReadOptions(stages) {
  return {
    stages,
    thresholds: commonThresholds(3000),
    summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
  };
}
