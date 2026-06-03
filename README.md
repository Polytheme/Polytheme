<div align="center">

# 🎨 Polytheme

### Write your theme variables once, not once per theme.

A Tailwind-first PostCSS plugin that turns a single line of CSS into every theme — light, dark, brand, and beyond.

[![npm version](https://img.shields.io/npm/v/polytheme.svg)](https://www.npmjs.com/package/polytheme)
[![license](https://img.shields.io/github/license/Polytheme/Polytheme.svg)](./LICENSE)
[![PostCSS](https://img.shields.io/badge/PostCSS-plugin-dd3a0a.svg)](https://postcss.org)

[Website](https://polytheme.dev) · [Docs](https://polytheme.dev/docs.html) · [Playground](https://polytheme.dev/#playground) · [npm](https://www.npmjs.com/package/polytheme)

</div>

---

## Why Polytheme?

Theming the usual way means writing the same variables over and over — one block for light, another for dark, another for every brand or mode — then keeping them all in sync by hand. It's slow, repetitive, and easy to break.

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

It only ever touches CSS variables (`--*`), so your regular CSS is never altered — and the output drops straight into a Tailwind v4 `@theme` setup.

---

## Features

- **One line, every theme** — define a token once with a value per theme.
- **One simple rule** — inside a CSS variable, `/` separates your themes. No syntax to learn, no options to weigh.
- **Tailwind-first** — output is plain CSS custom properties, made to plug into Tailwind v4's `@theme`.
- **Safe by design** — only transforms declarations starting with `--`. Your normal CSS is left exactly as written.
- **Any number of themes** — light and dark out of the box, plus brand modes, high-contrast, or whatever you define.
- **Zero runtime** — everything happens at build time. No JavaScript ships to the browser.

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

## The Rule

Polytheme has exactly one rule, and it's the whole tool:

> **Inside a CSS variable, `/` separates your themes.**

Values map to your configured themes **in order** — the first value goes to the first theme, the second to the second, and so on.

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

There's no second syntax and no separator to configure. One rule, applied the same way everywhere — so any Polytheme file reads the same in any project.

> Because `/` inside a custom property always means "split across themes," design tokens shouldn't hold a raw slash value (like an aspect ratio). Keep those in regular properties, where Polytheme never looks.

---

## Activating themes

Your first theme is the default and needs nothing. Every other theme activates when its class is present on a parent element — usually `<html>`.

The first selector in your `themes` array — normally `:root` — applies globally, so your **default theme works with no class at all**. The remaining themes (`.dark`, `.brand`, …) are class-based: they only take effect when that class is on an ancestor.

```html
<!-- Switch on dark mode -->
<html class="dark">
  ...
</html>
```

You **don't need a `.light` class**. Because `:root` is the default, light *is* the no-class state — only the themes layered on top need a class.

> Your theme selectors are just CSS selectors. To drive themes with a data attribute instead, use `themes: [":root", "[data-theme=dark]"]` and toggle the attribute.

---

## Best Practice: Label your theme order

Because values map by position, leave a one-line comment at the top of each block noting the order. It costs nothing and makes the file effortless to read and edit later — especially with three or more themes.

```css
:root {
  /* order: light / dark / brand / lime */
  --background: var(--white) / var(--black) / var(--brand-bg) / var(--lime-bg);
  --foreground: var(--black) / var(--white) / var(--brand-fg) / var(--lime-fg);
}
```

The order always matches the `themes` array in your config — keep the two aligned and your tokens stay self-documenting.

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

> If a token has fewer values than you have themes, the extra themes are simply skipped for that token — so you only override what actually changes.

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

/* 2. Semantic tokens — Polytheme expands these per theme */
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
  Themed automatically — light and dark.
</div>
```

Toggle a theme by adding the matching class (e.g. `.dark`) to a parent element, and every token switches at once.

---

## Following the system preference

Polytheme generates class-based themes like `.dark`. To respect the OS setting, toggle that class with a tiny script:

```js
// follow the OS preference
const mq = matchMedia("(prefers-color-scheme: dark)");
const apply = () => document.documentElement.classList.toggle("dark", mq.matches);
apply();
mq.addEventListener("change", apply);
```

Put the script in the `<head>` of your app's root HTML, **before any content renders** — so the right theme class is on `<html>` before the first paint and users never see a flash of the wrong theme.

> See the [System preference guide](https://polytheme.dev/docs.html#system-preference) for where exactly to place it in HTML, Next.js, Vite, and Astro.

---

## Migrating from duplicated CSS

Already have hand-written `:root` / `.dark` / `.brand` blocks? You don't need to rewrite them.

The [Polytheme playground](https://polytheme.dev/#playground) runs the transform **both ways**. Switch it to **CSS → Polytheme**, paste your existing theme blocks, and it returns the equivalent shorthand — ready to drop back into your stylesheet. Values that just inherit `:root` get trimmed automatically, so you get the minimal correct output, not bloat.

---

## How It Works

Polytheme runs as a PostCSS plugin during your build. For each CSS custom property it finds:

1. It checks whether the value contains a `/` theme separator.
2. It splits the value into one part per theme, respecting nested parentheses so functions like `var(...)` stay intact.
3. It distributes each part to its matching theme selector and removes the original shorthand declaration.

Crucially, it **only processes declarations whose property starts with `--`**. Regular properties like `background`, `color`, or `grid-template-columns` are never touched, so there's no risk of Polytheme breaking valid CSS.

---

## Roadmap

Polytheme is intentionally small and focused. Things we're exploring next:

- [ ] **Mismatch warnings** — flag when a token's value count doesn't match the configured themes.
- [ ] **Debug mode** — print what was generated during the build.
- [ ] **Sensible defaults** — work out of the box with `[":root", ".dark"]` before any config.

Have an idea? [Open an issue](https://github.com/polytheme/polytheme/issues) — we'd love to hear it.

---

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first — it covers setup, the design principles that guide what gets merged (Polytheme is intentionally opinionated), and PR guidelines.

---

## Creators

Polytheme is built by:

**Taiwo Hammed**

- X — [x.com/hammedt20_](https://x.com/hammedt20_)
- LinkedIn — [linkedin.com/in/taiwo-hammed](https://www.linkedin.com/in/taiwo-hammed)
- GitHub — [github.com/hammedt20](https://github.com/hammedt20)
- Portfolio — [taiwo-hammed.netlify.app](https://taiwo-hammed.netlify.app/)

**Akorede J. Ayanbisi**

- X — [x.com/aj_ayanbisi](https://x.com/aj_ayanbisi)
- LinkedIn — [linkedin.com/in/ajayanbisi](https://www.linkedin.com/in/ajayanbisi/)
- GitHub — [github.com/ajayanbisi](https://github.com/ajayanbisi)
- Portfolio — [ayanbisi.com](https://ayanbisi.com/)

---

## License

[MIT](./LICENSE) © 2026 Polytheme and Contributors

---

<div align="center">

Built by Taiwo Hammed & Akorede J. Ayanbisi

Made with care to save you from writing the same line twice.

</div>
