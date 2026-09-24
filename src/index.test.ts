import postcss from "postcss";
import { describe, expect, it } from "vitest";
import plugin from "./index";

async function processCss(css: string, themes?: string[]) {
  const result = await postcss([plugin(themes ? { themes } : undefined)]).process(css, {
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

    // The :root values keep the source's own indentation now that they are
    // rewritten where they stood; the appended .dark rule is generated.
    expect(css.trim()).toMatchInlineSnapshot(`
      ":root {
                --background: lab(100% 0 0);
                --foreground: lab(2.75381% 0 0);
              }
      .dark {
                --background: lab(2.75381% 0 0);
                --foreground: lab(98.26% 0 0);
      }"
    `);
  });

  /*
   * The first theme is written back where the shorthand stood, rather than
   * hoisted into a new rule at the end. Before this, a :root holding anything
   * else — a plain token, or the `order:` comment the docs recommend — was left
   * behind empty while its values reappeared further down, so a file following
   * the documented style always produced two :root rules.
   */
  describe("the polytheme-ignore directive", () => {
    it("leaves the declaration it precedes alone", async () => {
      const css = await processCss(`
:root {
  /* polytheme-ignore */
  --ratio: 16 / 9;
}
      `);

      expect(css).toContain("--ratio: 16 / 9");
      expect(css).not.toContain(".dark");
    });

    it("does not leave the directive in the output", async () => {
      const css = await processCss(`
:root {
  /* polytheme-ignore */
  --ratio: 16 / 9;
}
      `);

      expect(css).not.toContain("polytheme-ignore");
    });

    it("covers only the declaration immediately after it", async () => {
      const css = await processCss(`
:root {
  /* polytheme-ignore */
  --ratio: 16 / 9;
  --background: white / black;
}
      `);

      expect(css).toContain("--ratio: 16 / 9");
      expect(css).toContain("--background: white");
      expect(css).toContain(".dark");
    });

    it("leaves ordinary comments and their declarations working", async () => {
      const css = await processCss(`
:root {
  /* order: light / dark */
  --background: white / black;
}
      `);

      expect(css).toContain("/* order: light / dark */");
      expect(css).toContain("--background: white");
      expect(css).toContain(".dark");
    });
  });

  describe("expanding the first theme in place", () => {
    it("keeps a comment with the values it describes, and adds no second :root", async () => {
      const css = await processCss(`
:root {
  /* order: light / dark */
  --background: white / black;
}
      `);

      expect(css).toContain("/* order: light / dark */");
      expect(css.match(/:root/g)).toHaveLength(1);
      expect(css.indexOf("--background: white")).toBeGreaterThan(css.indexOf("order: light"));
    });

    it("leaves a plain token sitting alongside the expanded ones", async () => {
      const css = await processCss(`
:root {
  --radius: 12px;
  --background: white / black;
}
      `);

      const root = css.slice(0, css.indexOf(".dark"));
      expect(root).toContain("--radius: 12px");
      expect(root).toContain("--background: white");
      expect(css.match(/:root/g)).toHaveLength(1);
    });

    it("still hoists shorthand written under some other selector", async () => {
      const css = await processCss(`
.card {
  --x: red / blue;
}
      `);

      // The themes come from the config, never from the rule it was written in.
      expect(css).toContain(":root");
      expect(css).toContain("--x: red");
      expect(css).toContain(".dark");
      expect(css).toContain("--x: blue");
      expect(css).not.toMatch(/\.card\s*\{[^}]*--x/);
    });

    it("removes a rule that held nothing but shorthand", async () => {
      const css = await processCss(`
.card {
  --x: red / blue;
}
      `);

      expect(css).not.toContain(".card");
    });
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


  it("expands into as many themes as it is given", async () => {
    const css = await processCss(
      `
        :root {
          --background: white / black / navy;
        }
      `,
      [":root", ".dark", ".brand"]
    );

    expect(css).toContain("--background: white");
    expect(css).toContain(".dark");
    expect(css).toContain("--background: black");
    expect(css).toContain(".brand");
    expect(css).toContain("--background: navy");
  });

  it("leaves a non-theme slash value alone when it does not match the theme count", async () => {
    /*
     * Tailwind v4 ships tokens whose value legitimately contains a top-level
     * slash, e.g. `--aspect-video: 16 / 9`. A mismatch against the configured
     * theme count is what protects them.
     *
     * KNOWN LIMITATION: under the default two themes, `16 / 9` has exactly two
     * parts, so it is indistinguishable from real shorthand and gets split into
     * `:root { --aspect-video: 16 }` / `.dark { --aspect-video: 9 }` with no
     * warning. Projects on the two-theme default should be aware of this.
     */
    const result = await postcss([plugin({ themes: [":root", ".dark", ".brand"] })]).process(
      `
        :root {
          --aspect-video: 16 / 9;
        }
      `,
      { from: undefined }
    );

    expect(result.css).toContain("--aspect-video: 16 / 9");
    expect(result.warnings()).toHaveLength(1);
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
