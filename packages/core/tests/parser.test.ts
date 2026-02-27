import { describe, it, expect } from "vitest";
import { parseIntentText } from "../src/parser";

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
    expect(result.blocks[0].marks).toHaveLength(2);
    expect(result.blocks[0].marks![0].type).toBe("bold");
    expect(result.blocks[0].marks![1].type).toBe("italic");
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

    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0].type).toBe("headers");
    expect(result.blocks[0].content).toBe("Name | Age | City");
    expect(result.blocks[1].type).toBe("row");
    expect(result.blocks[1].content).toBe("Ahmed | 30 | Dubai");
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
note: Surveillance footage is saved at \`/logs/cam1\`.

section: Setup Script
code:
#!/bin/bash
apt-get update && apt-get install -y nginx
end:

divider: End of Technical Sections

link: *Full Documentation* | to: https://dalil.ai/docs | title: Dalil Docs
image: *Launch Banner* | at: assets/banner.png | caption: Project Dalil launch artwork`;

    const result = parseIntentText(input);

    expect(result.blocks.length).toBeGreaterThan(10);
    expect(result.metadata?.title).toBe("Project Dalil Launch Plan");
    expect(result.metadata?.summary).toBe(
      "Finalizing the deployment for the AI-Agent hub in Doha.",
    );

    // Check specific blocks
    const titleBlock = result.blocks.find((b) => b.type === "title");
    expect(titleBlock?.marks).toHaveLength(1); // *Project Dalil*

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
});
