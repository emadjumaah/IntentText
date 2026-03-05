# IntentText — Document Generation Engine

# Implementation Prompt for Claude Opus Code Agent

# Project: github.com/emadjumaah/IntentText

---

## MISSION

You are implementing a complete document generation engine on top of the existing IntentText parser.
The core concept: an IntentText `.it` file is a **template** with `{{placeholders}}`.
A separate JSON object is the **data**. The engine merges them and renders print-ready output.

This is the same parser, same format, same JSON output — extended with:

1. Three new blocks: `font:`, `page:`, `break:`
2. A template merge function: `mergeData(template, data)`
3. A print CSS layer in the renderer
4. A `renderPDF()` function in the public API
5. A set of built-in example templates

Everything must be backward compatible. Existing `.it` files must parse identically.

---

## PART 1 — NEW BLOCK TYPES

Add these three blocks to `packages/core/src/types.ts` and `parser.ts`.
They are document-header blocks — they declare document layout, not content.

### `font:` — Typography declaration

```
font: | family: Georgia | size: 12pt | leading: 1.6 | weight: normal
```

Properties:

- `family` — font family name (string). Default: `Georgia`
- `size` — base font size (string with unit: `pt`, `px`, `rem`). Default: `12pt`
- `leading` — line height multiplier (number). Default: `1.6`
- `weight` — `normal` | `bold`. Default: `normal`
- `heading` — heading font family if different from body (string). Optional.
- `mono` — monospace font for code blocks (string). Default: `monospace`

JSON output:

```json
{
  "type": "font",
  "properties": {
    "family": "Georgia",
    "size": "12pt",
    "leading": 1.6,
    "weight": "normal"
  }
}
```

### `page:` — Page layout declaration

```
page: | size: A4 | margins: 20mm | header: {{title}} | footer: {{page}} of {{pages}}
```

Properties:

- `size` — `A4` | `A5` | `Letter` | `Legal` | `custom`. Default: `A4`
- `margins` — single value (all sides) or `top:20mm right:15mm bottom:20mm left:25mm`. Default: `20mm`
- `header` — header text, supports `{{variables}}`. Optional.
- `footer` — footer text, supports `{{variables}}`. Optional.
- `columns` — `1` | `2` | `3`. Default: `1`
- `orientation` — `portrait` | `landscape`. Default: `portrait`
- `numbering` — `true` | `false`. Default: `false`

JSON output:

```json
{
  "type": "page",
  "properties": {
    "size": "A4",
    "margins": "20mm",
    "header": "{{title}}",
    "footer": "{{page}} of {{pages}}",
    "numbering": true
  }
}
```

### `break:` — Explicit page break

```
break:
```

No properties. Renders as `<div class="it-page-break"></div>` in HTML.
In print CSS: `page-break-after: always`.

---

## PART 2 — TEMPLATE MERGE ENGINE

Create a new file: `packages/core/src/merge.ts`

### Function: `mergeData(template, data)`

```typescript
export function mergeData(
  template: IntentDocument,
  data: Record<string, unknown>,
): IntentDocument;
```

Takes a parsed IntentDocument (already in JSON) and a flat or nested data object.
Returns a new IntentDocument with all `{{variable}}` references resolved.

**Resolution rules:**

1. Simple reference: `{{name}}` → looks up `data.name`
2. Nested reference: `{{client.name}}` → looks up `data.client.name` (dot notation, any depth)
3. Array index: `{{items.0.price}}` → looks up `data.items[0].price`
4. Missing key: leave `{{variable}}` as-is and add `"unresolved": true` to block properties — do NOT throw
5. Page variables: `{{page}}` and `{{pages}}` are runtime variables — leave them as-is for the renderer to inject
6. System variables: `{{timestamp}}`, `{{agent}}`, `{{date}}`, `{{year}}` — resolve these automatically:
   - `{{timestamp}}` → ISO datetime string
   - `{{date}}` → locale date string
   - `{{year}}` → current year
   - `{{agent}}` → value from `metadata.agent` if present

**Resolution scope:**

- Resolve in: `block.content`, all `block.properties` string values, `metadata` values
- Do NOT resolve in: `block.type`, `block.id`

**Implementation pattern:**

```typescript
function resolveString(str: string, data: Record<string, unknown>): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getByPath(data, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) return (current as unknown[])[Number(key)];
    return (current as Record<string, unknown>)[key];
  }, obj);
}
```

### Function: `parseAndMerge(source, data)`

Convenience function — parse an `.it` string and merge data in one call:

```typescript
export function parseAndMerge(
  source: string,
  data: Record<string, unknown>,
): IntentDocument {
  const template = parseIntentText(source);
  return mergeData(template, data);
}
```

---

## PART 3 — PRINT RENDERER

Update `packages/core/src/renderer.ts`.

Add a new export: `renderPrint(doc: IntentDocument): string`

This is separate from `renderHTML`. It produces HTML optimized for print/PDF:

- Includes `@media print` CSS
- Applies `font:` and `page:` block declarations
- Handles `break:` as real page breaks
- Injects page numbers via CSS counters
- No interactive elements (no checkboxes, no collapsibles)

### Print CSS to inject (include in the rendered HTML `<style>` tag):

```css
/* Page setup — overridden by page: block values */
@page {
  size: A4;
  margin: 20mm;
}

@media print {
  body {
    margin: 0;
  }
  .it-page-break {
    page-break-after: always;
  }
  .it-no-print {
    display: none;
  }
  a {
    text-decoration: none;
    color: inherit;
  }
}

/* Page counter */
@page {
  counter-increment: page;
}
.it-footer::after {
  content: counter(page);
}

/* Base print typography */
body.it-print {
  font-family: Georgia, serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #000;
  background: #fff;
}

/* Headings */
body.it-print h1 {
  font-size: 1.8em;
  margin-bottom: 0.3em;
}
body.it-print h2 {
  font-size: 1.3em;
  margin-top: 1.5em;
}
body.it-print h3 {
  font-size: 1.1em;
}

/* Paragraph rhythm */
body.it-print p {
  margin: 0 0 0.8em 0;
  orphans: 3;
  widows: 3;
}

/* Tables */
body.it-print table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
body.it-print th {
  border-bottom: 2px solid #000;
  padding: 4pt 8pt;
  text-align: left;
}
body.it-print td {
  border-bottom: 1px solid #ccc;
  padding: 4pt 8pt;
}

/* Sections — avoid breaking inside */
body.it-print section {
  page-break-inside: avoid;
}

/* Callouts */
body.it-print .it-callout {
  border-left: 3pt solid #000;
  padding-left: 10pt;
  margin: 1em 0;
}
body.it-print .it-quote {
  font-style: italic;
  margin: 1em 2em;
}

/* Keyword labels */
body.it-print code.it-keyword {
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.85em;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3pt;
  padding: 1pt 4pt;
}
```

### Dynamic CSS from `font:` and `page:` blocks:

When rendering, scan for `font:` and `page:` blocks and inject their values as CSS variables:

```typescript
function buildDynamicCSS(doc: IntentDocument): string {
  const fontBlock = doc.blocks.find((b) => b.type === "font");
  const pageBlock = doc.blocks.find((b) => b.type === "page");

  const fontFamily = fontBlock?.properties?.family || "Georgia, serif";
  const fontSize = fontBlock?.properties?.size || "12pt";
  const leading = fontBlock?.properties?.leading || 1.6;
  const pageSize = pageBlock?.properties?.size || "A4";
  const margins = pageBlock?.properties?.margins || "20mm";

  return `
    @page { size: ${pageSize}; margin: ${margins}; }
    body.it-print {
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${leading};
    }
  `;
}
```

---

## PART 4 — PUBLIC API UPDATES

Update `packages/core/src/index.ts` to export:

```typescript
// Existing
export { parseIntentText } from "./parser";
export { renderHTML } from "./renderer";

// New
export { renderPrint } from "./renderer";
export { mergeData, parseAndMerge } from "./merge";
export type { IntentDocument, IntentBlock, IntentBlockType } from "./types";
```

Update `packages/core/src/browser.ts` to include the new exports for browser use.

---

## PART 5 — CLI UPDATES

Update `cli.js` to support:

```bash
node cli.js template.it --data data.json           # merge and print to stdout
node cli.js template.it --data data.json --html    # merge and render HTML
node cli.js template.it --data data.json --print   # merge and render print HTML
node cli.js template.it --data data.json --pdf     # merge and save as PDF (uses puppeteer if available)
```

For `--pdf`: check if `puppeteer` is installed. If yes, use it. If not, print a helpful message:

```
PDF output requires puppeteer. Run: npm install puppeteer
Then retry: node cli.js template.it --data data.json --pdf
```

---

## PART 6 — EXAMPLE TEMPLATES

Create all of these in `examples/templates/`. Each template has:

1. A `.it` file (the template)
2. A `.data.json` file (sample data)
3. A brief comment block at the top explaining the use case

---

### Template 1: Invoice (`invoice.it`)

```
// IntentText Invoice Template
// Use case: Freelancer, agency, or business invoice
// Data fields: invoice, client, seller, items[], totals, payment

font: | family: Inter, Helvetica, sans-serif | size: 11pt | leading: 1.5
page: | size: A4 | margins: 20mm 25mm 25mm 25mm | footer: Invoice {{invoice.number}} · Page {{page}}

title: Invoice

---

note: **{{seller.name}}** | align: left
note: {{seller.address}}
note: {{seller.email}} · {{seller.phone}}
note: VAT: {{seller.vat}}

---

note: **Bill To**
note: {{client.name}}
note: {{client.address}}
note: {{client.email}}

---

| Invoice No    | Date               | Due Date             | Status             |
| {{invoice.number}} | {{invoice.date}} | {{invoice.dueDate}} | {{invoice.status}} |

---

section: Items

| Description              | Qty         | Unit Price              | Total              |
| {{items.0.description}}  | {{items.0.qty}} | {{items.0.unitPrice}} | {{items.0.total}} |
| {{items.1.description}}  | {{items.1.qty}} | {{items.1.unitPrice}} | {{items.1.total}} |
| {{items.2.description}}  | {{items.2.qty}} | {{items.2.unitPrice}} | {{items.2.total}} |

---

note: Subtotal: {{totals.subtotal}} | align: right
note: Tax ({{totals.taxRate}}%): {{totals.tax}} | align: right
note: **Total Due: {{totals.due}} {{totals.currency}}** | align: right

---

section: Payment Details

note: Bank: {{payment.bank}}
note: Account: {{payment.account}}
note: IBAN: {{payment.iban}}
note: Reference: {{invoice.number}}

info: Payment due by {{invoice.dueDate}}. Late payments subject to {{invoice.lateRate}}% monthly interest.

note: Thank you for your business. | align: center
```

**Sample data (`invoice.data.json`):**

```json
{
  "invoice": {
    "number": "INV-2026-0042",
    "date": "2026-03-05",
    "dueDate": "2026-03-20",
    "status": "Unpaid",
    "lateRate": "1.5"
  },
  "seller": {
    "name": "Dalil Technology LLC",
    "address": "West Bay, Doha, Qatar",
    "email": "billing@dalil.ai",
    "phone": "+974 4000 0000",
    "vat": "VAT-300123456700003"
  },
  "client": {
    "name": "Acme Corporation",
    "address": "Pearl Boulevard, Doha, Qatar",
    "email": "ap@acme.com"
  },
  "items": [
    {
      "description": "Platform Development — March",
      "qty": "1",
      "unitPrice": "12,000 QAR",
      "total": "12,000 QAR"
    },
    {
      "description": "UX Design Services",
      "qty": "8 hrs",
      "unitPrice": "450 QAR",
      "total": "3,600 QAR"
    },
    {
      "description": "Hosting & Infrastructure",
      "qty": "1 month",
      "unitPrice": "900 QAR",
      "total": "900 QAR"
    }
  ],
  "totals": {
    "subtotal": "16,500 QAR",
    "taxRate": "5",
    "tax": "825 QAR",
    "due": "17,325 QAR",
    "currency": "QAR"
  },
  "payment": {
    "bank": "Qatar National Bank",
    "account": "0123-456789-001",
    "iban": "QA57QNBA000000000123456789001"
  }
}
```

---

### Template 2: Purchase Order (`purchase-order.it`)

```
// IntentText Purchase Order Template
// Use case: ERP procurement, supplier orders

font: | family: Arial, sans-serif | size: 11pt | leading: 1.5
page: | size: A4 | margins: 20mm | header: PURCHASE ORDER — {{po.number}} | footer: Page {{page}}

title: Purchase Order

| PO Number      | Date        | Delivery By       | Priority        |
| {{po.number}}  | {{po.date}} | {{po.deliveryDate}} | {{po.priority}} |

---

note: **From (Buyer)**
note: {{buyer.company}}
note: {{buyer.department}}
note: {{buyer.address}}
note: Contact: {{buyer.contact}} · {{buyer.email}}

note: **To (Supplier)**
note: {{supplier.name}}
note: {{supplier.address}}
note: Contact: {{supplier.contact}} · {{supplier.email}}

---

section: Ordered Items

| # | Item Description              | Part No          | Qty           | Unit          | Unit Price              | Total              |
| 1 | {{items.0.description}}       | {{items.0.partNo}} | {{items.0.qty}} | {{items.0.unit}} | {{items.0.unitPrice}} | {{items.0.total}} |
| 2 | {{items.1.description}}       | {{items.1.partNo}} | {{items.1.qty}} | {{items.1.unit}} | {{items.1.unitPrice}} | {{items.1.total}} |
| 3 | {{items.2.description}}       | {{items.2.partNo}} | {{items.2.qty}} | {{items.2.unit}} | {{items.2.unitPrice}} | {{items.2.total}} |

---

note: Subtotal: {{totals.subtotal}} | align: right
note: Shipping: {{totals.shipping}} | align: right
note: **Order Total: {{totals.grand}} {{totals.currency}}** | align: right

---

section: Terms & Conditions

note: Delivery Terms: {{po.deliveryTerms}}
note: Payment Terms: {{po.paymentTerms}}
note: Ship To: {{po.shipTo}}

warning: This PO is subject to the terms agreed in Contract {{po.contractRef}}. All deliveries must include this PO number.

---

section: Authorisation

| Prepared By        | Approved By          | Date            |
| {{auth.preparedBy}} | {{auth.approvedBy}} | {{auth.date}}   |

note: Authorised Signature: _________________________ | align: right
```

---

### Template 3: Contract / Legal Document (`contract.it`)

```
// IntentText Contract Template
// Use case: Service agreements, NDAs, court filings, legal correspondence

font: | family: Times New Roman, serif | size: 12pt | leading: 1.8
page: | size: A4 | margins: 25mm 30mm 25mm 30mm | footer: {{contract.ref}} · Page {{page}} of {{pages}} | numbering: true

title: {{contract.title}}

note: This agreement ("Agreement") is entered into as of **{{contract.date}}** between:
note: **{{party1.name}}**, {{party1.type}}, registered at {{party1.address}} ("Party A"); and
note: **{{party2.name}}**, {{party2.type}}, registered at {{party2.address}} ("Party B").

---

section: 1. Scope of Services

note: {{sections.scope}}

section: 2. Term

note: This Agreement commences on **{{contract.startDate}}** and continues until **{{contract.endDate}}**, unless terminated earlier in accordance with Section 8.

section: 3. Compensation

note: Party B shall pay Party A the sum of **{{contract.fee}}** {{contract.currency}}, payable {{contract.paymentSchedule}}.

section: 4. Confidentiality

note: Both parties agree to maintain strict confidentiality regarding all proprietary information exchanged during the term of this Agreement and for a period of {{contract.confidentialityPeriod}} thereafter.

section: 5. Intellectual Property

note: {{sections.ip}}

section: 6. Limitation of Liability

note: Neither party shall be liable for indirect, incidental, or consequential damages. Total liability shall not exceed {{contract.liabilityCap}} {{contract.currency}}.

section: 7. Governing Law

note: This Agreement shall be governed by the laws of **{{contract.jurisdiction}}**.

section: 8. Termination

note: Either party may terminate this Agreement with **{{contract.noticePeriod}}** written notice. Termination for cause may be immediate upon written notice.

section: 9. Entire Agreement

note: This Agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, and agreements.

---

break:

section: Signatures

note: IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

| Party A                          | Party B                          |
| **{{party1.name}}**              | **{{party2.name}}**              |
| Signature: _____________________ | Signature: _____________________ |
| Name: {{party1.signatory}}       | Name: {{party2.signatory}}       |
| Title: {{party1.title}}          | Title: {{party2.title}}          |
| Date: {{contract.date}}          | Date: {{contract.date}}          |
```

---

### Template 4: Book Chapter (`book-chapter.it`)

```
// IntentText Book Chapter Template
// Use case: Non-fiction book, memoir, journalism long-form

font: | family: Palatino Linotype, Palatino, serif | size: 12pt | leading: 1.8 | heading: Helvetica Neue, Arial, sans-serif
page: | size: A5 | margins: 20mm 18mm 25mm 22mm | header: {{book.title}} | footer: {{page}}

note: {{chapter.number}} | align: center

title: {{chapter.title}}

note: _{{chapter.epigraph}}_ | align: center
note: — {{chapter.epigraphAuthor}} | align: center

---

note: {{chapter.openingParagraph}} | align: justify

note: {{chapter.body1}} | align: justify

note: {{chapter.body2}} | align: justify

sub: {{chapter.subheading1}}

note: {{chapter.body3}} | align: justify

note: {{chapter.body4}} | align: justify

sub: {{chapter.subheading2}}

note: {{chapter.body5}} | align: justify

quote: {{chapter.pullquote}} | by: {{chapter.pullquoteSource}}

note: {{chapter.body6}} | align: justify

note: {{chapter.closingParagraph}} | align: justify

---

note: ✦ ✦ ✦ | align: center
```

---

### Template 5: Meeting Minutes (`meeting-minutes.it`)

```
// IntentText Meeting Minutes Template
// Use case: Board meetings, project meetings, official records

font: | family: Arial, Helvetica, sans-serif | size: 11pt | leading: 1.5
page: | size: A4 | margins: 25mm | header: {{meeting.organisation}} — MEETING MINUTES | footer: Page {{page}}

title: Minutes of {{meeting.type}}

| Date            | Time            | Location            | Chaired By       |
| {{meeting.date}} | {{meeting.time}} | {{meeting.location}} | {{meeting.chair}} |

section: Attendees

note: **Present:** {{meeting.attendees}}
note: **Apologies:** {{meeting.apologies}}
note: **In Attendance:** {{meeting.inAttendance}}

section: 1. Opening

note: The {{meeting.chair}} called the meeting to order at {{meeting.startTime}} and confirmed quorum.

section: 2. Approval of Previous Minutes

note: The minutes of the previous meeting held on {{meeting.previousMeetingDate}} were reviewed.
task: Approve previous minutes | owner: {{meeting.chair}} | status: {{meeting.previousMinutesStatus}}

section: 3. Matters Arising

note: {{meeting.mattersArising}}

section: 4. Agenda Items

sub: 4.1 {{agenda.item1.title}}
note: {{agenda.item1.discussion}}
task: {{agenda.item1.action}} | owner: {{agenda.item1.owner}} | due: {{agenda.item1.due}}

sub: 4.2 {{agenda.item2.title}}
note: {{agenda.item2.discussion}}
task: {{agenda.item2.action}} | owner: {{agenda.item2.owner}} | due: {{agenda.item2.due}}

sub: 4.3 {{agenda.item3.title}}
note: {{agenda.item3.discussion}}
task: {{agenda.item3.action}} | owner: {{agenda.item3.owner}} | due: {{agenda.item3.due}}

section: 5. Action Items Summary

| Action                        | Owner                   | Due Date              | Status           |
| {{agenda.item1.action}}       | {{agenda.item1.owner}}  | {{agenda.item1.due}}  | Pending          |
| {{agenda.item2.action}}       | {{agenda.item2.owner}}  | {{agenda.item2.due}}  | Pending          |
| {{agenda.item3.action}}       | {{agenda.item3.owner}}  | {{agenda.item3.due}}  | Pending          |

section: 6. Next Meeting

note: The next meeting is scheduled for **{{meeting.nextMeetingDate}}** at {{meeting.nextMeetingTime}}, {{meeting.nextMeetingLocation}}.

section: 7. Closure

note: There being no further business, the {{meeting.chair}} closed the meeting at {{meeting.endTime}}.

---

note: Minutes prepared by: {{meeting.secretary}}
note: Date prepared: {{date}}
note: These minutes are subject to confirmation at the next meeting.

| Signed (Chair)                    | Date            |
| _________________________________ | {{meeting.date}} |
```

---

### Template 6: General Purpose Report (`report.it`)

```
// IntentText General Report Template
// Use case: Business reports, research summaries, project status

font: | family: Georgia, serif | size: 12pt | leading: 1.6 | heading: Arial, sans-serif
page: | size: A4 | margins: 25mm | header: {{report.organisation}} | footer: {{report.title}} · Page {{page}}

title: {{report.title}}

note: **Prepared by:** {{report.author}} · **Date:** {{report.date}} · **Version:** {{report.version}}

summary: {{report.executiveSummary}}

---

section: 1. Introduction

note: {{report.introduction}}

section: 2. Background

note: {{report.background}}

section: 3. Findings

sub: 3.1 {{report.finding1.title}}
note: {{report.finding1.body}}

sub: 3.2 {{report.finding2.title}}
note: {{report.finding2.body}}

sub: 3.3 {{report.finding3.title}}
note: {{report.finding3.body}}

section: 4. Analysis

note: {{report.analysis}}

quote: {{report.keyQuote}} | by: {{report.keyQuoteSource}}

section: 5. Recommendations

task: {{report.rec1}} | priority: high
task: {{report.rec2}} | priority: medium
task: {{report.rec3}} | priority: medium
task: {{report.rec4}} | priority: low

section: 6. Conclusion

note: {{report.conclusion}}

---

section: Appendix

note: {{report.appendixTitle}}
note: {{report.appendixContent}}
```

---

## PART 7 — TESTS

Create `packages/core/tests/document-generation.test.ts`

Cover:

- `mergeData()` resolves simple `{{key}}` references
- `mergeData()` resolves nested `{{client.name}}` dot notation
- `mergeData()` resolves array index `{{items.0.price}}`
- `mergeData()` leaves unresolved `{{missing}}` as-is and sets `unresolved: true`
- `mergeData()` resolves `{{timestamp}}`, `{{date}}`, `{{year}}` automatically
- `mergeData()` does NOT resolve `{{page}}` and `{{pages}}` (runtime variables)
- `parseAndMerge()` parses source string and merges data in one call
- `font:` block parses to correct JSON shape
- `page:` block parses to correct JSON shape with all properties
- `break:` block parses to `{ type: "break" }` with no properties
- `renderPrint()` includes `@media print` CSS in output
- `renderPrint()` applies `font:` block values as CSS
- `renderPrint()` applies `page:` block values as CSS
- `renderPrint()` renders `break:` as `<div class="it-page-break">`
- Full invoice template: parse + merge + render produces valid HTML
- Backward compatibility: existing v2 documents parse identically

Target: 25+ new tests. All existing 255 tests must still pass.

---

## PART 8 — DOCUMENTATION

Create `docs/TEMPLATES.md` with:

1. Overview of the template system
2. How `{{variables}}` work (simple, nested, array)
3. The three new blocks: `font:`, `page:`, `break:`
4. The merge API: `mergeData()`, `parseAndMerge()`
5. The print API: `renderPrint()`
6. CLI usage for template rendering
7. Database storage pattern — how to store templates and data as JSON
8. Links to all example templates in `examples/templates/`

---

## PART 9 — VERSION BUMP

- Bump `packages/core/package.json` version to `2.1.0`
- Update `CHANGELOG.md` with v2.1.0 entry covering all new features
- Update `docs/SPEC.md` with the new block types and template system section

---

## IMPLEMENTATION ORDER

1. `types.ts` — add `font`, `page`, `break` block types and properties
2. `parser.ts` — add parsing for the three new blocks
3. `merge.ts` — implement `mergeData()` and `parseAndMerge()`
4. `renderer.ts` — add `renderPrint()` with print CSS layer
5. `index.ts` + `browser.ts` — export new functions
6. `cli.js` — add `--data`, `--print`, `--pdf` flags
7. `examples/templates/` — create all six template files with data files
8. Tests — write `document-generation.test.ts`
9. `docs/TEMPLATES.md` — write documentation
10. Version bump + CHANGELOG

---

## CONSTRAINTS

- No new npm dependencies except optional `puppeteer` for PDF (checked at runtime, never required)
- All existing behavior unchanged — full backward compatibility
- TypeScript strict mode — no `any` types without comment
- `mergeData()` must be pure — it returns a new document, never mutates the input
- The print CSS must work without JavaScript — pure CSS page breaks and counters
- All six example templates must produce valid, useful output with their sample data files

---

## VERIFICATION

After implementation, run:

```bash
# All tests pass
npm test

# Invoice template renders correctly
node cli.js examples/templates/invoice.it --data examples/templates/invoice.data.json --html > /tmp/invoice.html

# Book chapter template renders correctly
node cli.js examples/templates/book-chapter.it --data examples/templates/book-chapter.data.json --print > /tmp/chapter.html

# Contract renders with page break
node cli.js examples/templates/contract.it --data examples/templates/contract.data.json --print > /tmp/contract.html

# Confirm version
node -e "const {parseIntentText} = require('./packages/core/dist'); const d = parseIntentText('title: test'); console.log(d.version);"
// Expected: "2.0" (document version stays — parser version is in package.json)
```

---

## THE BIG PICTURE (context for the agent)

IntentText v2.1 now serves two audiences with one format:

**Developers & AI agents** — use the agentic workflow blocks (`step:`, `decision:`, `gate:`, `call:`, etc.) to define executable plans that agents can run deterministically.

**Writers, businesses & ERP systems** — use the document generation engine to create templates stored as JSON in a database, merge with data at runtime, and render print-ready output. No Word. No Google Docs. No LaTeX. No binary files. Everything queryable, versionable, and portable.

Same parser. Same format. Same JSON. Two powerful use cases.

_IntentText v2.1 Implementation Prompt — March 2026_
