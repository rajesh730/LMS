import {
  browseRandomRoute,
  getBaseUrl,
  publicReadOptions,
} from "./helpers.js";

const BASE_URL = getBaseUrl();

export const options = publicReadOptions([
  { duration: "2m", target: 50 },
  { duration: "3m", target: 100 },
  { duration: "5m", target: 100 },
  { duration: "2m", target: 0 },
]);

export default function () {
  browseRandomRoute(BASE_URL);
}

