// Example: How to use IntentText in your own projects
const { parseIntentText, renderHTML } = require('./packages/core/dist');
const fs = require('fs');

// Method 1: Parse string directly
const intentText = `title: My Document
section: Tasks
task: Write code | owner: Dev | due: Today`;

const document = parseIntentText(intentText);
console.log('JSON:', JSON.stringify(document, null, 2));

// Method 2: Parse from file
const fileContent = fs.readFileSync('your-file.it', 'utf-8');
const fileDoc = parseIntentText(fileContent);

// Method 3: Generate HTML for web display
const html = renderHTML(fileDoc);
fs.writeFileSync('output.html', html);

// Method 4: Access specific blocks
const tasks = fileDoc.blocks.filter(b => b.type === 'task');
const sections = fileDoc.blocks.filter(b => b.type === 'section');

console.log(`Found ${tasks.length} tasks and ${sections.length} sections`);
