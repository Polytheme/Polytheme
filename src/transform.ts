import postcss, {
  type AtRule,
  type ChildNode,
  type Comment,
  type Container,
  type Declaration,
  type Result,
  type Root,
  type Rule,
} from "postcss";
import { extractThemeValues, hasThemeShorthandSyntax } from "./parser";

/*
 * Opts a single declaration out of the transform:
 *
 *     :root {
 *       \/* polytheme-ignore *\/
 *       --ratio: 16 / 9;
 *     }
 *
 * A slash inside a custom property is always a separator, so without this there
 * is no way to write one that means something else. Worse, the failure is
 * silent whenever the parts happen to match the theme count: with two themes,
 * `16 / 9` becomes `16` and `9` and nothing warns, because that is exactly what
 * a deliberate two-theme value looks like.
 *
 * Detecting the mistake instead of declaring it is not possible. Every part of
 * `16 / 9` is a bare number, and so is every part of `--opacity: 1 / 0.5`,
 * `--line-height: 1.5 / 1.6` and `--z-modal: 100 / 200`, which are ordinary
 * themed tokens. Any rule that catches the ratio catches those too.
 */
const IGNORE = /^\s*polytheme-ignore\s*$/;

/*
 * At-rules that group style rules, and so can hold an expansion.
 *
 * Expansions used to be appended to the document root no matter where the
 * shorthand was written, which quietly changed what they meant: a value inside
 * `@layer base` came back out unlayered and so outranked the rest of the layer,
 * one inside `@supports` applied even where the feature was missing, and one
 * inside `@media (min-width: 40rem)` applied at every width. Two shorthands in
 * different layers even merged into a single rule.
 *
 * Anything not on this list is not a container — `@keyframes` most of all,
 * where a `:root` would be nonsense — so those still hoist to the root.
 */
const GROUPING_AT_RULES = new Set([
  "media",
  "supports",
  "layer",
  "container",
  "scope",
  "document",
]);

/** The nearest grouping at-rule around a declaration, or the root. */
function containerOf(decl: Declaration, root: Root): Container {
  let node: Container | undefined = decl.parent as Container | undefined;

  while (node && node.type !== "root") {
    if (node.type === "atrule" && GROUPING_AT_RULES.has((node as AtRule).name.toLowerCase())) {
      return node;
    }
    node = node.parent as Container | undefined;
  }

  return node ?? root;
}

/*
 * Builds the node a theme's values go into.
 *
 * A theme is usually a selector, but it may be an at-rule — `@media
 * (prefers-color-scheme: dark)` is the obvious one, and gives class-free
 * theming that follows the operating system. Declarations cannot sit directly
 * in an at-rule, so it gets a `:root` to hold them; without that the output was
 * a block of declarations with nothing to apply them to, which browsers discard
 * silently.
 */
function createThemeNode(theme: string): { node: ChildNode; target: Container } {
  if (!theme.trimStart().startsWith("@")) {
    const rule = postcss.rule({ selector: theme });
    return { node: rule, target: rule };
  }

  const match = theme.trim().match(/^@([\w-]+)\s*([\s\S]*)$/);

  if (!match) {
    const rule = postcss.rule({ selector: theme });
    return { node: rule, target: rule };
  }

  const atRule = postcss.atRule({ name: match[1], params: match[2].trim() });
  const inner = postcss.rule({ selector: ":root" });
  atRule.append(inner);

  return { node: atRule, target: inner };
}

export function transformThemeShorthand(
  root: Root,
  themes: string[],
  result: Result
) {
  // Keyed by container first: two shorthands under different at-rules must not
  // share an expansion, however alike their themes look.
  const grouped = new Map<Container, Map<string, { node: ChildNode; target: Container }>>();
  const touchedRules = new Set<Rule>();
  const directives = new Set<Comment>();

  const getTarget = (container: Container, theme: string) => {
    let byTheme = grouped.get(container);

    if (!byTheme) {
      byTheme = new Map();
      grouped.set(container, byTheme);
    }

    let entry = byTheme.get(theme);

    if (!entry) {
      entry = createThemeNode(theme);
      byTheme.set(theme, entry);
    }

    return entry.target;
  };

  root.walkDecls((decl) => {
    if (!decl.prop.startsWith("--")) return;

    const previous = decl.prev();

    if (previous?.type === "comment" && IGNORE.test(previous.text)) {
      // The directive is build input, not part of the stylesheet, so it does
      // not survive into the output the way an ordinary comment does.
      directives.add(previous);
      return;
    }

    const values = extractThemeValues(decl.value);

    if (!values) {
      if (hasThemeShorthandSyntax(decl.value)) {
        decl.warn(
          result,
          `Unable to transform ${decl.prop}: theme shorthand must include at least two non-empty values.`
        );
      }

      return;
    }

    if (values.length !== themes.length) {
      decl.warn(
        result,
        `Unable to transform ${decl.prop}: found ${values.length} values for ${themes.length} themes.`
      );

      return;
    }

    const parent = decl.parent;

    values.forEach((value, index) => {
      const selector = themes[index];

      if (!selector) return;

      /*
       * The first theme is the one the author is already writing in. When the
       * declaration sits in a rule with exactly that selector, its value is put
       * back where the shorthand stood instead of being hoisted into a new rule
       * at the end of the stylesheet.
       *
       * Otherwise a `:root` holding anything besides shorthand — a plain token,
       * or the `/* order: light / dark *\/` comment the docs recommend — was
       * left behind empty while its values reappeared further down, so a file
       * following the documented style always built two `:root` rules. Keeping
       * the value in place also respects source order: a later override of the
       * same custom property now wins, where before the hoisted copy did.
       *
       * Only when the selectors match. Shorthand is allowed anywhere, and its
       * values always belong to the configured themes rather than to whatever
       * rule it happens to be written in — `.card { --x: a / b }` still expands
       * into `:root` and `.dark`.
       */
      if (index === 0 && parent?.type === "rule" && parent.selector === selector) {
        decl.cloneBefore({ prop: decl.prop, value });
        return;
      }

      getTarget(containerOf(decl, root), selector).append({
        prop: decl.prop,
        value,
      });
    });

    if (parent?.type === "rule") {
      touchedRules.add(parent);
    }

    decl.remove();
  });

  for (const directive of directives) {
    directive.remove();
  }

  for (const rule of touchedRules) {
    if (rule.nodes?.length === 0) {
      rule.remove();
    }
  }

  for (const [container, byTheme] of grouped) {
    for (const { node } of byTheme.values()) {
      container.append(node);
    }
  }
}
