import { describe, it, expect } from "vitest";
import { convertMarkdownToIntentText } from "../src/markdown";

describe("Markdown -> IntentText converter", () => {
  it("should convert headings, lists, and code blocks", () => {
    const md = `# Title

## Section

- item 1
- item 2

1. step 1
2. step 2

\`\`\`js
console.log("hi")
\`\`\`
`;

    const itText = convertMarkdownToIntentText(md);

    expect(itText).toContain("title: Title");
    expect(itText).toContain("section: Section");
    expect(itText).toContain("- item 1");
    expect(itText).toContain("1. step 1");
    expect(itText).toContain("code:");
    expect(itText).toContain("console.log(\"hi\")");
    expect(itText).toContain("end:");
  });

  it("should convert inline markdown formatting into IntentText inline conventions", () => {
    const md = "**Bold** *italic* ~~strike~~ `code`";
    const itText = convertMarkdownToIntentText(md);

    // paragraph becomes note:
    expect(itText).toBe("note: *Bold* _italic_ ~strike~ ```code```");
  });

  it("should convert standalone links and images", () => {
    const md = `[Docs](https://example.com)\n![Alt](logo.png)\n`;
    const itText = convertMarkdownToIntentText(md);

    expect(itText).toContain("link: Docs | to: https://example.com");
    expect(itText).toContain("image: Alt | at: logo.png");
  });
});
