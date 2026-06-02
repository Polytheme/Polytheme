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

    values.forEach((value, index) => {
      const selector = themes[index];

      if (!selector) return;

      getRule(selector).append({
        prop: decl.prop,
        value,
      });
    });

    if (decl.parent?.type === "rule") {
      touchedRules.add(decl.parent);
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
