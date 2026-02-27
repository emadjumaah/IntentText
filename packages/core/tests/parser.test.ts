import { describe, it, expect } from "vitest";
import { parseIntentText } from "../src/parser";
import type { IntentExtension } from "../src/types";

describe("IntentText Parser", () => {
  it("should parse a simple title", () => {
    const input = "title: My Document";
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("title");
    expect(result.blocks[0].content).toBe("My Document");
    expect(result.metadata?.title).toBe("My Document");
  });

  it("should parse inline formatting", () => {
    const input = "title: *Bold* and _italic_ text";
    const result = parseIntentText(input);

    expect(result.blocks[0].content).toBe("Bold and italic text");
    expect(result.blocks[0].inline?.some((n) => n.type === "bold")).toBe(true);
    expect(result.blocks[0].inline?.some((n) => n.type === "italic")).toBe(
      true,
    );
  });

  it("should parse pipe metadata", () => {
    const input = "task: Database migration | owner: Ahmed | due: Sunday";
    const result = parseIntentText(input);

    expect(result.blocks[0].type).toBe("task");
    expect(result.blocks[0].content).toBe("Database migration");
    expect(result.blocks[0].properties).toEqual({
      owner: "Ahmed",
      due: "Sunday",
    });
  });

  it("should parse list items", () => {
    const input = `- First item
- Second item
1. First step
2. Second step`;

    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(4);
    expect(result.blocks[0].type).toBe("list-item");
    expect(result.blocks[0].content).toBe("First item");
    expect(result.blocks[2].type).toBe("step-item");
    expect(result.blocks[2].content).toBe("First step");
  });

  it("should parse tables", () => {
    const input = `headers: Name | Age | City
row: Ahmed | 30 | Dubai
row: Sara | 25 | Abu Dhabi`;

    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("table");
    expect(result.blocks[0].table?.headers).toEqual(["Name", "Age", "City"]);
    expect(result.blocks[0].table?.rows).toEqual([
      ["Ahmed", "30", "Dubai"],
      ["Sara", "25", "Abu Dhabi"],
    ]);
  });

  it("should parse multi-line code blocks", () => {
    const input = `code:
#!/bin/bash
echo "Hello World"
end:`;

    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("code");
    expect(result.blocks[0].content).toBe('#!/bin/bash\necho "Hello World"');
  });

  it("should detect Arabic text", () => {
    const input = "title: مرحبا بالعالم";
    const result = parseIntentText(input);

    expect(result.metadata?.language).toBe("rtl");
  });

  it("should parse the full example from spec", () => {
    const input = `title: *Project Dalil* Launch Plan
summary: Finalizing the deployment for the AI-Agent hub in _Doha_.

section: Logistics & Equipment
headers: Item | Location | Status
row: Dell Server | Rack 04 | Delivered
row: Fiber Cables | Storage | ~Missing~ Ordered

section: Team Tasks
- Set up the environment.
- Configure the firewall.
- task: Update README | owner: Sarah | due: Monday
task: Database migration | owner: Ahmed | due: Sunday
done: Secure the domain name | time: 09:00 AM

section: Security Questions
question: Who has the _Master Key_ for the server room?
note: Surveillance footage is saved at \`\`\`/logs/cam1\`\`\`.

section: Setup Script
code:
#!/bin/bash
apt-get update && apt-get install -y nginx
end:

divider: End of Technical Sections

link: *Full Documentation* | to: https://dalil.ai/docs | title: Dalil Docs
image: *Launch Banner* | at: assets/banner.png | caption: Project Dalil launch artwork`;

    const result = parseIntentText(input);

    expect(result.blocks.length).toBeGreaterThan(6);
    expect(result.metadata?.title).toBe("Project Dalil Launch Plan");
    expect(result.metadata?.summary).toBe(
      "Finalizing the deployment for the AI-Agent hub in Doha.",
    );

    // Canonical table grouping: headers + rows become a single table block.
    const tableBlock =
      result.blocks.find((b) => b.type === "table") ||
      result.blocks
        .flatMap((b) => b.children || [])
        .find((b) => b.type === "table");
    expect(tableBlock?.table?.rows.length).toBeGreaterThan(0);

    // Check specific blocks
    const titleBlock = result.blocks.find((b) => b.type === "title");
    expect(titleBlock?.inline?.some((n) => n.type === "bold")).toBe(true); // *Project Dalil*

    // Find task block (either top-level or nested in sections)
    let taskBlock = result.blocks.find(
      (b) => b.type === "task" && b.content === "Database migration",
    );

    // If not found at top level, search in section children
    if (!taskBlock) {
      for (const block of result.blocks) {
        if (block.children) {
          taskBlock = block.children.find(
            (child) =>
              child.type === "task" && child.content === "Database migration",
          );
          if (taskBlock) break;
        }
      }
    }

    expect(taskBlock?.properties?.owner).toBe("Ahmed");

    const doneBlock =
      result.blocks.find((b) => b.type === "done") ||
      result.blocks
        .flatMap((b) => b.children || [])
        .find((b) => b.type === "done");
    expect(doneBlock?.properties?.time).toBe("09:00 AM");

    const codeBlock =
      result.blocks.find((b) => b.type === "code") ||
      result.blocks
        .flatMap((b) => b.children || [])
        .find((b) => b.type === "code");
    expect(codeBlock?.content).toContain("#!/bin/bash");
  });

  it("should parse inline code using triple backticks", () => {
    const input = "note: Path is ```/tmp/file```.";
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("note");
    expect(result.blocks[0].content).toBe("Path is /tmp/file.");
    expect(result.blocks[0].inline?.some((n) => n.type === "code")).toBe(true);
  });

  it("should parse list task shorthand with embedded task metadata", () => {
    const input = "- task: Update README | owner: Sarah | due: Monday";
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("list-item");
    expect(result.blocks[0].content).toBe("Update README");
    expect(result.blocks[0].properties).toEqual({
      owner: "Sarah",
      due: "Monday",
    });
    expect(result.blocks[0].children).toHaveLength(1);
    expect(result.blocks[0].children?.[0].type).toBe("task");
  });

  it("should emit a diagnostic for stray end: lines", () => {
    const input = `title: Doc
end:`;
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.diagnostics?.some((d) => d.code === "UNEXPECTED_END")).toBe(
      true,
    );
  });

  it("should emit a diagnostic for unterminated code blocks and still return a code block", () => {
    const input = `code:
line 1
line 2`;
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("code");
    expect(result.blocks[0].content).toBe("line 1\nline 2");
    expect(
      result.diagnostics?.some((d) => d.code === "UNTERMINATED_CODE_BLOCK"),
    ).toBe(true);
  });

  it("should support escaped pipes in content without splitting metadata", () => {
    const input = "note: A \\| B | owner: John";
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("note");
    expect(result.blocks[0].content).toBe("A | B");
    expect(result.blocks[0].properties).toEqual({ owner: "John" });
  });

  it("should support escaped pipes inside property values", () => {
    const input = "task: Do thing | owner: Jo\\|hn";
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("task");
    expect(result.blocks[0].properties).toEqual({ owner: "Jo|hn" });
  });

  it("should emit INVALID_PROPERTY_SEGMENT diagnostics for invalid pipe segments", () => {
    const input = "task: Do thing | owner Ahmed";
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(
      result.diagnostics?.some((d) => d.code === "INVALID_PROPERTY_SEGMENT"),
    ).toBe(true);
    // Best-effort: segment becomes content continuation
    expect(result.blocks[0].content).toContain("owner Ahmed");
  });

  it("should emit table diagnostics for headers without rows and rows without headers", () => {
    const noRows = parseIntentText("headers: A | B");
    expect(
      noRows.diagnostics?.some((d) => d.code === "HEADERS_WITHOUT_ROWS"),
    ).toBe(true);

    const rowOnly = parseIntentText("row: A | B");
    expect(
      rowOnly.diagnostics?.some((d) => d.code === "ROW_WITHOUT_HEADERS"),
    ).toBe(true);
  });

  it("should support escaped backslashes", () => {
    const input = "note: C:\\\\Temp\\\\File";
    const result = parseIntentText(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content).toBe("C:\\Temp\\File");
  });

  it("should allow extensions to register keywords and override block parsing", () => {
    const ext: IntentExtension = {
      keywords: ["x-alert"],
      parseBlock: ({ keyword, content, line }) => {
        if (keyword !== "x-alert") return undefined;
        return {
          id: "ext",
          type: "note",
          content: `ALERT: ${content}`,
          properties: { line },
        };
      },
    };

    const result = parseIntentText("x-alert: Something happened", {
      extensions: [ext],
    });

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("note");
    expect(result.blocks[0].content).toBe("ALERT: Something happened");
  });

  it("should allow extensions to validate and emit diagnostics", () => {
    const ext: IntentExtension = {
      validate: () => [
        {
          severity: "warning",
          code: "EXTENSION_VALIDATION",
          message: "Test validation diagnostic",
          line: 1,
          column: 1,
        },
      ],
    };

    const result = parseIntentText("title: Doc", { extensions: [ext] });
    expect(
      result.diagnostics?.some((d) => d.code === "EXTENSION_VALIDATION"),
    ).toBe(true);
  });
});
