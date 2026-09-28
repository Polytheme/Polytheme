#!/usr/bin/env node
/*
 * `npx polytheme skill` — installs the bundled skill where a coding agent will
 * read it.
 *
 * The skill ships inside the package so it is version-locked: it describes
 * exactly the release that is installed and can never claim a feature that is
 * missing. Agents do not read node_modules, so it has to be copied into the
 * project to become active, and that copy is this command.
 *
 * Copying the same file to a different path is not enough. Every tool has its
 * own container format, and getting it wrong fails silently: Cursor ignores a
 * plain .md in .cursor/rules outright, because it has no frontmatter to say
 * when the rule applies. So each target re-wraps the same body in the shape
 * that tool actually reads.
 *
 * Plain JavaScript, committed rather than built, so `bin` does not depend on a
 * build step having run.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..", "skill", "SKILL.md");

/*
 * Windsurf caps a single rule file at 6,000 characters and silently drops what
 * is over. A test pins this so a longer skill fails the build; the check below
 * covers the other direction, where someone points --dir at Windsurf by hand.
 */
const WINDSURF_LIMIT = 6000;

const TARGETS = {
  claude: {
    label: "Claude Code",
    path: ".claude/skills/polytheme/SKILL.md",
    // The native home of this format: frontmatter and body go through as-is.
    render: (front, body) => `---\nname: ${front.name}\ndescription: ${front.description}\n---\n\n${body}`,
  },
  cursor: {
    label: "Cursor",
    path: ".cursor/rules/polytheme.mdc",
    // .mdc, not .md, and the three fields Cursor uses to decide when to apply a
    // rule. Scoped to stylesheets so it is not pulled into unrelated edits.
    render: (front, body) =>
      `---\ndescription: ${front.description}\nglobs: **/*.css\nalwaysApply: false\n---\n\n${body}`,
  },
  windsurf: {
    label: "Windsurf",
    path: ".windsurf/rules/polytheme.md",
    // Plain markdown: Windsurf's own activation metadata is set in its UI, and
    // inventing frontmatter here would show up as body text.
    render: (front, body) => `# Polytheme\n\n${front.description}\n\n${body}`,
  },
  copilot: {
    label: "GitHub Copilot",
    // Deliberately not .github/copilot-instructions.md — that file is shared
    // with whatever else a project tells Copilot, and writing it would destroy
    // work this command did not put there.
    path: ".github/instructions/polytheme.instructions.md",
    render: (front, body) => `---\napplyTo: "**/*.css"\n---\n\n${body}`,
  },
};

/** Split `---` frontmatter from the body without pulling in a YAML parser. */
function parse(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n+([\s\S]*)$/);
  if (!match) return { front: {}, body: source.trim() };

  const front = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([a-z]+):\s*(.*)$/i);
    if (pair) front[pair[1]] = pair[2].trim();
  }
  return { front, body: match[2].trim() };
}

async function version() {
  const pkg = JSON.parse(await readFile(resolve(HERE, "..", "package.json"), "utf8"));
  return pkg.version;
}

function usage() {
  const agents = Object.entries(TARGETS)
    .map(([key, t]) => `      ${key.padEnd(9)} ${t.label.padEnd(15)} ${t.path}`)
    .join("\n");

  console.log(`polytheme <command>

  skill [--for <agent>] [--dir <path>]
      Write the Polytheme skill where your agent reads project rules.

${agents}

      --for defaults to claude. --dir overrides the path for anything not listed.

Nothing else is installed and nothing outside the written file is touched.`);
}

function valueOf(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

async function installSkill(argv) {
  const agent = valueOf(argv, "--for") ?? "claude";
  const target = TARGETS[agent];

  if (!target) {
    console.error(
      `Unknown agent "${agent}". Expected one of: ${Object.keys(TARGETS).join(", ")}.\n` +
        `For anything else, use --dir to say where the file should go.`,
    );
    process.exitCode = 1;
    return;
  }

  let source;
  try {
    source = await readFile(SKILL, "utf8");
  } catch {
    console.error(`The bundled skill is missing at ${SKILL}. Reinstall polytheme.`);
    process.exitCode = 1;
    return;
  }

  const { front, body } = parse(source);
  const contents = target.render(front, body);

  const explicit = valueOf(argv, "--dir");
  const destination = explicit
    ? resolve(process.cwd(), explicit, target.path.split("/").pop())
    : resolve(process.cwd(), target.path);

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contents.endsWith("\n") ? contents : `${contents}\n`);

  const shown = destination.replace(`${process.cwd()}/`, "");
  console.log(`Wrote the Polytheme skill (v${await version()}) for ${target.label} to ${shown}`);

  if (agent === "windsurf" && contents.length > WINDSURF_LIMIT) {
    console.warn(
      `Warning: ${contents.length} characters, over Windsurf's ${WINDSURF_LIMIT} limit. ` +
        `Windsurf will drop the overflow without saying so.`,
    );
  }
}

const [command, ...argv] = process.argv.slice(2);

if (command === "skill") await installSkill(argv);
else if (command === "--version" || command === "-v") console.log(await version());
else usage();
