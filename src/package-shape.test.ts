import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/*
 * What a consumer actually receives, rather than what the source says.
 *
 * These assert on dist/ because the bug they guard against lives in the build,
 * not the source: esbuild's CJS output assigned `exports.default`, so
 * `require("polytheme")` returned `{ default: fn }` and every CommonJS
 * postcss.config.js failed with "Loading PostCSS Plugin failed: (intermediate
 * value) is not a function". The source was correct throughout, and the other
 * tests import it directly, so nothing caught it for two releases.
 *
 * Each assertion runs in a real `node` process. Vitest resolves modules through
 * Vite's transform, which presents a CJS module as a namespace object and made
 * the first version of this file fail against a build that works — testing the
 * runner rather than the package. A child process has no loader in the way, so
 * what it sees is what a consumer sees.
 */
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");

beforeAll(() => {
  // dist is gitignored, so a clean checkout has nothing to assert on.
  if (!existsSync(resolve(ROOT, "dist/index.js"))) {
    execFileSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
  }
}, 120_000);

/** Evaluate `code` in a plain node process and return what it prints. */
function inNode(code: string, type: "commonjs" | "module" = "commonjs") {
  return execFileSync(execPath, [`--input-type=${type}`, "-e", code], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

describe("the CommonJS build", () => {
  it("hands require() the plugin function itself, not a module namespace", () => {
    expect(inNode(`console.log(typeof require("./dist/index.js"))`)).toBe("function");
  });

  it("carries the postcss marker, which is how a config file is trusted to load it", () => {
    expect(inNode(`console.log(require("./dist/index.js").postcss)`)).toBe("true");
  });

  it("still answers to .default, the form that worked before the fix", () => {
    const code = `const m = require("./dist/index.js"); console.log(m.default === m)`;
    expect(inNode(code)).toBe("true");
  });

  it("produces a working plugin when called", () => {
    const code = `console.log(require("./dist/index.js")({ themes: [":root"] }).postcssPlugin)`;
    expect(inNode(code)).toBe("theme-shorthand");
  });
});

describe("the ESM build", () => {
  it("default-exports the plugin function", () => {
    const code = `
      const m = await import("./dist/index.mjs");
      console.log(typeof m.default, m.default.postcss);
    `;
    expect(inNode(code, "module")).toBe("function true");
  });
});
