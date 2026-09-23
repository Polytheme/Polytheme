import type { PluginCreator } from "postcss";
import { DEFAULT_THEMES } from "./defaults";
import { transformThemeShorthand } from "./transform";

export type PolythemeOptions = {
  themes?: string[];
};

const plugin: PluginCreator<PolythemeOptions> = (options = {}) => {
  const themes = options.themes ?? DEFAULT_THEMES;

  return {
    postcssPlugin: "theme-shorthand",

    OnceExit(root, { result }) {
      transformThemeShorthand(root, themes, result);
    },
  };
};

plugin.postcss = true;

export default plugin;
