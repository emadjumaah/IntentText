import { describe, it, expect } from "vitest";
import { parseIntentText, renderHTML } from "../src";

describe("HTML Renderer", () => {
  it("should render a simple document", () => {
    const input = "title: My Document";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('<h1 class="intent-title"');
    expect(html).toContain("My Document");
    expect(html).toContain("intent-document");
  });

  it("should render inline formatting", () => {
    const input = "title: *Bold* and _italic_ text";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("should render tasks with metadata", () => {
    const input = "task: Database migration | owner: Ahmed | due: Sunday";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('class="intent-task"');
    expect(html).toContain('class="intent-task-checkbox"');
    expect(html).toContain("Database migration");
    expect(html).toContain("Ahmed");
    expect(html).toContain("Sunday");
  });

  it("should render completed tasks", () => {
    const input = "done: Secure the domain name | time: 09:00 AM";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('class="intent-task intent-task-done"');
    expect(html).toContain('type="checkbox" checked');
    expect(html).toContain("intent-task-text-done");
    expect(html).toContain("09:00 AM");
  });

  it("should render tables", () => {
    const input = `headers: Name | Age | City
row: Ahmed | 30 | Dubai`;

    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain("<table");
    expect(html).toContain("<thead>");
    expect(html).toContain("Name</th>"); // Look for the content, not the exact tag
    expect(html).toContain("<tbody>");
    expect(html).toContain("Ahmed</td>"); // Look for the content, not the exact tag
  });

  it("should render code blocks", () => {
    const input = 'code: console.log("Hello")';
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('<pre class="intent-code"');
    expect(html).toContain("<code>console.log(&quot;Hello&quot;)</code>");
  });

  it("should render questions", () => {
    const input = "question: Who has the key?";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain("Question:");
    expect(html).toContain('class="intent-question"');
  });

  it("should render images with captions", () => {
    const input = "image: Logo | at: logo.png | caption: Company Logo";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('src="logo.png"');
    expect(html).toContain('alt="Logo"');
    expect(html).toContain("Company Logo");
  });

  it("should render links", () => {
    const input = "link: Documentation | to: https://docs.com";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('<a href="https://docs.com"');
    expect(html).toContain("Documentation");
  });

  it("should handle RTL documents", () => {
    const input = "title: مرحبا بالعالم";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('dir="rtl"');
  });

  it("should escape HTML to prevent script injection", () => {
    const input = "note: <script>alert('xss')</script>";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("should sanitize unsafe link schemes", () => {
    const input = "link: Click me | to: javascript:alert(1)";
    const parsed = parseIntentText(input);
    const html = renderHTML(parsed);

    expect(html).toContain('href="#"');
  });
});
