<div align="center">

# 🎨 Polytheme

### Write your theme variables once, not once per theme.

A Tailwind-first PostCSS plugin that turns a single line of CSS into every theme: light, dark, brand, and beyond.

[![npm version](https://img.shields.io/npm/v/polytheme.svg)](https://www.npmjs.com/package/polytheme)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![PostCSS](https://img.shields.io/badge/PostCSS-plugin-dd3a0a.svg)](https://postcss.org)

[Website](https://polytheme.dev) · [Docs](https://polytheme.dev/docs/) · [Playground](https://polytheme.dev/playground/) · [npm](https://www.npmjs.com/package/polytheme)

</div>

---

## Why Polytheme?

Theming the usual way means writing the same variables over and over, one block for light, another for dark, another for every brand or mode, then keeping them all in sync by hand. It's slow, repetitive, and easy to break.

**Polytheme flips that.** You write each variable *once*, on a single line, with a value for each theme. Polytheme generates every theme for you at build time.

**Less code. No duplication. Themes that never drift out of sync.**

```css
/* You write this once */
:root {
  --background: var(--white) / var(--black);
  --foreground: var(--black) / var(--white);
}
```

```css
/* Polytheme writes the rest */
:root {
  --background: var(--white);
  --foreground: var(--black);
}

.dark {
  --background: var(--black);
  --foreground: var(--white);
}
```

It only ever touches CSS variables (`--*`), so your regular CSS is never altered, and the output drops straight into a Tailwind v4 `@theme` setup.

---

## Features

- **One line, every theme**: define a token once with a value per theme.
- **One simple rule**: inside a CSS variable, `/` separates your themes. No syntax to learn, no options to weigh.
- **Tailwind-first**: output is plain CSS custom properties, made to plug into Tailwind v4's `@theme`.
- **Safe by design**: only transforms declarations starting with `--`. Your normal CSS is left exactly as written.
- **Any number of themes**: light and dark out of the box, plus brand modes, high-contrast, or whatever you define.
- **Zero runtime**: everything happens at build time. No JavaScript ships to the browser.
- **Ready-made themes**: light and dark, WCAG AA checked, and they combine into more.
- **Agent-ready**: `npx polytheme skill` teaches your coding assistant the syntax and its traps.

---

## Installation

```bash
npm install -D polytheme
# or
pnpm add -D polytheme
# or
yarn add -D polytheme
# or
bun add -d polytheme
```

Polytheme is a PostCSS plugin, so it needs **PostCSS 8.4 or newer** as a peer. npm and pnpm install peers for you; on a package manager that doesn't, add `postcss` alongside it.

---

## Quick Start

**1. Add Polytheme to your build** (`postcss.config.mjs`):

```js
export default {
  plugins: {
    polytheme: { themes: [":root", ".dark"] },
  },
};
```

> Using Next.js, Vite, or Astro? See [Framework setup](#framework-setup).

**2. Write your tokens once:**

```css
:root {
  /* order: light / dark */
  --background: var(--white) / var(--black);
  --foreground: var(--black) / var(--white);
  --border: var(--gray-200) / var(--gray-800);
}
```

**3. Polytheme expands them on build:**

```css
:root {
  --background: var(--white);
  --foreground: var(--black);
  --border: var(--gray-200);
}

.dark {
  --background: var(--black);
  --foreground: var(--white);
  --border: var(--gray-800);
}
```

That's it. Add a token once, and every theme stays in sync automatically.

---

## Theme packs

Ready-made token sets, so you don't start from a blank file. Each is light and dark across the same 26 tokens, built from Tailwind's palette, with every text pair checked against WCAG AA.

Browse them at **[polytheme.dev/themes](https://polytheme.dev/themes)**, copy the block, paste it into your CSS. The first pack takes `:root` and `.dark`, the names most dark-mode setups already toggle, so it drops in with nothing to rewire.

They share one token contract, which is what makes them combine. Pasting a second pack underneath the first does **not** add themes: it redeclares the same tokens and the later block wins. Themes only multiply when every token carries one value per theme in a single declaration, so tick the extra packs on a pack's page and you get the merged block and the matching config line.

```css
/* Dawn + Eclipse: four themes, one declaration each */
:root {
  --background: var(--color-stone-50) / var(--color-stone-950) / var(--color-white) / var(--color-black);
}
```

```js
polytheme({ themes: [":root", ".dark", ".eclipse", ".eclipse-dark"] })
```

---

## AI agents

Left alone, a coding assistant writes the very thing Polytheme deletes: a `:root` block and a matching `.dark` block, kept in sync by hand. The package ships a skill that corrects that:

```bash
npx polytheme skill
```

That adds a fenced block to `AGENTS.md` at the root of your repository — plain Markdown, read by more than twenty agents including Codex and Gemini CLI. Whatever else is in the file stays put, and running it again after an upgrade replaces only Polytheme's block.

Some tools have a native format that does more than a shared Markdown file can, such as scoping the rule to stylesheets so it is not pulled into unrelated edits:

```bash
npx polytheme skill --for codex       # AGENTS.md, the same block as the default
npx polytheme skill --for claude      # .claude/skills/polytheme/SKILL.md
npx polytheme skill --for cursor      # .cursor/rules/polytheme.mdc
npx polytheme skill --for windsurf    # .windsurf/rules/polytheme.md
npx polytheme skill --for copilot     # .github/instructions/polytheme.instructions.md
```

Each writes the container format that tool actually reads, rather than the same file at a different path — a plain `.md` in `.cursor/rules` is ignored outright, because it carries none of the fields Cursor uses to decide when a rule applies. Using something else? `--dir` puts it wherever you say.

Copilot gets its own scoped file rather than `.github/copilot-instructions.md`, which belongs to your project and should not be overwritten by a package.

It lives inside the package rather than on the website, so it always describes the version you have installed and can never claim a feature that is missing. Upgrade Polytheme and run it again to refresh the copy.

The syntax is one line, so the skill spends its length on what actually goes wrong: value counts that must match the theme count exactly, a bare slash always being a separator, so `--ratio: 16 / 9` silently becomes two themes, slashes inside brackets being safe, and never writing per-theme blocks.

---

## The Rule

Polytheme has exactly one rule, and it's the whole tool:

> **Inside a CSS variable, `/` separates your themes.**

Values map to your configured themes **in order**: the first value goes to the first theme, the second to the second, and so on.

```css
:root {
  /* order: light / dark / brand */
  --primary: var(--blue-500) / var(--blue-400) / var(--brand-accent);
}
```

```css
:root  { --primary: var(--blue-500); }
.dark  { --primary: var(--blue-400); }
.brand { --primary: var(--brand-accent); }
```

There's no second syntax and no separator to configure. One rule, applied the same way everywhere, so any Polytheme file reads the same in any project.

Slashes inside brackets are safe, `rgb(0 0 0 / 10%)` is one value, not two, so shadows, gradients and modern colour syntax all work normally.

> **A bare slash is always a separator**, so a token can't hold one by accident. With two themes configured, `--ratio: 16 / 9` becomes `16` in the first and `9` in the second, and nothing warns: the counts line up, so it looks deliberate. The same goes for a `font` shorthand like `16px/1.5 Inter`.

To keep a literal slash among your tokens, say so with a comment. It applies to the one declaration that follows, and doesn't survive into the output:

```css
:root {
  /* polytheme-ignore */
  --ratio: 16 / 9;
  --background: var(--white) / var(--black);
}
```

There's no automatic detection, and deliberately so: every part of `16 / 9` is a bare number, and so is every part of `--opacity: 1 / 0.5`: an ordinary themed token. Nothing can tell them apart except you.

---

## Activating themes

Your first theme is the default and needs nothing. Every other theme activates when its class is present on a parent element: usually `<html>`.

The first selector in your `themes` array, normally `:root`, applies globally, so your **default theme works with no class at all**. The remaining themes (`.dark`, `.brand`, …) are class-based: they only take effect when that class is on an ancestor.

```html
<!-- Switch on dark mode -->
<html class="dark">
  ...
</html>
```

You **don't need a `.light` class**. Because `:root` is the default, light *is* the no-class state: only the themes layered on top need a class.

> Your theme selectors are just CSS selectors. To drive themes with a data attribute instead, use `themes: [":root", "[data-theme=dark]"]` and toggle the attribute.

---

## Best Practice: Label your theme order

Because values map by position, leave a one-line comment at the top of each block noting the order. It costs nothing and makes the file effortless to read and edit later: especially with three or more themes.

```css
:root {
  /* order: light / dark / brand / lime */
  --background: var(--white) / var(--black) / var(--brand-bg) / var(--lime-bg);
  --foreground: var(--black) / var(--white) / var(--brand-fg) / var(--lime-fg);
}
```

The order always matches the `themes` array in your config: keep the two aligned and your tokens stay self-documenting.

---

## Configuration

Pass options under the `polytheme` key in your PostCSS config.

| Option   | Type       | Default              | Description                                            |
| -------- | ---------- | -------------------- | ------------------------------------------------------ |
| `themes` | `string[]` | `[":root", ".dark"]` | The selectors each value maps to, in order.            |

### Example: more than two themes

```js
// postcss.config.mjs
export default {
  plugins: {
    polytheme: { themes: [":root", ".dark", ".high-contrast"] },
  },
};
```

```css
:root {
  /* order: light / dark / high-contrast */
  --background: var(--white) / var(--black) / var(--pure-black);
}
```

```css
:root          { --background: var(--white); }
.dark          { --background: var(--black); }
.high-contrast { --background: var(--pure-black); }
```

> If a token has fewer values than you have themes, the extra themes are simply skipped for that token, so you only override what actually changes.

---

## Framework setup

The default PostCSS config works with any tool that runs PostCSS. The snippets below show exactly where the config lives in popular frameworks.

<details>
<summary><b>Next.js</b> (with Tailwind v4)</summary>

```js
// postcss.config.mjs
export default {
  plugins: {
    polytheme: { themes: [":root", ".dark"] },
    "@tailwindcss/postcss": {},
  },
};
```

</details>

<details>
<summary><b>Vite</b></summary>

```ts
// vite.config.ts
import polytheme from "polytheme";

export default {
  css: { postcss: { plugins: [polytheme({ themes: [":root", ".dark"] })] } },
};
```

</details>

<details>
<summary><b>Astro</b></summary>

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import polytheme from "polytheme";

export default defineConfig({
  vite: { css: { postcss: { plugins: [polytheme({ themes: [":root", ".dark"] })] } } },
});
```

</details>

---

## Using Polytheme with Tailwind v4

Polytheme pairs naturally with Tailwind v4's CSS-variable-based theming. Define your raw palette, let Polytheme generate your semantic tokens, then expose them to Tailwind with `@theme inline`.

```css
/* 1. Raw palette */
@theme {
  --color-white: #ffffff;
  --color-black: #0a0a0a;
}

/* 2. Semantic tokens: Polytheme expands these per theme */
:root {
  /* order: light / dark */
  --background: var(--color-white) / var(--color-black);
  --foreground: var(--color-black) / var(--color-white);
}

/* 3. Map them to Tailwind utilities */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

Now use them anywhere as ordinary Tailwind classes:

```html
<div class="bg-background text-foreground">
  Themed automatically: light and dark.
</div>
```

Toggle a theme by adding the matching class (e.g. `.dark`) to a parent element, and every token switches at once.

---

## Following the system preference

There are two ways, and which you want depends on whether the reader should be able to override the machine.

### Without JavaScript

Name the media query as a theme. Polytheme wraps that theme's values in a `:root` inside it, so nothing ships to the browser and there is no class to toggle:

```js
// postcss.config.mjs
export default {
  plugins: {
    polytheme: { themes: [":root", "@media (prefers-color-scheme: dark)"] },
  },
};
```

```css
/* Polytheme generates */
:root {
  --background: var(--white);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: var(--black);
  }
}
```

The trade-off is that the reader can't override it. A media query follows the machine and nothing else, so there is no way to offer a manual toggle on top.

### With a class, if you want a manual toggle

Keep `.dark` as the theme and set the class from the OS preference. Because the theme is still class-driven, a manual switch can override it later:

```js
// follow the OS preference
const mq = matchMedia("(prefers-color-scheme: dark)");
const apply = () => document.documentElement.classList.toggle("dark", mq.matches);
apply();
mq.addEventListener("change", apply);
```

Put the script in the `<head>` of your app's root HTML, **before any content renders**, so the right theme class is on `<html>` before the first paint and users never see a flash of the wrong theme.

> See the [System preference guide](https://polytheme.dev/docs/system-preference/) for where exactly to place it in HTML, Next.js, Vite, and Astro.

---

## Migrating from duplicated CSS

Already have hand-written `:root` / `.dark` / `.brand` blocks? You don't need to rewrite them.

The [Polytheme playground](https://polytheme.dev/playground/) runs the transform **both ways**. Switch it to **CSS → Polytheme**, paste your existing theme blocks, and it returns the equivalent shorthand: ready to drop back into your stylesheet. Values that just inherit `:root` get trimmed automatically, so you get the minimal correct output, not bloat.

---

## How It Works

Polytheme runs as a PostCSS plugin during your build. For each CSS custom property it finds:

1. It checks whether the value contains a `/` theme separator.
2. It splits the value into one part per theme, respecting nested parentheses so functions like `var(...)` stay intact.
3. It writes the first theme's value back where the shorthand stood, and appends a rule for each remaining theme, so comments and plain tokens stay with the values they describe.

If the shorthand was written under some other selector, every part moves to the configured theme selectors instead: the themes come from your config, never from the rule it happens to sit in.

The expansion stays inside whatever at-rule the shorthand was written in, `@media`, `@supports`, `@layer`, `@container`, `@scope`, so a value written inside a layer stays in that layer and keeps the priority it was given. A theme may itself be an at-rule, in which case it gets a `:root` to hold the declarations.

Crucially, it **only processes declarations whose property starts with `--`**. Regular properties like `background`, `color`, or `grid-template-columns` are never touched, so there's no risk of Polytheme breaking valid CSS.

---

## Roadmap

Polytheme is intentionally small and focused.

Already shipped:

- [x] **Mismatch warnings**: a token whose value count doesn't match the configured themes is left alone and reported through PostCSS.
- [x] **Sensible defaults**: `[":root", ".dark"]` out of the box, before any config.
- [x] **At-rule themes**: name a media query as a theme for OS dark mode with no JavaScript.
- [x] **Theme packs**: ready-made token sets that combine rather than overwrite.
- [x] **An agent skill**: shipped in the package, installed with `npx polytheme skill`.

Exploring next:

- [ ] **Debug mode**: print what was generated during the build.

That list is set by the two people who maintain Polytheme, and it isn't taking requests at the moment.

---

## Contributing

Polytheme is maintained by Akorede J. Ayanbisi and Taiwo Hammed, and isn't open to outside contributions at the moment: issues are closed, and pull requests from outside the project aren't being reviewed.

That may change. [`CONTRIBUTING.md`](./CONTRIBUTING.md) is still there and still accurate — it covers setup, the project structure, and the design principles that decide what belongs in the tool, which is worth reading whether or not you can send a patch.

---

## Creators

Polytheme is built by:

**Akorede J. Ayanbisi**

- X: [x.com/aj_ayanbisi](https://x.com/aj_ayanbisi)
- LinkedIn: [linkedin.com/in/ajayanbisi](https://www.linkedin.com/in/ajayanbisi/)
- GitHub: [github.com/ajayanbisi](https://github.com/ajayanbisi)
- Portfolio: [ayanbisi.com](https://ayanbisi.com/)

**Taiwo Hammed**

- X: [x.com/hammedt20_](https://x.com/hammedt20_)
- LinkedIn: [linkedin.com/in/taiwo-hammed](https://www.linkedin.com/in/taiwo-hammed)
- GitHub: [github.com/hammedt20](https://github.com/hammedt20)
- Portfolio: [taiwo-hammed.netlify.app](https://taiwo-hammed.netlify.app/)

---

## License

[MIT](./LICENSE) © 2026 Polytheme and Contributors

---

<div align="center">

Created with 🖤 by Akorede J. Ayanbisi & Taiwo Hammed

Made with care to save you from writing the same line twice.

</div>
