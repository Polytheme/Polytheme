import postcss from "postcss";
import { describe, expect, it } from "vitest";
import plugin from "./index";

async function processCss(css: string) {
  const result = await postcss([plugin()]).process(css, {
    from: undefined,
  });

  return result.css;
}

async function processResult(css: string) {
  return postcss([plugin()]).process(css, {
    from: undefined,
  });
}

describe("theme-shorthand", () => {
  it("expands slash-separated custom properties into theme rules", async () => {
    const css = await processCss(`
        .tokens {
          --color-bg: white / black;
          color: var(--color-bg);
        }
      `);

    expect(css).toContain("color: var(--color-bg)");
    expect(css).toContain(":root");
    expect(css).toContain("--color-bg: white");
    expect(css).toContain(".dark");
    expect(css).toContain("--color-bg: black");
    expect(css).not.toContain("--color-bg: white / black");
  });

  it("uses configured theme selectors", async () => {
    const result = await postcss([
      plugin({ themes: [":root", ".dark", ".high-contrast"] }),
    ]).process(
      `
        .tokens {
          --color-bg: white / black / yellow;
        }
      `,
      { from: undefined }
    );

    expect(result.css).toContain(":root");
    expect(result.css).toContain("--color-bg: white");
    expect(result.css).toContain(".dark");
    expect(result.css).toContain("--color-bg: black");
    expect(result.css).toContain(".high-contrast");
    expect(result.css).toContain("--color-bg: yellow");
    expect(result.warnings()).toHaveLength(0);
  });

  it("leaves theme-values function declarations alone", async () => {
    await expect(
      processCss(`
        .tokens {
          --shadow-color: theme-values(color-mix(in srgb, red 50%, blue), black);
        }
      `)
    ).resolves.toContain("theme-values(color-mix(in srgb, red 50%, blue), black)");
  });

  it("turns shadcn-style slash values into inspectable light and dark rules", async () => {
    const css = await processCss(`
        :root {
          --background: lab(100% 0 0) / lab(2.75381% 0 0);
          --foreground: lab(2.75381% 0 0) / lab(98.26% 0 0);
        }
      `);

    expect(css.trim()).toMatchInlineSnapshot(`
      ":root {
          --background: lab(100% 0 0);
          --foreground: lab(2.75381% 0 0)
      }
      .dark {
          --background: lab(2.75381% 0 0);
          --foreground: lab(98.26% 0 0)
      }"
    `);
  });

  it("leaves regular declarations alone", async () => {
    await expect(
      processCss(`
        .button {
          color: red / blue;
        }
      `)
    ).resolves.toContain("color: red / blue");
  });

  it("leaves incomplete shorthand declarations alone", async () => {
    await expect(
      processCss(`
        .tokens {
          --color-bg: white / ;
        }
      `)
    ).resolves.toContain("--color-bg: white /");
  });

  it("leaves theme declarations alone when value count does not match themes", async () => {
    const result = await processResult(`
      .tokens {
        --color-bg: white / gray / black;
      }
    `);

    expect(result.css).toContain("--color-bg: white / gray / black");
    expect(result.css).not.toContain(".dark");
    expect(result.warnings()).toHaveLength(1);
    expect(result.warnings()[0].text).toContain("found 3 values for 2 themes");
  });
});
