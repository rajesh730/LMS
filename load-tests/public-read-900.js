import {
  browseRandomRoute,
  getBaseUrl,
  publicReadOptions,
} from "./helpers.js";

const BASE_URL = getBaseUrl();

export const options = publicReadOptions([
  { duration: "4m", target: 100 },
  { duration: "5m", target: 300 },
  { duration: "5m", target: 500 },
  { duration: "6m", target: 700 },
  { duration: "6m", target: 900 },
  { duration: "7m", target: 900 },
  { duration: "5m", target: 0 },
]);

export default function () {
  browseRandomRoute(BASE_URL);
}

