#!/usr/bin/env node

const { parseIntentText, renderHTML } = require('./packages/core/dist');
const fs = require('fs');
const path = require('path');

// Simple CLI for IntentText
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🚀 IntentText CLI Usage:

  node cli.js <file.it>              # Parse and show JSON
  node cli.js <file.it> --html       # Generate HTML output
  node cli.js <file.it> --output     # Save HTML to file
  
Examples:
  node cli.js examples/sample.it
  node cli.js examples/sample.it --html
  node cli.js examples/sample.it --output
`);
    return;
  }
  
  const inputFile = args[0];
  const outputHtml = args.includes('--html');
  const saveFile = args.includes('--output');
  
  try {
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ File not found: ${inputFile}`);
      process.exit(1);
    }
    
    const content = fs.readFileSync(inputFile, 'utf-8');
    const document = parseIntentText(content);
    
    if (outputHtml || saveFile) {
      const html = renderHTML(document);
      
      if (saveFile) {
        const outputFile = inputFile.replace('.it', '.html');
        fs.writeFileSync(outputFile, html);
        console.log(`✅ HTML saved to: ${outputFile}`);
      } else {
        console.log('🎨 HTML Output:');
        console.log(html);
      }
    } else {
      console.log('📊 Parsed JSON:');
      console.log(JSON.stringify(document, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
