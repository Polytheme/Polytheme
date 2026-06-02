# Contributing to Polytheme

Thanks for your interest in improving Polytheme. This guide covers how the project is organized, how to get set up locally, and — most importantly — the design principles that decide what does and doesn't get merged.

---

## Design principles (read this first)

Polytheme is **intentionally opinionated**. Most of its value comes from what it *refuses* to do, so please understand the philosophy before proposing changes:

- **One rule, by all.** Inside a CSS variable, `/` separates themes. There is exactly one syntax and one separator, on purpose. Proposals to add a second syntax, a configurable separator, alternative shorthands, or a `theme()` function will most likely be declined — not because they're bad ideas, but because optionality fragments the ecosystem and works against the tool's reason to exist.
- **CSS variables only.** Polytheme only ever transforms declarations that start with `--`. It must never touch regular CSS properties.
- **Zero runtime.** Everything happens at build time. Nothing Polytheme does should ever require shipping JavaScript to the browser.
- **Round-trip integrity.** The website's playground converts in both directions (Polytheme shorthand ↔ per-theme CSS). If you change how the syntax is parsed in the plugin, the playground's `expand` and `collapse` logic must stay in sync so a token round-trips to the same observed CSS behavior.
- **Backward compatibility.** Once published, the public API — the `themes` option and the `/` syntax — is effectively frozen. New behavior must be additive and must not change the output of valid existing tokens.
- **Small and sharp.** When in doubt, the answer is usually "no, that's out of scope." A focused tool that does one thing predictably beats a flexible one that does many things ambiguously.

If you're unsure whether an idea fits, **open an issue to discuss it before writing code.** It saves everyone time.

---

## Ways to contribute

All of these are valuable:

- **Bug fixes.** A reproduction and a fix that doesn't introduce a new option is the easiest kind of PR to review and merge.
- **Tests.** Edge cases in the transform — nested parentheses, comments, whitespace quirks, weirdly-ordered themes — are gold. More fixtures = more confidence.
- **Documentation.** Typos, clearer explanations, missing examples in the README, the docs site, or the website all count.
- **Bug reports and triage.** A well-written reproduction is often more useful than a partial fix. Confirming or de-duplicating issues helps too.
- **Real-world setups.** If you got Polytheme working in a framework or build setup we don't document yet, a short PR adding the config snippet is welcome.

---

## Local development

You'll need Node.js (LTS or newer).

### Set up

```bash
# 1. Fork, then clone your fork
git clone https://github.com/<your-username>/polytheme.git
cd polytheme

# 2. Install dependencies
npm install
```

### Work on the plugin

```bash
npm test          # run the test suite
npm run build     # build the plugin
```

Tests live in `test/` as input-and-expected-output fixtures. Adding a test for a new case is almost always part of a good PR.

### Work on the website or docs

The website (`index.html`) and docs (`docs.html`) are static files. To preview locally, serve the directory:

```bash
npx serve site      # or: python3 -m http.server -d site
```

Then open the printed URL. No build step.

---

## Project structure

```
src/         the plugin source (PostCSS transformer)
test/        unit tests — input CSS to expected output CSS
site/        the website
  index.html   landing page + interactive playground
  docs.html    full documentation site
README.md    canonical user-facing reference
LICENSE      MIT
```

Structure may evolve; the principle is to keep the plugin small and the docs close to it.

---

## Making a change

1. Create a branch: `git checkout -b fix/short-description` or `feat/short-description`.
2. Make your change. Keep it focused — one logical change per pull request.
3. **Add or update tests.** Transform changes must come with a fixture that shows the input CSS and the expected output CSS.
4. If you change how the `/` syntax is parsed, update the playground's logic in `site/index.html` to match.
5. Run `npm test` and make sure everything passes.
6. Update `README.md` and the relevant page in `docs.html` if your change affects documented behavior.

---

## Pull requests

- Write a clear title and description: what changed, and why.
- Link the related issue if there is one.
- Keep the diff small and reviewable. Large, unfocused PRs are hard to merge.
- Be ready for discussion — feedback is about the code and the project's direction, never about you.

---

## Reporting bugs

Open an issue with:

- The **input CSS** you wrote.
- The **output** you got.
- The **output you expected**.
- Your Polytheme version, package manager, and build setup (PostCSS / Tailwind / framework).

A minimal reproduction is worth a thousand words. If you can paste your input into the [playground](https://polytheme.dev/#playground) and it reproduces, link to a screenshot — that's often enough.

---

## Code of conduct

Be kind, be constructive, assume good faith. We're all here to make a small tool a little better.

---

Thank you for contributing. 💛
