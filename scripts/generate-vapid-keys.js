#!/usr/bin/env node
/**
 * Generate a VAPID key pair for Web Push notifications.
 *
 * Run:  npm run vapid:generate
 *
 * Prints the two keys in .env format so you can paste them into your
 * environment file(s). The keys are printed ONLY to the terminal and are
 * never persisted by this script.
 *
 * Required in the environment (after pasting):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...  (safe to expose — used by the browser)
 *   VAPID_PRIVATE_KEY=...             (secret — server only)
 *   VAPID_EMAIL=mailto:you@example.com
 */

const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("\n🎉 VAPID keys generated successfully!\n");
console.log("Add these to your .env.local (dev) and Vercel (production):\n");
console.log("# Web Push Notifications");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_EMAIL=mailto:admin@pontodosaber.com.br");
console.log("\n⚠️  Keep VAPID_PRIVATE_KEY secret — never commit it.\n");
