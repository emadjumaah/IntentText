## Assessment of IntentText (.it) – Syntax, Tooling, and Potential Improvements

IntentText is a thoughtfully designed semantic document language that bridges human readability and machine‑parsable structure. Its core idea—replacing visual markup with meaningful keywords and inline metadata—is well suited for the “agentic age” where documents need to be understood by both people and AI.

Below I evaluate the current state of the project, highlight its strengths, and suggest areas where the syntax and tooling could be refined or extended.

---

### ✅ Strengths

#### 1. **Clean, Intuitive Syntax**

- Keywords like `title:`, `task:`, `quote:` are instantly understandable.

- WhatsApp‑style inline formatting (`*bold*`, `_italic_`) feels natural and avoids heavy punctuation.

- The pipe syntax for metadata (`| owner: John | due: Friday`) is compact and visually distinct from content.

- Tables using Markdown‑style pipe rows are familiar and easy to write.

#### 2. **Rich Semantic Output**

- Parsing produces typed JSON blocks with `id`, `type`, `content`, `originalContent`, and parsed inline formatting.

- Metadata properties are cleanly separated, making it trivial to filter blocks (e.g., all tasks with an owner).

- The HTML renderer adds immediate practical value—documents become usable without extra tooling.

#### 3. **Comprehensive Tooling**

- **Parser library** (TypeScript) with 143 passing tests—solid foundation.

- **CLI** for quick conversion to JSON/HTML.

- **Browser bundle** and interactive live editor (`preview.html`) lower the barrier for experimentation.

- **VS Code extension** (syntax highlighting and preview) integrates into existing workflows.

- Clear separation of core, renderer, and browser entry points encourages modular use.

#### 4. **Well‑Documented**

- README provides a complete quick start, syntax reference, and project structure.

- Dedicated spec document (`docs/SPEC.md`) (mentioned) suggests attention to detail.

- Examples and demo scripts help new users understand the language.

#### 5. **Extensibility in Mind**

- The parser is designed around a block‑oriented model—adding new block types or metadata properties would be straightforward.

- The `renderHTML` function can be extended or replaced for custom output formats.

---

### 🔍 Potential Areas for Improvement

While IntentText is already polished, a few aspects could be refined to avoid ambiguity and improve robustness.

#### 1. **Ambiguity in Content vs. Metadata**

- In blocks like `task: Write docs | owner: John`, the pipe separates content from metadata.
  **Question:** What if the content itself contains a pipe character (e.g., `task: Install library | request | owner: John`)?
  There is no defined escaping mechanism. A common approach is to allow backslash escaping (`\|`) or require a different delimiter. Without it, parsing may break.

#### 2. **Inconsistent Table Syntax**

- Two table formats are supported:
  - Markdown‑style pipe tables (preferred)

  - Keyword‑based `headers:` / `row:`
    Supporting both is flexible but adds complexity. The keyword form is less intuitive and may confuse users. Consider deprecating one in favour of the pipe syntax, which is already widely known.

#### 3. **Multiline Content Handling**

- The `code:` block uses an explicit `end:` marker. Other block types (e.g., `note:`) are implicitly single‑line unless you allow line breaks inside the content.
  **Clarity needed:** Can `note:` span multiple lines? If so, how is the end of the content determined? The current examples show single‑line usage, but real documents often need paragraphs. A consistent multiline rule (e.g., indentation or an explicit terminator) would improve predictability.

#### 4. **Inline Formatting Overlap with Keywords**

- Inline formatting uses `*` for bold and `_` for italic. These characters could appear in URLs or code snippets.
  The parser likely handles this (code blocks skip formatting), but the spec should explicitly state precedence and escaping rules.

#### 5. **Property Value Parsing**

- Properties like `due: Friday` are simple strings, but could they contain spaces or special characters?
  For example: `due: next Friday` – the pipe delimiter would end at the next pipe, so spaces are fine. But what if the value contains a pipe? Again, escaping is needed.
  Additionally, properties are currently flat key‑value pairs; nested structures are not possible. For complex metadata, this might be limiting.

#### 6. **Document‑Level Metadata Extraction**

- The README shows that `title:` and `summary:` blocks contribute to a top‑level `metadata` object in the JSON.
  **Consistency:** Are all `title:` blocks merged? What if multiple `title:` appear? The spec should define how document metadata is aggregated (first occurrence, last, or all?).

#### 7. **Language Direction (`ltr`/`rtl`)**

- `language: ltr` is mentioned as part of metadata, but how is it set? Is it auto‑detected from content, or does the user need to include a block? If the latter, a block like `dir: rtl` would be more explicit. The current example shows it as derived metadata—clarify the rule.

#### 8. **Error Handling and Validation**

- The parser seems to be permissive (e.g., unknown keywords might be treated as plain text or notes?).
  A strict mode could help catch unintended typos (e.g., `tasK:` instead of `task:`).
  Providing meaningful error messages (line number, context) would aid debugging.

#### 9. **Comments**

- There is no mention of comments (lines ignored by the parser). A comment syntax (e.g., `//` or `#`) would be useful for annotating documents without affecting output.

#### 10. **Performance and Streaming**

- For very large `.it` files, parsing everything into memory might be heavy. A streaming parser that emits blocks as they are read could be a future enhancement.

---

### 💡 Suggestions for Enhancement

- **Add escaping rules:** Document that `\|` inside content or property values should be treated as a literal pipe.

- **Unify multiline blocks:** Consider adopting a consistent approach—either require indentation for continued lines (like YAML) or use an explicit terminator `---` (like the existing divider) for all block types.

- **Provide a JSON schema for validation:** Users could validate their `.it` files against a schema that defines allowed block types and property names.

- **Improve property parsing:** Allow quoted values to include delimiters, e.g., `| note: "value with | pipe"`.

- **Add a linter/formatting tool:** A command to pretty‑print `.it` files with consistent spacing and indentation would be valuable.

- **Consider YAML frontmatter for document metadata:** Instead of relying on `title:` and `summary:` blocks, a YAML block at the top (between `---` lines) could hold global metadata, while still allowing inline `title:` blocks for section titles. This would separate document‑level metadata from content blocks.

---

### 🧪 Overall Verdict

IntentText is a mature and well‑executed project that successfully meets its goal of being a semantic document language. The syntax is elegant, the tooling is comprehensive, and the test coverage inspires confidence. With minor refinements around escaping, multiline content, and property parsing, it could become even more robust. The existing ecosystem (VS Code extension, CLI, browser live editor) makes it immediately useful.

I would confidently recommend IntentText for teams needing human‑readable, machine‑parsable documentation, task lists, or any structured content that benefits from a lightweight markup language. The foundation is solid, and the suggested improvements are incremental polish rather than fundamental redesigns.
