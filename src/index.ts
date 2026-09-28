import type { PluginCreator, Result } from "postcss";
import { DEFAULT_THEMES } from "./defaults";
import { collectIgnored, transformThemeShorthand } from "./transform";

/* Not a property name anyone can collide with, on an object we do not own. */
const IGNORED = Symbol.for("polytheme.ignored");

export type PolythemeOptions = {
  themes?: string[];
};

const plugin: PluginCreator<PolythemeOptions> = (options = {}) => {
  const themes = options.themes ?? DEFAULT_THEMES;

  return {
    postcssPlugin: "theme-shorthand",

    /*
     * The marks are read first, the expansion happens last.
     *
     * The expansion has to run late so that tokens pulled in by postcss-import
     * are in the tree by the time it looks. But a plugin running in between can
     * rebuild that tree, and `@tailwindcss/postcss` does: resolving `@import
     * "tailwindcss"` drops every comment, taking the ignore directives with it.
     * Reading them here, before anything else has run, is the only point at
     * which they are all still there.
     *
     * Kept on the result rather than in this closure, because PostCSS reuses
     * one plugin instance for every file it processes: a closure would carry a
     * stale mark from the last build into the next one.
     */
    Once(root, { result }) {
      (result as Result & { [IGNORED]?: Set<string> })[IGNORED] = collectIgnored(root);
    },

    OnceExit(root, { result }) {
      const ignored = (result as Result & { [IGNORED]?: Set<string> })[IGNORED];
      transformThemeShorthand(root, themes, result, ignored);
    },
  };
};

plugin.postcss = true;

export default plugin;
