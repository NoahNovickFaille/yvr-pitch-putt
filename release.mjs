#!/usr/bin/env node
// Bump `app.config.js` → `expo.ios.buildNumber`, commit + push to main, then queue an
// EAS production iOS build (fire-and-forget via --no-wait) with --auto-submit so EAS
// can upload the IPA to TestFlight when the build finishes (requires submit.production.ios
// in eas.json).
//
// IMPORTANT: the build uses whatever env vars are attached to the `production` EAS profile
// on Expo — confirm backend (e.g. Supabase) matches what you intend before shipping.

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, ".");
const APP_CONFIG = join(REPO_ROOT, "app.config.js");

function sh(cmd, opts = {}) {
  const out = execSync(cmd, { encoding: "utf8", cwd: REPO_ROOT, ...opts });
  return out === null ? "" : out.trim();
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function info(msg) {
  console.log(`→ ${msg}`);
}

// 1. Assert current branch == main
const branch = sh("git rev-parse --abbrev-ref HEAD");
if (branch !== "main") {
  fail(`must run on main (currently on '${branch}')`);
}

// 2. Assert clean working tree
const dirty = sh("git status --porcelain");
if (dirty) {
  fail(`working tree has uncommitted changes:\n${dirty}`);
}

// 3. Pull main fast-forward only
info("git pull --ff-only origin main");
sh("git pull --ff-only origin main", { stdio: "inherit" });

// 4. Bump expo.ios.buildNumber via targeted replacement (avoids reformatting app.config.js).
const raw = readFileSync(APP_CONFIG, "utf8");
const buildNumberRegex = /(buildNumber:\s*")(\d+)(")/g;
const matches = [...raw.matchAll(buildNumberRegex)];
if (matches.length !== 1) {
  fail(
    `expected exactly one ios buildNumber in app.config.js (pattern buildNumber: \"…\"), found ${matches.length}`,
  );
}
const current = matches[0][2];
const parsed = parseInt(current, 10);
if (Number.isNaN(parsed)) {
  fail(`expo.ios.buildNumber is not a valid integer string: '${current}'`);
}
const next = String(parsed + 1);
const updated = raw.replace(buildNumberRegex, `$1${next}$3`);
writeFileSync(APP_CONFIG, updated);
info(`bumped ios.buildNumber: ${current} → ${next}`);

// 5. Commit
sh(`git add ${JSON.stringify(APP_CONFIG)}`);
sh(`git commit -m "chore: bump iOS build number to ${next}"`, { stdio: "inherit" });

// 6. Push
info("git push origin main");
sh("git push origin main", { stdio: "inherit" });

// 7. Queue EAS build
console.log("");
console.log(
  "⚠  Building against env attached to the `production` EAS profile — confirm targets (e.g. Supabase).",
);
console.log("");

info(
  "eas build --platform ios --profile production --non-interactive --no-wait --auto-submit",
);

const result = spawnSync(
  "eas",
  [
    "build",
    "--platform",
    "ios",
    "--profile",
    "production",
    "--non-interactive",
    "--no-wait",
    "--auto-submit",
  ],
  { cwd: REPO_ROOT, stdio: "inherit" },
);

if (result.status !== 0) {
  fail(
    `eas build exited with code ${result.status}. The buildNumber bump (${next}) is already pushed; ` +
      "re-run `eas build --platform ios --profile production --non-interactive --no-wait --auto-submit` once the issue is resolved.",
  );
}

console.log(`\n✓ Build queued for iOS buildNumber ${next}`);
console.log(
  "  Watch the EAS dashboard — auto-submit can still fail after the build completes",
);
console.log("  (e.g. ASC API key, profiles, or expired credentials).\n");
