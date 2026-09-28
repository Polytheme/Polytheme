import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import plugin from "./index";

/*
 * Every claim the shipped skill makes, checked against the plugin.
 *
 * skill/SKILL.md is documentation that travels inside the tarball and is read
 * by an agent rather than a person — so a wrong claim does not get noticed and
 * corrected, it gets applied, repeatedly and confidently, to somebody's
 * stylesheet. The README drifted a version behind the feature it described
 * before anyone spotted it; this is the same failure mode with worse
 * consequences, so the claims are pinned here instead.
 *
 * If a test in this file fails, fix the skill, not the test.
 */
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const SKILL = readFileSync(resolve(ROOT, "skill/SKILL.md"), "utf8");

async function run(css: string, themes: string[]) {
  const result = await postcss([plugin({ themes })]).process(css, { from: undefined });
  return { css: result.css, warnings: result.warnings().map((w) => w.text) };
}

describe("the skill file itself", () => {
  it("has the frontmatter an agent needs to find it", () => {
    expect(SKILL.startsWith("---\n")).toBe(true);
    expect(SKILL).toMatch(/^name:\s*polytheme$/m);
    expect(SKILL).toMatch(/^description:\s*\S.+/m);
  });

  it("stays small enough to load without thought", () => {
    // Loaded into an agent's context on demand; a sprawling file gets skimmed.
    expect(SKILL.length).toBeLessThan(8_000);
  });
});

describe("the claims it makes", () => {
  it("expands one token into the configured selectors", async () => {
    const { css } = await run(":root { --background: white / black; }", [":root", ".dark"]);

    expect(css).toMatch(/:root\s*\{[^}]*--background:\s*white/);
    expect(css).toMatch(/\.dark\s*\{[^}]*--background:\s*black/);
  });

  it("skips a mismatched count and warns, rather than guessing", async () => {
    const { css, warnings } = await run(":root { --bg: white / black / gold; }", [":root", ".dark"]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("3 values for 2 themes");
    expect(css).toContain("white / black / gold");
  });

  it("carries a repeated value across themes", async () => {
    const { css, warnings } = await run(
      ":root { --border: gray200 / gray800 / gray200; }",
      [":root", ".dark", ".brand"],
    );

    expect(warnings).toHaveLength(0);
    expect(css).toMatch(/\.brand\s*\{[^}]*--border:\s*gray200/);
  });

  it("splits a bare slash silently when the parts match the theme count", async () => {
    // The claim is that this is dangerous — so the danger has to be real.
    const { css, warnings } = await run(":root { --ratio: 16 / 9; }", [":root", ".dark"]);

    expect(warnings).toHaveLength(0);
    expect(css).toMatch(/:root\s*\{[^}]*--ratio:\s*16/);
    expect(css).toMatch(/\.dark\s*\{[^}]*--ratio:\s*9/);
  });

  it("opts a declaration out with polytheme-ignore, and drops the directive", async () => {
    const { css } = await run(
      ":root {\n  /* polytheme-ignore */\n  --ratio: 16 / 9;\n}",
      [":root", ".dark"],
    );

    expect(css).toContain("--ratio: 16 / 9");
    expect(css).not.toContain("polytheme-ignore");
    expect(css).not.toContain(".dark");
  });

  it("treats a slash inside brackets as part of one value", async () => {
    const { css, warnings } = await run(
      ":root { --shadow: 0 1px 2px rgb(0 0 0 / 10%) / 0 1px 2px rgb(255 255 255 / 10%); }",
      [":root", ".dark"],
    );

    expect(warnings).toHaveLength(0);
    expect(css).toMatch(/:root\s*\{[^}]*rgb\(0 0 0 \/ 10%\)/);
    expect(css).toMatch(/\.dark\s*\{[^}]*rgb\(255 255 255 \/ 10%\)/);
  });

  it("leaves regular declarations alone, slashes and all", async () => {
    const { css } = await run(
      ".b { grid-area: 1 / 2 / 3 / 4; font: 16px/1.5 Inter; }",
      [":root", ".dark"],
    );

    expect(css).toContain("grid-area: 1 / 2 / 3 / 4");
    expect(css).toContain("font: 16px/1.5 Inter");
  });

  it("takes the selectors from the config, not from the rule", async () => {
    const { css } = await run(".card { --x: red / blue; }", [":root", ".dark"]);

    expect(css).toContain(":root");
    expect(css).toContain(".dark");
    expect(css).not.toMatch(/\.card\s*\{[^}]*--x/);
  });

  it("keeps an expansion inside the at-rule it was written in", async () => {
    const { css } = await run("@layer base { :root { --bg: white / black; } }", [":root", ".dark"]);

    const layer = postcss.parse(css).nodes[0] as postcss.AtRule;
    const selectors = (layer.nodes ?? []).map((n) => (n as postcss.Rule).selector);

    expect(layer.name).toBe("layer");
    expect(selectors).toEqual([":root", ".dark"]);
  });

  it("wraps an at-rule theme around a :root", async () => {
    const { css } = await run(":root { --bg: white / black; }", [
      ":root",
      "@media (prefers-color-scheme: dark)",
    ]);

    const media = postcss
      .parse(css)
      .nodes.find((n) => n.type === "atrule") as postcss.AtRule | undefined;

    expect(media).toBeDefined();
    expect((media!.nodes ?? []).every((n) => n.type === "rule")).toBe(true);
    expect((media!.nodes![0] as postcss.Rule).selector).toBe(":root");
  });
});
