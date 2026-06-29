import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 5 },
    { duration: "2m", target: 10 },
    { duration: "2m", target: 20 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
    checks: ["rate>0.99"],
  },
};

const BASE_URL = "https://pratyo.infobytesnepal.com";

export default function () {
  const pages = [
    "/",
    "/schools",
    "/events",
    "/notices",
    "/api/public/schools",
    "/api/public/events-hub",
  ];

  for (const path of pages) {
    const response = http.get(`${BASE_URL}${path}`, {
      tags: { endpoint: path },
      timeout: "10s",
    });

    check(response, {
      [`${path} responded successfully`]: (result) =>
        result.status >= 200 && result.status < 400,
    });

    sleep(1);
  }
}
