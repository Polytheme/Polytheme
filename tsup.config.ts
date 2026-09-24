import { defineConfig } from "tsup";

/*
 * Build config lives here rather than on the build script because the CJS
 * output needs a footer, which a CLI flag cannot express.
 *
 * The problem it solves: a PostCSS plugin is loaded by name from a config file,
 * and postcss-load-config does a plain `require()` and expects a function back.
 * esbuild's CJS output assigns `exports.default`, so `require("polytheme")`
 * handed back `{ default: fn }` and every CommonJS `postcss.config.js` failed
 * with "Loading PostCSS Plugin failed: (intermediate value) is not a function".
 * ESM configs worked, which is why this went unnoticed — polytheme.dev's own
 * config is .mjs.
 *
 * `cjsInterop` alone does not fix it: it only rewrites the .d.ts to `export =`
 * and leaves the JavaScript exporting `{ default }`, so the types would then
 * describe a shape the runtime does not have. It is still switched on, because
 * the types it writes are right — the footer below is what makes the runtime
 * match them.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  tsconfig: "tsconfig.build.json",
  cjsInterop: true,

  esbuildOptions(options, context) {
    if (context.format !== "cjs") return;

    options.footer = {
      js: [
        "// Hand the plugin function itself to `require`, so a CommonJS",
        "// postcss.config.js can name this plugin like any other.",
        "if (typeof module.exports === \"object\" && module.exports.default) {",
        "  var __polytheme = module.exports.default;",
        "  // Kept so `require(\"polytheme\").default` still resolves: it was the",
        "  // only form that worked before, so someone is relying on it.",
        "  __polytheme.default = __polytheme;",
        "  module.exports = __polytheme;",
        "}",
      ].join("\n"),
    };
  },
});
