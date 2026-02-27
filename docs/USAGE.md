# IntentText v1.0 - Usage Guide

This guide covers how to use the IntentText parser and renderer in different scenarios.

## 📦 Installation

### From Source
```bash
git clone https://github.com/your-username/intenttext.git
cd intenttext
npm install
npm run build
```

### As npm Package (when published)
```bash
npm install @intenttext/core
```

## 🚀 Basic Usage

### 1. Parse IntentText Content

```javascript
const { parseIntentText } = require('@intenttext/core');

const content = `title: My Document
section: Tasks
task: Write documentation | owner: John | due: Friday`;

const document = parseIntentText(content);
console.log(JSON.stringify(document, null, 2));
```

### 2. Render to HTML

```javascript
const { parseIntentText, renderHTML } = require('@intenttext/core');

const content = `title: My Document
task: Complete this | owner: Me`;

const document = parseIntentText(content);
const html = renderHTML(document);

console.log(html);
// <div class="intent-document">...</div>
```

## 🛠️ Command Line Tools

### CLI Usage

```bash
# Parse to JSON
node cli.js document.it

# Generate HTML output
node cli.js document.it --html

# Save HTML to file
node cli.js document.it --output

# Help
node cli.js
```

### npm Scripts

```bash
# Run demo with examples
npm run demo

# Interactive preview
npm run preview

# Parse sample files
npm run parse:html
npm run parse:output
```

## 🌐 Browser Usage

### Direct Inclusion

```html
<!DOCTYPE html>
<html>
<head>
    <title>IntentText Demo</title>
</head>
<body>
    <div id="output"></div>
    
    <script src="path/to/@intenttext/core/dist/index.js"></script>
    <script>
        const { parseIntentText, renderHTML } = IntentText;
        
        const content = `title: *My Document*
section: Demo
task: Parse this | owner: Browser`;
        
        const document = parseIntentText(content);
        const html = renderHTML(document);
        
        document.getElementById('output').innerHTML = html;
    </script>
</body>
</html>
```

### Module Bundlers

```javascript
// ES6 modules
import { parseIntentText, renderHTML } from '@intenttext/core';

// CommonJS
const { parseIntentText, renderHTML } = require('@intenttext/core');
```

## 📚 API Reference

### parseIntentText(content: string): IntentDocument

Parses IntentText content into structured JSON.

**Parameters:**
- `content` - Raw IntentText string

**Returns:** `IntentDocument` object

**Example:**
```javascript
const document = parseIntentText('title: My Doc');
console.log(document.blocks[0].type); // 'title'
console.log(document.metadata?.title); // 'My Doc'
```

### renderHTML(document: IntentDocument): string

Renders parsed IntentDocument to HTML string.

**Parameters:**
- `document` - Parsed IntentDocument object

**Returns:** HTML string

**Example:**
```javascript
const html = renderHTML(document);
document.body.innerHTML = html;
```

## 🎯 Working with Blocks

### Accessing Specific Block Types

```javascript
const document = parseIntentText(content);

// Get all tasks
const tasks = document.blocks.filter(b => b.type === 'task');

// Get all sections
const sections = document.blocks.filter(b => b.type === 'section');

// Get nested blocks
const sectionChildren = sections.flatMap(s => s.children || []);

// Find specific block
const specificTask = document.blocks.find(b => 
  b.type === 'task' && b.content.includes('urgent')
);
```

### Working with Properties

```javascript
const tasks = document.blocks.filter(b => b.type === 'task');

tasks.forEach(task => {
  console.log('Task:', task.content);
  console.log('Owner:', task.properties?.owner);
  console.log('Due:', task.properties?.due);
  console.log('Priority:', task.properties?.priority);
});
```

### Handling Inline Formatting

```javascript
const titleBlock = document.blocks.find(b => b.type === 'title');

if (titleBlock.marks) {
  titleBlock.marks.forEach(mark => {
    console.log(`${mark.type}: ${mark.start}-${mark.end}`);
    // bold: 0-12, italic: 20-25, etc.
  });
}
```

## 🔧 Advanced Usage

### Custom Rendering

```javascript
const { parseIntentText } = require('@intenttext/core');

function customRenderer(document) {
  return document.blocks.map(block => {
    switch (block.type) {
      case 'task':
        return `<task-item owner="${block.properties?.owner}">
          ${block.content}
        </task-item>`;
      case 'section':
        return `<section>${block.content}</section>`;
      default:
        return `<div>${block.content}</div>`;
    }
  }).join('\n');
}

const document = parseIntentText(content);
const customHTML = customRenderer(document);
```

### File Processing

```javascript
const fs = require('fs');
const { parseIntentText, renderHTML } = require('@intenttext/core');

// Process single file
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const document = parseIntentText(content);
  const html = renderHTML(document);
  
  const outputPath = filePath.replace('.it', '.html');
  fs.writeFileSync(outputPath, html);
  
  console.log(`✅ Processed: ${filePath} → ${outputPath}`);
}

// Process directory
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    if (file.endsWith('.it')) {
      processFile(`${dirPath}/${file}`);
    }
  });
}
```

### Integration with Web Servers

```javascript
// Express.js example
const express = require('express');
const { parseIntentText, renderHTML } = require('@intenttext/core');

const app = express();

app.post('/parse', (req, res) => {
  const { content } = req.body;
  
  try {
    const document = parseIntentText(content);
    const html = renderHTML(document);
    
    res.json({
      success: true,
      document,
      html
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('IntentText server running on port 3000');
});
```

## 🧪 Testing Your Integration

### Unit Tests

```javascript
const { parseIntentText } = require('@intenttext/core');

describe('My IntentText Integration', () => {
  test('should parse tasks correctly', () => {
    const content = 'task: Test task | owner: John';
    const document = parseIntentText(content);
    
    const task = document.blocks.find(b => b.type === 'task');
    expect(task.content).toBe('Test task');
    expect(task.properties.owner).toBe('John');
  });
  
  test('should handle inline formatting', () => {
    const content = 'title: *Bold Title*';
    const document = parseIntentText(content);
    
    const title = document.blocks.find(b => b.type === 'title');
    expect(title.marks).toHaveLength(1);
    expect(title.marks[0].type).toBe('bold');
  });
});
```

### Integration Tests

```javascript
const fs = require('fs');
const { parseIntentText, renderHTML } = require('@intenttext/core');

test('should process real .it file', () => {
  const content = fs.readFileSync('./test-document.it', 'utf-8');
  const document = parseIntentText(content);
  const html = renderHTML(document);
  
  expect(document.blocks.length).toBeGreaterThan(0);
  expect(html).toContain('<div class="intent-document"');
  expect(html).not.toContain('undefined');
});
```

## 🚨 Error Handling

### Common Errors

```javascript
const { parseIntentText } = require('@intenttext/core');

function safeParse(content) {
  try {
    return parseIntentText(content);
  } catch (error) {
    console.error('Parse error:', error.message);
    return {
      blocks: [],
      metadata: {},
      error: error.message
    };
  }
}

// Validate document
function validateDocument(document) {
  if (!document.blocks || document.blocks.length === 0) {
    throw new Error('No blocks found in document');
  }
  
  const hasTitle = document.blocks.some(b => b.type === 'title');
  if (!hasTitle) {
    console.warn('Warning: No title block found');
  }
  
  return document;
}
```

## 📊 Performance Tips

### Large Files

```javascript
// Process in chunks for very large files
function processLargeFile(filePath, chunkSize = 1000) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const chunks = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    chunks.push(parseIntentText(chunk));
  }
  
  return mergeDocuments(chunks);
}
```

### Caching

```javascript
const cache = new Map();

function cachedParse(content) {
  const hash = require('crypto').createHash('md5').update(content).digest('hex');
  
  if (cache.has(hash)) {
    return cache.get(hash);
  }
  
  const document = parseIntentText(content);
  cache.set(hash, document);
  return document;
}
```

## 🔗 Links

- [Specification](../info/SPEC.md)
- [API Reference](../packages/core/src/types.ts)
- [Examples](../examples/)
- [Tests](../packages/core/tests/)

---

Need more help? Check the [main README](../README.md) or open an issue on GitHub.
