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

/*
 * AGENTS.md is shared with the rest of the project, so the block is fenced and
 * replaced in place. Appending blindly would stack a copy per run; writing the
 * file would destroy instructions this command did not put there.
 */
const START = "<!-- polytheme:start -->";
const END = "<!-- polytheme:end -->";

function mergeIntoShared(existing, block) {
  const fenced = `${START}\n${block}\n${END}`;
  if (!existing) return `${fenced}\n`;

  const from = existing.indexOf(START);
  const to = existing.indexOf(END);

  if (from !== -1 && to > from) {
    return existing.slice(0, from) + fenced + existing.slice(to + END.length);
  }

  return `${existing.trimEnd()}\n\n${fenced}\n`;
}

const TARGETS = {
  /*
   * The default, because it is the one file most agents already read: plain
   * Markdown at the repository root, stewarded by the Agentic AI Foundation and
   * supported by Codex, Cursor, Copilot, Windsurf, Gemini CLI, Aider, Zed and
   * others. One command covers most of the field; the entries below exist only
   * where a tool has a richer native format worth using instead.
   */
  agents: {
    label: "AGENTS.md",
    path: "AGENTS.md",
    shared: true,
    render: (front, body) => `## Polytheme\n\n${front.description}\n\n${nest(body, 2)}`,
  },
  codex: {
    label: "Codex",
    path: "AGENTS.md",
    shared: true,
    render: (front, body) => `## Polytheme\n\n${front.description}\n\n${nest(body, 2)}`,
  },
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
    render: (front, body) => `# Polytheme\n\n${front.description}\n\n${nest(body, 1)}`,
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

/*
 * The body, re-levelled for a format that supplies its own heading.
 *
 * SKILL.md opens with `# Polytheme` and sets its sections at `##`, which is
 * right when the file is the whole document. Wrapped under a heading it is not:
 * AGENTS.md ended up with an H1 inside an H2, and every `##` section of the
 * skill sitting at the same level as the project's own — so "Rules that cause
 * silent breakage" read as a rule of the project, not of Polytheme. `depth` is
 * the level of the heading the caller has already written.
 */
function nest(body, depth) {
  const withoutTitle = body.replace(/^#\s+\S[^\n]*\n+/, "");
  if (depth < 2) return withoutTitle;

  // Only at the start of a line, so a `#` inside a fenced block is left alone.
  return withoutTitle.replace(/^(#{1,5})\s/gm, (_, hashes) => `${"#".repeat(hashes.length + depth - 1)} `);
}

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

      --for defaults to the AGENTS.md block, which most agents read.
      --dir overrides the path for anything not listed.

Nothing else is installed and nothing outside the written file is touched.`);
}

function valueOf(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

async function installSkill(argv) {
  const agent = valueOf(argv, "--for") ?? "agents";
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
  const rendered = target.render(front, body);

  const explicit = valueOf(argv, "--dir");
  const destination = explicit
    ? resolve(process.cwd(), explicit, target.path.split("/").pop())
    : resolve(process.cwd(), target.path);

  let contents = rendered;
  let merged = false;

  if (target.shared) {
    const existing = await readFile(destination, "utf8").catch(() => "");
    merged = existing.includes(START);
    contents = mergeIntoShared(existing, rendered);
  }

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contents.endsWith("\n") ? contents : `${contents}\n`);

  const shown = destination.replace(`${process.cwd()}/`, "");
  const verb = merged ? "Updated" : target.shared ? "Added" : "Wrote";
  console.log(`${verb} the Polytheme skill (v${await version()}) for ${target.label} in ${shown}`);

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
