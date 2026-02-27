#!/usr/bin/env node

const {
  parseIntentText,
  renderHTML,
  convertMarkdownToIntentText,
  queryBlocks,
  formatQueryResult,
  validateDocument,
  formatValidationResult,
  PREDEFINED_SCHEMAS,
  buildStaticSite,
  formatExportResult,
} = require("./packages/core/dist");
const fs = require("fs");
const path = require("path");

// Simple CLI for IntentText
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🚀 IntentText CLI Usage:

  node cli.js <file.it>                    # Parse and show JSON
  node cli.js <file.it> --html             # Generate HTML output
  node cli.js <file.it> --output           # Save HTML to file
  node cli.js <file.md> --to-it            # Convert Markdown to .it
  node cli.js <file.md> --to-it --output   # Save .it next to .md
  node cli.js <file.it> --query "query"    # Query blocks (v1.2)
  node cli.js <file.it> --validate <schema> # Validate against schema (v1.2)
  node cli.js --build <dir>                # Build static site (v1.2)

Query Examples:
  node cli.js todo.it --query "type=task owner=Ahmed"
  node cli.js project.it --query "type=task due<2026-03-01 sort:due:asc limit:10"

Validation Examples:
  node cli.js project.it --validate project
  node cli.js article.it --validate article

Build Examples:
  node cli.js --build ./docs --out ./dist
  node cli.js --build ./docs --theme docs

Available schemas: ${Object.keys(PREDEFINED_SCHEMAS).join(", ")}

Examples:
  node cli.js examples/sample.it
  node cli.js examples/sample.it --html
  node cli.js examples/sample.it --output
  node cli.js README.md --to-it
`);
    return;
  }

  const inputFile = args[0];
  const outputHtml = args.includes("--html");
  const saveFile = args.includes("--output");
  const toIt = args.includes("--to-it");
  const queryIndex = args.indexOf("--query");
  const queryString = queryIndex >= 0 ? args[queryIndex + 1] : null;
  const validateIndex = args.indexOf("--validate");
  const schemaName = validateIndex >= 0 ? args[validateIndex + 1] : null;
  const buildIndex = args.indexOf("--build");
  const buildDir = buildIndex >= 0 ? args[buildIndex + 1] : null;
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "./dist";
  const theme = args.includes("--theme")
    ? args[args.indexOf("--theme") + 1]
    : "default";

  try {
    // Build mode (v1.2)
    if (buildDir) {
      if (!fs.existsSync(buildDir)) {
        console.error(`❌ Directory not found: ${buildDir}`);
        process.exit(1);
      }
      const result = buildStaticSite({
        inputDir: buildDir,
        outputDir: outDir,
        theme,
      });
      console.log(formatExportResult(result));
      process.exit(result.errors.length > 0 ? 1 : 0);
    }

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ File not found: ${inputFile}`);
      process.exit(1);
    }

    const content = fs.readFileSync(inputFile, "utf-8");

    if (toIt) {
      const converted = convertMarkdownToIntentText(content);
      if (saveFile) {
        const outputFile = inputFile.replace(/\.md$/i, ".it");
        fs.writeFileSync(outputFile, converted);
        console.log(`✅ IntentText saved to: ${outputFile}`);
      } else {
        console.log(converted);
      }
      return;
    }

    const document = parseIntentText(content);

    // Query mode (v1.2)
    if (queryString) {
      const result = queryBlocks(document, queryString);
      console.log(formatQueryResult(result, "table"));
      return;
    }

    // Validation mode (v1.2)
    if (schemaName) {
      const result = validateDocument(document, schemaName);
      console.log(formatValidationResult(result));
      process.exit(result.valid ? 0 : 1);
    }

    if (outputHtml || saveFile) {
      const html = renderHTML(document);

      if (saveFile) {
        const outputFile = inputFile.replace(".it", ".html");
        fs.writeFileSync(outputFile, html);
        console.log(`✅ HTML saved to: ${outputFile}`);
      } else {
        console.log("🎨 HTML Output:");
        console.log(html);
      }
    } else {
      console.log("📊 Parsed JSON:");
      console.log(JSON.stringify(document, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
