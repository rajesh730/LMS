import { sleep } from "k6";
import {
  PUBLIC_API_ROUTES,
  PUBLIC_ROUTES,
  commonThresholds,
  getBaseUrl,
  randomItem,
  randomThinkTime,
  requestRoute,
} from "./helpers.js";

const BASE_URL = getBaseUrl();
const MIXED_ROUTES = [...PUBLIC_ROUTES, ...PUBLIC_API_ROUTES];

export const options = {
  scenarios: {
    public_page_readers: {
      executor: "ramping-vus",
      exec: "browsePublicPage",
      startVUs: 0,
      stages: [
        { duration: "5m", target: 250 },
        { duration: "5m", target: 500 },
        { duration: "5m", target: 800 },
        { duration: "7m", target: 800 },
        { duration: "5m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
    public_api_readers: {
      executor: "ramping-vus",
      exec: "browsePublicApi",
      startVUs: 0,
      stages: [
        { duration: "5m", target: 25 },
        { duration: "5m", target: 50 },
        { duration: "5m", target: 100 },
        { duration: "7m", target: 100 },
        { duration: "5m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: commonThresholds(4000, MIXED_ROUTES),
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export function browsePublicPage() {
  requestRoute(BASE_URL, randomItem(PUBLIC_ROUTES));
  sleep(randomThinkTime(2, 7));
}

export function browsePublicApi() {
  requestRoute(BASE_URL, randomItem(PUBLIC_API_ROUTES));
  sleep(randomThinkTime(3, 8));
}

/*
 * Authenticated scenarios are intentionally disabled.
 *
 * Before implementing them, confirm the NextAuth CSRF/session flow, create
 * dedicated staging-only accounts, and ensure email and other side effects are
 * disabled. Credentials must come only from:
 * TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD
 * TEST_TEACHER_EMAIL / TEST_TEACHER_PASSWORD
 * TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 *
 * Writing submission is not implemented because it mutates persistent data.
 */
