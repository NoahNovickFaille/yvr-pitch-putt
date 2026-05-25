/**
 * Generates an Apple client secret JWT for Supabase.
 *
 * Usage:
 *   node scripts/generate-apple-secret.js \
 *     --team-id YOUR_TEAM_ID \
 *     --key-id YOUR_KEY_ID \
 *     --client-id ca.noahnovick.pitchputt \
 *     --key-file path/to/AuthKey_XXXXXX.p8
 *
 * The output JWT goes into Supabase Dashboard → Apple → Secret Key.
 * It's valid for 180 days; regenerate when it expires.
 */

const jwt = require("jsonwebtoken");
const fs = require("fs");

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) {
    console.error(`Missing --${name}`);
    process.exit(1);
  }
  return args[idx + 1];
}

const teamId = getArg("team-id");
const keyId = getArg("key-id");
const clientId = getArg("client-id");
const keyFile = getArg("key-file");

const privateKey = fs.readFileSync(keyFile, "utf8");

const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: teamId,
  iat: now,
  exp: now + 180 * 24 * 60 * 60, // 180 days
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const secret = jwt.sign(payload, privateKey, {
  algorithm: "ES256",
  header: { alg: "ES256", kid: keyId },
});

console.log("\n=== Apple Client Secret (paste into Supabase) ===\n");
console.log(secret);
console.log("\n=== Expires in 180 days ===\n");
