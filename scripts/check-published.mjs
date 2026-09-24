#!/usr/bin/env node
/*
 * Compares this checkout against what npm actually serves.
 *
 * The failure this exists to catch: a change lands in the repo, the version is
 * left alone because npm has not been touched, and the improvement sits there
 * invisible to every user for months. npm versions are immutable, so a repo at
 * an already-published version can never become that version — it can only
 * become the next one.
 *
 * Exit codes: 0 in sync or legitimately ahead, 1 drifted or behind.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const { name, version: local } = pkg;

let latest;
try {
  latest = run("npm", ["view", `${name}@latest`, "version"]);
} catch {
  // Offline, or the package has never been published. Neither is this script's
  // business to adjudicate, and neither should block a build.
  console.log(`· could not reach npm — skipping the published-version check`);
  process.exit(0);
}

/** `1.0.10` sorts after `1.0.9`, which a string compare gets wrong. */
const parse = (v) => v.split(/[.-]/).slice(0, 3).map(Number);
const compare = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

const order = compare(local, latest);

if (order > 0) {
  console.log(`✓ ${name}: local ${local} is ahead of npm's ${latest} — ready to publish`);
  process.exit(0);
}

if (order < 0) {
  console.error(
    `✗ ${name}: this checkout is at ${local} but npm serves ${latest}.\n` +
      `  The repo is behind the registry. Pull, or reconcile the version by hand.`,
  );
  process.exit(1);
}

/* Same version on both sides — so the contents had better match too. */

const tmp = mkdtempSync(join(tmpdir(), "polytheme-check-"));
const walk = (root, base = root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = join(root, entry.name);
    return entry.isDirectory() ? walk(full, base) : [relative(base, full)];
  });
const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

try {
  /*
   * `npm pack` honours `files`, `.npmignore` and `prepublishOnly`, so these are
   * the real tarballs rather than a guess at them. They must land in separate
   * directories: both are named <name>-<version>.tgz, so packing them side by
   * side silently overwrites the first with the second and every comparison
   * below then passes.
   */
  const repoRoot = new URL("..", import.meta.url).pathname;
  const pack = (spec, into) => {
    const dir = join(tmp, into);
    run("mkdir", ["-p", dir]);
    const tgz = spec
      ? run("npm", ["pack", spec, "--pack-destination", dir, "--silent"])
      : run("npm", ["pack", "--pack-destination", dir, "--silent"], { cwd: repoRoot });
    const out = join(dir, "x");
    run("mkdir", ["-p", out]);
    run("tar", ["-xzf", join(dir, tgz), "-C", out, "--strip-components=1"]);
    return out;
  };

  const a = pack(null, "local");
  const b = pack(`${name}@${latest}`, "published");

  const files = [...new Set([...walk(a), ...walk(b)])].sort();
  const drift = files.filter((file) => {
    const [pa, pb] = [join(a, file), join(b, file)];
    const [ea, eb] = [statSync(pa, { throwIfNoEntry: false }), statSync(pb, { throwIfNoEntry: false })];
    if (!ea || !eb) return true;
    return digest(pa) !== digest(pb);
  });

  if (drift.length === 0) {
    console.log(`✓ ${name}@${local} matches what npm serves`);
    process.exit(0);
  }

  console.error(
    `✗ ${name}@${local} is already published, but this checkout would ship different files:\n` +
      drift.map((f) => `    ${f}`).join("\n") +
      `\n\n  npm versions are immutable, so these changes cannot reach anyone at ${local}.\n` +
      `  Run \`npm run release -- patch\` to publish them as the next version.`,
  );
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
