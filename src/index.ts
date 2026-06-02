import type { PluginCreator } from "postcss";
import { DEFAULT_THEMES } from "./defaults";
import { transformThemeShorthand } from "./transform";

const plugin: PluginCreator<void> = () => {
  return {
    postcssPlugin: "theme-shorthand",

    Once(root, { result }) {
      transformThemeShorthand(root, DEFAULT_THEMES, result);
    },
  };
};

plugin.postcss = true;

export default plugin;
