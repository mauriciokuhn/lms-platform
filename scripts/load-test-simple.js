// ──────────────────────────────────────────
// k6 Smoke Test
// ──────────────────────────────────────────
//
// Quick test to verify endpoints are working.
// Run: k6 run scripts/load-test-simple.js
//
// This test uses minimal load (1-2 VUs) to validate
// the API is functional before running full load tests.

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 2,
  duration: "10s",
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.1"],
  },
};

export default function () {
  const endpoints = [
    { url: "/api/courses", name: "Courses List" },
    { url: "/api/instructors", name: "Instructors List" },
    { url: "/api/admin/metrics", name: "Admin Metrics" },
    { url: "/api/certificates", name: "Certificates" },
    { url: "/api/enrollments", name: "Enrollments" },
    { url: "/api/gamification/ranking", name: "Ranking" },
    { url: "/api/notifications", name: "Notifications" },
    { url: "/api/recommendations", name: "Recommendations" },
  ];

  // Test each endpoint
  endpoints.forEach(({ url, name }) => {
    const res = http.get(`${BASE_URL}${url}`, {
      tags: { name },
    });

    check(res, {
      [`GET ${name} - status < 500`]: (r) => r.status < 500,
      [`GET ${name} - response time < 3s`]: (r) => r.timings.duration < 3000,
    });

    sleep(0.5);
  });
}
