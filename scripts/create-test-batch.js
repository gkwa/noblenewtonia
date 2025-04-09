#!/usr/bin/env node

/**
 * Script to create a test batch file with base64 encoded compressed content
 */

import { deflate } from "pako"
import fs from "fs"
import path from "path"

// Sample data to encode
const samples = [
  "Hello, world!",
  "Testing batch processing",
  "This is a longer string to test compression efficiency with repetitive content. " +
    "This is a longer string to test compression efficiency with repetitive content.",
  "Line number 4 with some numbers: 12345678901234567890",
  "Final test line with special characters: !@#$%^&*()_+-=[]{}|;':\",./<>?",
]

// Create output directory if it doesn't exist
const outputDir = path.join(process.cwd(), "test-data")
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Output filepath
const outputFile = path.join(outputDir, "batch-test.txt")

// Process each sample and write to file
const compressAndEncode = (text) => {
  // Compress with pako deflate
  const compressed = deflate(text)

  // Convert to Buffer and encode as base64
  const base64 = Buffer.from(compressed).toString("base64")

  return base64
}

// Compress and encode all samples
const encodedLines = samples.map(compressAndEncode)

// Write to file
fs.writeFileSync(outputFile, encodedLines.join("\n"))

console.log(`Created test batch file at: ${outputFile}`)
console.log(`It contains ${encodedLines.length} lines of base64-encoded compressed text`)
