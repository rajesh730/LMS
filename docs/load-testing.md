# Load testing Pravyo

This suite tests the staging site with read-only HTTP traffic. It does not
create users, submit writing, send email, or modify application data.

## Safety rules

The default target is:

```text
https://pratyo.infobytesnepal.com
```

The helper permits only that staging hostname and local development hosts.
Every other hostname is rejected unless you deliberately set:

```powershell
$env:LOAD_TEST_ALLOW_PRODUCTION = "true"
```

Do not set that override without written authorization, monitoring, a rollback
plan, and confirmation that the hosting provider permits load testing.

## Install k6 on Windows

With Windows Package Manager:

```powershell
winget install k6 --source winget
k6 version
```

Alternatively, install the official Windows release from the Grafana k6
download page and ensure `k6.exe` is available on `PATH`.

This repository may also have a workspace-local binary under `.tools/k6/`.
That folder is ignored by Git and is machine-specific.

## Routes covered

The stable public page routes are:

- `/`
- `/schools`
- `/student-voices`
- `/events`
- `/winners`
- `/notices`
- `/verify`

There is no `/magazine` listing page. Public magazine pages require an issue
ID under `/magazines/[id]`, so they are not suitable for a static generic URL.
Certificate verification is `/verify`, not `/certificates/verify`.

The mixed test also reads:

- `/api/public/schools`
- `/api/public/events-hub`
- `/api/public/feed`

Every request has an `endpoint` tag. The summary therefore reports p95 for
each route, not only an overall p95.

## Set the target

The staging URL is the default. To set it explicitly in PowerShell:

```powershell
$env:BASE_URL = "https://pratyo.infobytesnepal.com"
```

Environment variables last for the current PowerShell session. Remove one
with:

```powershell
Remove-Item Env:BASE_URL
```

## Recommended test order

Run tests in this order and inspect monitoring data after each level:

```text
smoke -> 100 -> 300 -> 500 -> 900 -> mixed peak
```

Commands:

```powershell
npm run load:smoke
npm run load:public:100
npm run load:public:300
npm run load:public:500
npm run load:public:900
npm run load:mixed
```

Do not jump directly to 900 users. Resource exhaustion is often nonlinear:
a system can look healthy at 100 users and fail abruptly when connection,
memory, CPU, database, or hosting limits are reached.

The 900-user and mixed tests both reach 900 virtual users. Run them only after
the lower levels pass and while MongoDB Atlas and hosting metrics are visible.

## Workload profiles

- `smoke-test.js`: one user requests every public route once.
- `public-read-100.js`: ramps through 50 to 100 users and holds 100.
- `public-read-300.js`: ramps gradually through 100 and 200 to 300.
- `public-read-500.js`: ramps gradually through 100 and 250 to 500.
- `public-read-900.js`: ramps through 100, 300, 500, and 700 to 900.
- `mixed-peak.js`: 800 public-page readers plus 100 public-API readers.

Virtual users sleep for randomized periods between requests. This simulates
human think time, so virtual-user count is not the same as requests per second.
Record both peak VUs and achieved RPS when evaluating capacity.

Authenticated student, teacher, and administrator traffic is not active. The
NextAuth login flow must be verified and dedicated staging accounts created
before adding it. Writing submission is also excluded because it creates
persistent data.

## Pass/fail criteria

The public tests pass only when:

- overall HTTP error rate is below 1%;
- overall p95 latency is below 3 seconds;
- every public route p95 is below 3 seconds;
- more than 99% of response checks pass.

The smoke test uses a stricter 2-second p95. The mixed test permits a 4-second
p95 overall and per route.

A passed k6 threshold means the process exits successfully. It does not prove
production readiness unless the workload, test duration, dataset, geography,
cache state, and infrastructure match expected real usage.

## Reading the summary

- `p(95)`: 95% of requests completed at or below this duration.
- `p(99)`: 99% completed at or below this duration; useful for tail latency.
- `max`: the single slowest response. Investigate spikes, but do not optimize
  from one maximum without checking logs and recurrence.
- `http_req_failed`: transport errors and unexpected HTTP responses.
- `checks`: application-level status assertions.
- `http_reqs` divided by test duration: achieved requests per second.
- `vus`: active simulated users.

An isolated timeout with healthy p95 can be a network anomaly, cold start,
database connection delay, process pause, or resource contention. Repeated
timeouts or rising p99/max values as load increases indicate a capacity or
tail-latency problem. Correlate each spike with server and database timestamps.

## MongoDB Atlas monitoring

Inspect the exact test window and compare it with a no-load baseline:

- connection count and percentage of the connection limit;
- CPU utilization, memory, and cache pressure;
- operation execution time and read/write operation rates;
- query p95 latency and slow query shapes;
- documents examined versus documents returned;
- collection scans and missing-index recommendations;
- disk latency, IOPS, queue depth, and network throughput;
- replication lag and primary elections;
- rejected, queued, or timed-out operations.

Use Query Insights, Query Profiler, and Performance Advisor. Review index
suggestions rather than applying them blindly: indexes consume storage and
memory and increase write cost.

## Hosting and server logs

For the same test window, inspect:

- request duration and status grouped by route;
- `429`, `499`, `502`, `503`, and `504` responses;
- application exceptions and MongoDB selection/connection timeouts;
- CPU saturation or throttling;
- memory growth, out-of-memory termination, and process restarts;
- event-loop lag and garbage-collection pauses;
- cold starts and instance scaling;
- active requests, queue depth, and connection-pool waits;
- reverse-proxy/CDN cache hit ratio;
- bandwidth and provider request limits.

Stop a test before its scheduled end if errors approach 1%, p95 exceeds the
target persistently, timeouts recur, or a critical resource remains saturated.
