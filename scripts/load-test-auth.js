// ──────────────────────────────────────────
// k6 Auth Load Test
// ──────────────────────────────────────────
//
// Tests authentication endpoints under concurrent load.
// Simulates multiple users registering and logging in simultaneously.
//
// Run: k6 run scripts/load-test-auth.js

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  stages: [
    { duration: "10s", target: 5 },   // Ramp to 5 VUs
    { duration: "30s", target: 20 },  // Ramp to 20 VUs
    { duration: "20s", target: 20 },  // Stay at 20 VUs
    { duration: "10s", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<4000"],
    http_req_failed: ["rate<0.1"],
  },
};

// Track registered emails to test login
const registeredUsers = [];

export default function () {
  const userIndex = __VU; // Virtual User ID

  // Step 1: Register a new user
  const email = `loadtest-user-${userIndex}-${Date.now()}@test.com`;
  const registerPayload = {
    name: `Load Test User ${userIndex}`,
    email,
    password: "test123",
  };

  const registerRes = http.post(
    `${BASE_URL}/api/register`,
    JSON.stringify(registerPayload),
    { headers: { "Content-Type": "application/json" }, tags: { name: "Register" } }
  );

  const registerPassed = check(registerRes, {
    "Registration successful": (r) => r.status === 201,
  });

  if (registerPassed) {
    registeredUsers.push({ email, password: "test123" });
  }

  sleep(1);

  // Step 2: Login with registered credentials
  if (registeredUsers.length > 0) {
    const user = registeredUsers[Math.floor(Math.random() * registeredUsers.length)];

    const loginRes = http.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      `email=${user.email}&password=${user.password}`,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, tags: { name: "Login" } }
    );

    check(loginRes, {
      "Login attempted": (r) => r.status < 500,
    });
  }

  sleep(2);
}
