"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/defaults.ts
var DEFAULT_THEMES = [":root", ".dark"];
var THEME_SEPARATOR = "/";

// src/transform.ts
var import_postcss = __toESM(require("postcss"));

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
      rule = import_postcss.default.rule({ selector });
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
