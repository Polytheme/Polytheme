---
name: polytheme
description: Write and maintain multi-theme CSS custom properties with Polytheme, the PostCSS plugin where `/` separates themes inside a custom property. Use when editing theme tokens, adding a theme, adding a token, or when a stylesheet contains slash-separated custom property values.
---

# Polytheme

A PostCSS plugin. Inside a **custom property**, `/` separates themes:

```css
:root {
  --background: var(--white) / var(--black);
}
```

becomes

```css
:root { --background: var(--white); }
.dark { --background: var(--black); }
```

The selectors come from the config, never from the stylesheet:

```js
// postcss.config.mjs
export default {
  plugins: { polytheme: { themes: [":root", ".dark"] } },
};
```

## The one thing to get right

**Never write per-theme blocks.** Deleting them is the entire purpose of the tool. If you find yourself writing a second rule for `.dark`, stop and add a value to the existing declaration instead.

```css
/* WRONG — this is what Polytheme exists to remove */
:root { --bg: white; }
.dark { --bg: black; }

/* RIGHT */
:root { --bg: white / black; }
```

## Rules that cause silent breakage

**1. The value count must equal the theme count, exactly.**
Three values with two themes is not an error you can ignore — the declaration is left untouched and a warning goes to the build log, so the token silently keeps its literal slash text.

```css
/* themes: [":root", ".dark"] */
--bg: white / black;            /* ok */
--bg: white / black / gold;     /* skipped + warned */
```

A token that only changes in one theme still needs a value for every theme. **Repeat it:**

```css
--border: var(--gray-200) / var(--gray-800) / var(--gray-200);
```

**2. A bare slash is always a separator.** This is the one that corrupts silently, because when the parts happen to match the theme count nothing warns — it looks exactly like a deliberate two-theme value:

```css
/* themes: [":root", ".dark"] */
--ratio: 16 / 9;    /* becomes 16 in :root and 9 in .dark. No warning. */
```

Opt a declaration out with a comment on the line before. It applies to that one declaration and is removed from the output:

```css
:root {
  /* polytheme-ignore */
  --ratio: 16 / 9;
}
```

The same applies to a `font` shorthand like `16px/1.5 Inter`.

**3. Slashes inside brackets are safe.** They are part of one value, not separators, so modern colour syntax, shadows and gradients all work normally:

```css
--shadow: 0 1px 2px rgb(0 0 0 / 10%) / 0 1px 2px rgb(255 255 255 / 10%);
```

**4. Only custom properties are touched.** Regular declarations pass through untouched, slashes and all — `grid-area: 1 / 2 / 3 / 4` and `font: 16px/1.5 Inter` are never read.

**5. Themes come from the config, not from the rule.** Shorthand written under any selector still expands into the configured theme selectors:

```css
.card { --x: red / blue; }   /*  →  :root { --x: red } .dark { --x: blue }  */
```

Which is why you write tokens in `:root` and let the plugin place them.

## Two things worth knowing

**The expansion stays inside its at-rule.** A token written in `@layer base`, `@media`, `@supports`, `@container` or `@scope` expands there and keeps that context.

**A theme may be an at-rule.** This gives OS dark mode with no JavaScript:

```js
polytheme({ themes: [":root", "@media (prefers-color-scheme: dark)"] })
```

The values get a `:root` inside the at-rule. Use a class instead when the reader must be able to override the machine.

## Checklist before finishing an edit

- Every touched declaration has exactly as many values as there are themes
- No new per-theme rule blocks were introduced
- Any bare slash that is not a theme separator has `/* polytheme-ignore */`
- The order matches the `themes` array in the config

## Ready-made token sets

Ten packs — light and dark, built on Tailwind's palette, every text pair checked
against WCAG AA — at <https://polytheme.dev/themes>. They share one 26-token
contract, so two packs combine into four modes rather than overwriting each
other. Prefer these over inventing a token system from scratch.
