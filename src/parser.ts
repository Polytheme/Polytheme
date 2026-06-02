import { THEME_SEPARATOR } from "./defaults";

export function extractThemeValues(
  value: string
): string[] | null {
  const trimmed = normalizeValue(value);
  const values = splitByTopLevelToken(trimmed, THEME_SEPARATOR);
  const cleanedValues = values.map((item) => item.trim()).filter(Boolean);

  if (cleanedValues.length > 1) {
    return cleanedValues;
  }

  return null;
}

export function hasThemeShorthandSyntax(value: string) {
  const trimmed = normalizeValue(value);

  return hasTopLevelToken(trimmed, THEME_SEPARATOR);
}

function normalizeValue(value: string) {
  return value.trim().replace(/;$/, "").trim();
}

function splitByTopLevelToken(value: string, token: string): string[] {
  const result: string[] = [];
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

function hasTopLevelToken(value: string, token: string) {
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
