#!/usr/bin/env node
/*
 * `npx polytheme skill` — copies the bundled skill where an agent will find it.
 *
 * The skill ships inside the package so it is version-locked: it describes
 * exactly the release that is installed and can never claim a feature that is
 * missing. But agents do not read node_modules, so it has to be copied into the
 * project's own skills directory to become active. That copy is this command.
 *
 * Plain JavaScript, committed rather than built, so `bin` does not depend on a
 * build step having run.
 */
import { cp, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..", "skill");

const DESTINATIONS = {
  claude: ".claude/skills/polytheme",
  cursor: ".cursor/rules/polytheme",
};

async function version() {
  const pkg = JSON.parse(await readFile(resolve(HERE, "..", "package.json"), "utf8"));
  return pkg.version;
}

function usage() {
  console.log(`polytheme <command>

  skill [--for <agent>] [--dir <path>]   Copy the Polytheme skill into this project
                                         agent: claude (default), cursor

Nothing else is installed and nothing is written outside the target directory.`);
}

async function installSkill(argv) {
  const agent = valueOf(argv, "--for") ?? "claude";
  const explicit = valueOf(argv, "--dir");

  if (!explicit && !(agent in DESTINATIONS)) {
    console.error(`Unknown agent "${agent}". Expected one of: ${Object.keys(DESTINATIONS).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const target = resolve(process.cwd(), explicit ?? DESTINATIONS[agent]);

  try {
    await stat(SKILL);
  } catch {
    console.error(`The bundled skill is missing at ${SKILL}. Reinstall polytheme.`);
    process.exitCode = 1;
    return;
  }

  await mkdir(dirname(target), { recursive: true });
  await cp(SKILL, target, { recursive: true });

  const relative = target.replace(`${process.cwd()}/`, "");
  console.log(`Copied the Polytheme skill (v${await version()}) to ${relative}`);
  console.log(`Your agent will pick it up from there — no config needed.`);
}

function valueOf(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

const [command, ...argv] = process.argv.slice(2);

if (command === "skill") await installSkill(argv);
else if (command === "--version" || command === "-v") console.log(await version());
else usage();
