## Overall Rating: **6.5 / 10**

The concept is legitimately differentiated. The execution is solid in places. But the project is overextended, and some of its biggest claims are currently hollow.

---

## What's Actually Good

**1\. The core is genuinely strong.**
815 tests, all passing. 9,980 lines of TypeScript across 22 focused modules. Clean separation: parser → types → renderer → validate → trust → query → diff. Security guards are real — prototype pollution prevention, input length caps, safe parse API. This is not toy code.

**2\. The language registry is good architecture.**
Single source of truth for every keyword, its category, lifecycle status, [since](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) version, description, and aliases. Everything else derives from it. That's the right design.

**3\. The trust system is clever.**
[seal](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) / [verify](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) / [computeDocumentHash](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) with the circular-hash problem actually solved (stripping sign:/freeze: before hashing) is a real design problem properly handled. This is one of the format's most credible differentiators.

**4\. MCP integration is the right bet.**
Being in the MCP ecosystem now is correct timing. 9 tool categories covering the full core surface is thorough.

**5\. Python SDK exists and passes its tests.**
118 passing. It's real, not a stub.

---

## Hard Truths — Where You Are Behind

### 1\. The workflow executor doesn't exist

This is the biggest gap relative to the marketing.

You have 27 agentic keywords — [step](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), `gate`, `decision`, `parallel`, `retry`, `signal`, `handoff`, etc. The [extractWorkflow()](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) function produces a dependency graph with execution order. And then... nothing runs it.

A [step:](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) block cannot actually execute. A `gate:` cannot actually block. A `decision:` cannot actually branch. These keywords are parsed and rendered beautifully, and they produce zero behavior.

If someone reads the [for-agents.md](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) guide and writes that Data Migration Pipeline document, nothing happens when they "run" it. You own a workflow DSL with no runtime. That's a gap you cannot paper over with docs.

**What needs to happen:** A minimal sequential executor — even just "iterate through executionOrder, call a registered tool handler per step, track status" — would turn the format from decorative to functional.

### 2\. Python SDK parity is a serious problem

The TS core is ~10,000 lines. Python is 1,530. What's missing from Python:

- `diff` — not implemented
- `workflow` / [WorkflowGraph](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) — not implemented
- [index-builder](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) — not implemented
- `ask` (NL query) — not implemented
- themes — not implemented
- language registry — not implemented
- [query](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) has no sort, no offset, no operators — it's a basic filter

This matters enormously because **Python dominates AI tooling**. If the format is pitched as AI-native and you want LangChain, CrewAI, AutoGen integrations, you need Python to be a first-class SDK, not a subset. Right now it's more of a satellite.

### 3\. The keyword count is out of control

Look at the current [BlockType](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) union: **82 block types** across [types.ts](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html). You're adding keywords every minor version (v2.9 added [header/footer/watermark](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), v2.11 added `def/metric/amendment/figure/signline/contact/deadline`, v2.12 added `assert/secret`).

No user will hold 82 keywords in their head. The format is supposed to be learnable in minutes. At 82 types it's a spec to study, not a language to pick up.

The real question is: what does a contract lawyer actually use? Probably: [title, summary, meta, section, sub, text, note, task, deadline, contact, approve, sign, freeze](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html). 13 keywords. Everything else is domain-specific.

**What needs to happen:** Freeze the core keyword set. Define a principled extension mechanism for domain-specific keywords rather than adding them to the spec every release.

### 4\. The dual-audience tension is real and unresolved

The pitch is "for humans and AI agents." But these two use cases pull the format in completely opposite directions:

- A **lawyer writing a contract** needs: [section, text, deadline, contact, approve, sign, freeze](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html). They do not need `gate`, `signal`, `retry`, `handoff`, `memory`.
- An **engineer writing an agent pipeline** needs: [step, decision, gate, parallel, tool, prompt, context](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html). They do not need `byline`, `dedication`, `epigraph`, `footnote`.

Right now the format tries to serve both audiences in the same namespace. That creates two problems: users see irrelevant keywords in their IDE completion, and the spec has no coherent center of gravity.

**What needs to happen:** Make the separation explicit. Either via document-level mode declarations ([mode: agent](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) vs [mode: document](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html)) or by genuinely scoping keyword categories in tooling so each audience only sees their relevant surface.

### 5\. The `ask` feature is fragile

[ask.ts](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) is hardcoded to `claude-sonnet-4-20250514`. One model rename breaks the CLI's headline feature. It has zero error handling beyond "API returned status X". The context serialization ([serializeContext](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html)) is functional but primitive — no intelligent chunking, no relevance ranking, no handling of documents that exceed the context window.

This is fine for MVP exploration, but it's being marketed as a production feature.

### 6\. Version inflation

Going from 1.0 to 2.13 in the time since the March 1 blog post suggests either versioning is used loosely (as a marketing mechanism rather than a compatibility signal) or nearly all of this was already built before publication. Either way, 2.13 minor releases means clients integrating against the SDK face constant churn. A keyword added in 2.11 but not in the Python SDK means silent breakage.

**What needs to happen:** Publish a compatibility matrix. Which Python version supports which core version? Right now there's no answer to that question.

### 7\. Desktop is probably a distraction

`intenttext-desktop` is essentially [intenttext-editor](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) wrapped in Tauri. The [PROMPT_RUST_CORE_v2.md](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) file in the repo suggests the Rust core was designed via a prompt spec — is it actually implemented, or is the desktop just the Vite editor loaded in a Tauri window? If it's the latter, maintaining it as a separate repo is overhead with no differentiated value.

---

## Are You on the Right Track?

**Philosophically: yes.** The insight — every line declares one intent, dual audience (human + machine), trust built into the format — is sound and differentiated from Markdown. The language registry as a contract, the MCP server, the hub model — these are correct strategic moves.

**Execution: partially.** The core is trustworthy. The test suite is real. But the surface area you're maintaining (9 repos) is larger than what a project at this stage of adoption can sustain with quality.

---

## What Needs to Happen — In Priority Order

**1\. Build the workflow executor.** Even simple. Without it, every agentic keyword is fiction.

**2\. Python parity on the three most important missing features:** `diff`, [index-builder](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), and a proper [query](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) with sort/operators. These are the ones that would actually get Python integrations happening.

**3\. Freeze the keyword count.** Decide the core 25-30 canonical keywords. Make everything else an optional extension. Stop adding keywords in every release.

**4\. One working end-to-end demo** that a stranger can run in 5 minutes and actually see something useful happen. Not a rendering demo — a query-over-real-documents or a seal-and-verify or a merge-from-template demo. Real output, not hello-world.

**5\. VS Code extension on the marketplace.** Right now it exists in the repo. Is it published? If not, that's the single highest-leverage distribution move.

**6\. Publish a compatibility matrix** between the core TypeScript version and Python SDK version.

---

## Summary

The core is a 8/10. The Python SDK is a 4/10. The workflow story is a 2/10 without an executor. The overall project strategy is a 6/10 — right direction, spread too thin, keyword discipline needed. The docs and marketing are a 7/10 — clear writing, but they're ahead of the implementation in places.

The project has genuine technical merit and a real idea. The risk is feature sprawl without depth in the things that would actually drive adoption.
