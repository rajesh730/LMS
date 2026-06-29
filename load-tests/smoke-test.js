import { sleep } from "k6";
import {
  PUBLIC_ROUTES,
  commonThresholds,
  getBaseUrl,
  requestRoute,
} from "./helpers.js";

const BASE_URL = getBaseUrl();

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: commonThresholds(2000),
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export default function () {
  for (const route of PUBLIC_ROUTES) {
    requestRoute(BASE_URL, route);
    sleep(1);
  }
}

