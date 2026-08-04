// ──────────────────────────────────────────
// k6 Load Testing Script
// ──────────────────────────────────────────
//
// Run: k6 run scripts/load-test.js
//
// Tests the following endpoints under load:
// 1. GET /api/courses — Course catalog (anonymous)
// 2. GET /api/courses/[id] — Course detail (anonymous)
// 3. POST /api/register — User registration
// 4. POST /api/auth/callback/credentials — Login
// 5. GET /api/instructors — Instructor listing
//
// Scenarios:
// - Ramping up to 50 virtual users over 30s
// - Sustained load for 60s
// - Ramping down over 30s

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// ──────────────────────────────────────────
// Metrics
// ──────────────────────────────────────────

const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency_ms");

// ──────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const STAGES = [
  { duration: "30s", target: 10 },  // Ramp up to 10 VUs
  { duration: "30s", target: 50 },  // Ramp up to 50 VUs
  { duration: "60s", target: 50 },  // Stay at 50 VUs
  { duration: "30s", target: 0 },   // Ramp down
];

export const options = {
  stages: STAGES,
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95% of requests should be below 3s
    http_req_failed: ["rate<0.05"],    // Less than 5% failure rate
    errors: ["rate<0.05"],              // Custom error rate
  },
};

// ──────────────────────────────────────────
// Test: GET /api/courses
// ──────────────────────────────────────────

function testCourses() {
  const res = http.get(`${BASE_URL}/api/courses`, {
    tags: { name: "GetCourses" },
  });

  apiLatency.add(res.timings.duration, { endpoint: "courses" });

  const passed = check(res, {
    "GET /api/courses status 200": (r) => r.status === 200,
    "GET /api/courses returns array": (r) => {
      try { return Array.isArray(JSON.parse(r.body)); }
      catch { return false; }
    },
  });

  errorRate.add(!passed, { endpoint: "courses" });
  return passed ? JSON.parse(res.body) : [];
}

// ──────────────────────────────────────────
// Test: GET /api/instructors
// ──────────────────────────────────────────

function testInstructors() {
  const res = http.get(`${BASE_URL}/api/instructors`, {
    tags: { name: "GetInstructors" },
  });

  apiLatency.add(res.timings.duration, { endpoint: "instructors" });

  const passed = check(res, {
    "GET /api/instructors status 200": (r) => r.status === 200,
  });

  errorRate.add(!passed, { endpoint: "instructors" });
  return passed ? JSON.parse(res.body) : [];
}

// ──────────────────────────────────────────
// Test: Register user
// ──────────────────────────────────────────

function testRegister() {
  const email = `loadtest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`;
  const payload = {
    name: "Load Test User",
    email,
    password: "test123",
  };

  const res = http.post(`${BASE_URL}/api/register`, JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "Register" },
  });

  apiLatency.add(res.timings.duration, { endpoint: "register" });

  const passed = check(res, {
    "POST /api/register status 201": (r) => r.status === 201,
  });

  errorRate.add(!passed, { endpoint: "register" });
}

// ──────────────────────────────────────────
// Test: Login
// ──────────────────────────────────────────

function testLogin() {
  const payload = {
    email: "admin@lms.com",
    password: "admin123",
    csrfToken: "test",
  };

  const res = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    `email=${payload.email}&password=${payload.password}`,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      tags: { name: "Login" },
    }
  );

  apiLatency.add(res.timings.duration, { endpoint: "login" });

  // Login may redirect (302) or return error (401) — check it doesn't crash
  const passed = check(res, {
    "POST /api/auth status < 500": (r) => r.status < 500,
  });

  errorRate.add(!passed, { endpoint: "login" });
}

// ──────────────────────────────────────────
// Main: Simulate real user behavior
// ──────────────────────────────────────────

export default function () {
  group("Anonymous Browsing", () => {
    // Browse courses
    const courses = testCourses();

    // View course details (first 3 courses)
    if (courses.length > 0) {
      courses.slice(0, 3).forEach((course) => {
        const res = http.get(`${BASE_URL}/api/courses/${course.id}`, {
          tags: { name: "GetCourseDetail" },
        });

        apiLatency.add(res.timings.duration, { endpoint: "course_detail" });
        check(res, {
          "GET /api/courses/[id] status 200": (r) => r.status === 200,
        });
        sleep(0.5);
      });
    }

    // Browse instructors
    testInstructors();

    sleep(1);
  });

  group("Authentication", () => {
    if (Math.random() < 0.3) { // 30% of VUs register
      testRegister();
    }

    if (Math.random() < 0.5) { // 50% of VUs try to login
      testLogin();
    }

    sleep(0.5);
  });

  group("Mixed Requests", () => {
    // Mix of different API calls
    testCourses();
    testInstructors();

    sleep(Math.random() * 2); // Random think time between 0-2s
  });
}
