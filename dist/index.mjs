// src/defaults.ts
var DEFAULT_THEMES = [":root", ".dark"];
var THEME_SEPARATOR = "/";

// src/transform.ts
import postcss from "postcss";

// src/parser.ts
function extractThemeValues(value) {
  const trimmed = normalizeValue(value);
  const values = splitByTopLevelToken(trimmed, THEME_SEPARATOR);
  const cleanedValues = values.map((item) => item.trim()).filter(Boolean);
  if (cleanedValues.length > 1) {
    return cleanedValues;
  }
  return null;
}
function hasThemeShorthandSyntax(value) {
  const trimmed = normalizeValue(value);
  return hasTopLevelToken(trimmed, THEME_SEPARATOR);
}
function normalizeValue(value) {
  return value.trim().replace(/;$/, "").trim();
}
function splitByTopLevelToken(value, token) {
  const result = [];
  let current = "";
  let depth = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth === 0 && value.startsWith(token, index)) {
      result.push(current);
      current = "";
      index += token.length - 1;
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    result.push(current);
  }
  return result;
}
function hasTopLevelToken(value, token) {
  let depth = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth === 0 && value.startsWith(token, index)) {
      return true;
    }
  }
  return false;
}

// src/transform.ts
function transformThemeShorthand(root, themes, result) {
  const groupedRules = /* @__PURE__ */ new Map();
  const touchedRules = /* @__PURE__ */ new Set();
  const getRule = (selector) => {
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
        value
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

// src/index.ts
var plugin = () => {
  return {
    postcssPlugin: "theme-shorthand",
    Once(root, { result }) {
      transformThemeShorthand(root, DEFAULT_THEMES, result);
    }
  };
};
plugin.postcss = true;
var index_default = plugin;
export {
  index_default as default
};
