# IntentText Ecosystem

## 🎯 Strategy Overview

**Goal:** Make IntentText v1.3 accessible and useful for both developers and end users.

---

## 📦 1. VSCode Extension (For Developers)

### Features
- **Syntax highlighting** for .it files
- **IntelliSense** for keywords and properties
- **Live preview** panel
- **Export to HTML** command
- **Query builder** for document search

### Quick Start
```bash
cd vscode-extension
npm install
npm run compile
code . --install-extension
```

### Structure
```
vscode-extension/
├── src/
│   └── extension.ts          # Main extension logic
├── syntaxes/
│   └── intenttext.tmLanguage.json  # TextMate grammar
├── snippets/
│   └── intenttext.json      # Code snippets
└── package.json
```

---

## 🖥️ 2. Desktop Editor (For End Users)

### Features
- **Split view**: Editor + Live preview
- **File management**: Open/save .it files
- **Export**: HTML, PDF, Markdown
- **Templates**: Built-in document templates
- **Dark/light theme**
- **Cross-platform**: Windows, Mac, Linux

### Quick Start
```bash
cd desktop-app
npm install
npm run dev          # Development
npm run build        # Production
npm run package      # Build distributables
```

### Architecture
- **Electron** for cross-platform desktop app
- **React** for UI components
- **TailwindCSS** for styling
- **Zustand** for state management

---

## 🌐 3. Web Editor (Optional)

### Features
- **Browser-based** editing
- **Real-time collaboration**
- **Cloud storage** integration
- **Share links** for documents

---

## 📱 4. Mobile App (Future)

### Features
- **On-the-go** editing
- **Offline mode**
- **Sync** with desktop/web

---

## 🚀 Implementation Priority

### Phase 1: VSCode Extension (Week 1)
- Basic syntax highlighting
- File association
- Simple commands

### Phase 2: Desktop App (Week 2-3)
- Core editor functionality
- Live preview
- File operations

### Phase 3: Advanced Features (Week 4)
- Templates system
- Export options
- Settings panel

### Phase 4: Web & Mobile (Future)
- Online editor
- Mobile apps
- Collaboration

---

## 💡 Why This Strategy Works

### For Developers
- **Familiar workflow** - stays in VSCode
- **Productivity boost** - syntax highlighting + IntelliSense
- **Easy adoption** - one-click install

### For End Users
- **Simple interface** - not overwhelming like WYSIWYG
- **Live feedback** - see results instantly
- **Professional output** - clean HTML export

### For Ecosystem Growth
- **Multiple entry points** - meet users where they are
- **Cross-platform** - works everywhere
- **Extensible** - plugins and themes

---

## 🎯 Success Metrics

- **VSCode**: 1000+ downloads/month
- **Desktop**: 500+ active users
- **Web**: 200+ daily users
- **GitHub**: 100+ stars, active issues

---

## 🛠️ Next Steps

1. **Fix TypeScript errors** in both projects
2. **Complete VSCode extension** - syntax highlighting first
3. **Build desktop MVP** - editor + preview
4. **User testing** - gather feedback
5. **Iterate** based on usage patterns

---

**Ready to start with VSCode extension or desktop app?**
