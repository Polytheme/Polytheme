import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execPath } from "node:process";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/*
 * The CLI exists because agents do not read node_modules: the skill ships in
 * the package so it is version-locked, and this writes it somewhere an agent
 * will actually look.
 *
 * Every assertion about a container format here was checked against that tool's
 * documentation, because getting one wrong fails silently — Cursor ignores a
 * plain .md in .cursor/rules outright, so an earlier version of this command
 * installed a file that did nothing at all and said it had succeeded.
 */
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const CLI = join(ROOT, "bin/polytheme.mjs");
const scratch = mkdtempSync(join(tmpdir(), "polytheme-cli-"));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const run = (args: string[]) =>
  execFileSync(execPath, [CLI, ...args], { cwd: scratch, encoding: "utf8" });
const read = (path: string) => readFileSync(join(scratch, path), "utf8");

describe("npx polytheme skill", () => {
  it("writes the Agent Skills format for Claude Code by default", () => {
    const out = run(["skill"]);
    const file = read(".claude/skills/polytheme/SKILL.md");

    expect(file).toMatch(/^---\nname: polytheme\n/);
    expect(file).toMatch(/^description: \S/m);
    expect(out).toContain(".claude/skills/polytheme/SKILL.md");
  });

  it("writes .mdc with Cursor's activation fields, since a .md there is ignored", () => {
    run(["skill", "--for", "cursor"]);
    const file = read(".cursor/rules/polytheme.mdc");

    expect(existsSync(join(scratch, ".cursor/rules/polytheme.mdc"))).toBe(true);
    expect(file).toMatch(/^description: \S/m);
    expect(file).toMatch(/^globs: /m);
    expect(file).toMatch(/^alwaysApply: /m);
  });

  it("writes plain markdown for Windsurf, inside its per-file character cap", () => {
    run(["skill", "--for", "windsurf"]);
    const file = read(".windsurf/rules/polytheme.md");

    expect(file.startsWith("# Polytheme\n")).toBe(true);
    // Windsurf truncates a rule file past 6,000 characters without saying so.
    expect(file.length).toBeLessThan(6000);
  });

  it("writes a scoped Copilot instructions file, never the shared one", () => {
    run(["skill", "--for", "copilot"]);

    expect(read(".github/instructions/polytheme.instructions.md")).toMatch(/^applyTo: /m);
    // The shared file belongs to the project, not to this command.
    expect(existsSync(join(scratch, ".github/copilot-instructions.md"))).toBe(false);
  });

  it("carries the same guidance into every format", () => {
    for (const path of [
      ".claude/skills/polytheme/SKILL.md",
      ".cursor/rules/polytheme.mdc",
      ".windsurf/rules/polytheme.md",
      ".github/instructions/polytheme.instructions.md",
    ]) {
      expect(read(path)).toContain("polytheme-ignore");
      expect(read(path)).toContain("Never write per-theme blocks");
    }
  });

  it("reports the version, so a stale copy is visible", () => {
    const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
    expect(run(["skill"])).toContain(`v${version}`);
  });

  it("honours an explicit directory", () => {
    run(["skill", "--dir", "custom/place"]);
    expect(existsSync(join(scratch, "custom/place/SKILL.md"))).toBe(true);
  });

  it("refuses an agent it does not know rather than writing somewhere odd", () => {
    let failed = false;
    try {
      execFileSync(execPath, [CLI, "skill", "--for", "nonsense"], { cwd: scratch, stdio: "pipe" });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it("lists every agent it supports when given nothing", () => {
    const out = run([]);
    for (const agent of ["claude", "cursor", "windsurf", "copilot"]) {
      expect(out).toContain(agent);
    }
  });
});
