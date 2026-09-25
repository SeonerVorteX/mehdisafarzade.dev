#!/usr/bin/env node
// i18n:check — fails when a translation key exists in one locale of a bundle but
// not in another, or when a value is empty. Run from `frontend/` (`yarn i18n:check`).
//
// Bundles and the locales each must cover:
//   global, web → en, az, ru   (public site; brief §4)
//   admin       → en, az       (admin UI; brief §4 "at least en + az")
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "locales");
const REQUIRED = { global: ["en", "az", "ru"], web: ["en", "az", "ru"], admin: ["en", "az"] };

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

const problems = [];
for (const [bundle, required] of Object.entries(REQUIRED)) {
  const present = readdirSync(join(root, bundle)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  for (const loc of required) if (!present.includes(loc)) problems.push(`${bundle}: missing locale file ${loc}.json`);

  const maps = Object.fromEntries(
    present.map((loc) => [loc, flatten(JSON.parse(readFileSync(join(root, bundle, `${loc}.json`), "utf8")))]),
  );
  const allKeys = new Set(Object.values(maps).flatMap((m) => [...m.keys()]));
  for (const loc of present) {
    for (const key of allKeys) {
      if (!maps[loc].has(key)) problems.push(`${bundle}/${loc}: missing "${key}"`);
      else if (typeof maps[loc].get(key) !== "string" || maps[loc].get(key).trim() === "")
        problems.push(`${bundle}/${loc}: empty or non-string "${key}"`);
    }
  }
}

if (problems.length) {
  console.error(`i18n:check failed (${problems.length}):\n  ` + problems.join("\n  "));
  process.exit(1);
}
process.stdout.write("i18n:check ok\n");
