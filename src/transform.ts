import postcss, { type Result, type Root, type Rule } from "postcss";
import { extractThemeValues, hasThemeShorthandSyntax } from "./parser";

export function transformThemeShorthand(
  root: Root,
  themes: string[],
  result: Result
) {
  const groupedRules = new Map<string, Rule>();
  const touchedRules = new Set<Rule>();

  const getRule = (selector: string) => {
    let rule = groupedRules.get(selector);

    if (!rule) {
      rule = postcss.rule({ selector });
      groupedRules.set(selector, rule);
    }

    return rule;
  };

  root.walkDecls((decl) => {
    if (!decl.prop.startsWith("--")) return;

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

      getRule(selector).append({
        prop: decl.prop,
        value,
      });
    });

    if (parent?.type === "rule") {
      touchedRules.add(parent);
    }

    decl.remove();
  });

  for (const rule of touchedRules) {
    if (rule.nodes?.length === 0) {
      rule.remove();
    }
  }

  for (const rule of groupedRules.values()) {
    root.append(rule);
  }
}
