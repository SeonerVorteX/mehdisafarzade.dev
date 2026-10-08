// Phase 5 design-review captures: full-page screenshots of each direction page.
// Usage (dev server running on :5600):
//   node apps/web/scripts/design-shots.mjs [a,b,c] [--first-viewport] [--out <dir>]
// Writes <out>/<dir>-<locale>-<theme>-<width>.png (default out: docs/design/directions).
// Reduced motion is forced, so entrance animations are settled and the capture is valid.
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dirs = (args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--out")) ?? "a,b,c").split(",");
const outIdx = args.indexOf("--out");
const out = resolve(outIdx >= 0 ? args[outIdx + 1] : join(here, "../../../../docs/design/directions"));
const firstViewport = args.includes("--first-viewport");
const base = process.env.DESIGN_BASE_URL ?? "http://localhost:5600";

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const shots = [];
try {
  for (const dir of dirs) {
    for (const locale of ["en", "ru"]) {
      for (const theme of ["light", "dark"]) {
        for (const width of [1440, 390]) {
          const context = await browser.newContext({
            viewport: { width, height: width > 600 ? 900 : 844 },
            deviceScaleFactor: 1,
            reducedMotion: "reduce",
            colorScheme: theme,
          });
          await context.addCookies([{ name: "theme", value: theme, url: base }]);
          const page = await context.newPage();
          await page.goto(`${base}/${locale}/_design/directions/${dir}`, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          // Next's dev-mode badge is not part of the design.
          await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
          const file = join(out, `${dir}-${locale}-${theme}-${width}.png`);
          await page.screenshot({ path: file, fullPage: !firstViewport });
          shots.push(file);
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
process.stdout.write(`${shots.join("\n")}\n`);
