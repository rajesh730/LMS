import {
  browseRandomRoute,
  getBaseUrl,
  publicReadOptions,
} from "./helpers.js";

const BASE_URL = getBaseUrl();

export const options = publicReadOptions([
  { duration: "3m", target: 100 },
  { duration: "4m", target: 250 },
  { duration: "5m", target: 500 },
  { duration: "5m", target: 500 },
  { duration: "4m", target: 0 },
]);

export default function () {
  browseRandomRoute(BASE_URL);
}

