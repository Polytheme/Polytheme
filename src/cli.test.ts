import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/*
 * The CLI exists because agents do not read node_modules: the skill ships in the
 * package so it is version-locked, and this copies it somewhere an agent will
 * actually look. If the copy silently lands in the wrong place, the skill is
 * shipped and inert — which looks identical to working.
 *
 * Run as a real process rather than imported, since argv parsing and cwd
 * handling are most of what it does.
 */
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const CLI = join(ROOT, "bin/polytheme.mjs");
const scratch = mkdtempSync(join(tmpdir(), "polytheme-cli-"));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const run = (args: string[], cwd = scratch) =>
  execFileSync(execPath, [CLI, ...args], { cwd, encoding: "utf8" });

describe("npx polytheme skill", () => {
  it("copies the skill where a Claude Code project looks for it", () => {
    const out = run(["skill"]);
    const landed = join(scratch, ".claude/skills/polytheme/SKILL.md");

    expect(existsSync(landed)).toBe(true);
    expect(readFileSync(landed, "utf8")).toMatch(/^name:\s*polytheme$/m);
    expect(out).toContain(".claude/skills/polytheme");
  });

  it("reports the version it installed, so a stale copy is visible", () => {
    const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
    expect(run(["skill"])).toContain(`v${version}`);
  });

  it("honours an explicit directory", () => {
    run(["skill", "--dir", "custom/place"]);
    expect(existsSync(join(scratch, "custom/place/SKILL.md"))).toBe(true);
  });

  it("puts the skill anywhere an agent reads rules from", () => {
    // No agent is named in the CLI, so this is the path for everything that is
    // not Claude Code — asserting another tool's convention would be a guess.
    run(["skill", "--dir", ".cursor/rules/polytheme"]);
    expect(existsSync(join(scratch, ".cursor/rules/polytheme/SKILL.md"))).toBe(true);
  });

  it("prints usage when given nothing", () => {
    expect(run([])).toContain("polytheme <command>");
  });
});
