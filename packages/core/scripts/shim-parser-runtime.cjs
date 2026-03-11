#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const distParserPath = path.join(__dirname, "..", "dist", "parser.js");

if (!fs.existsSync(distParserPath)) {
  console.error(`dist parser file not found: ${distParserPath}`);
  process.exit(1);
}

const shim = `"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SAFE_PARSE_OPTIONS = void 0;
exports._resetIdCounter = _resetIdCounter;
exports.detectHistoryBoundary = detectHistoryBoundary;
exports.parseIntentText = parseIntentText;
exports.parseIntentTextSafe = parseIntentTextSafe;

const rustCore = require("./rust-core");
const trust = require("./trust");

exports.DEFAULT_SAFE_PARSE_OPTIONS = {
  unknownKeyword: "note",
  maxBlocks: 10000,
  maxLineLength: 50000,
  strict: false,
};

function _resetIdCounter() {
  return rustCore._resetIdCounter();
}

function detectHistoryBoundary(lines) {
  return trust.detectHistoryBoundary(lines);
}

function parseIntentText(source, options) {
  return rustCore.parseIntentText(source, options);
}

function parseIntentTextSafe(source, options) {
  return rustCore.parseIntentTextSafe(source, options);
}
`;

fs.writeFileSync(distParserPath, shim, "utf8");
console.log("Wrote parser runtime shim to dist/parser.js");
