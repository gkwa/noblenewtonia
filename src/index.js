#!/usr/bin/env node

import { program } from "commander"
import { processFile } from "./lib/fileProcessor.js"
import { setupBatchCommand } from "./commands/batch.js"
import { setupParseJsonCommand } from "./commands/parse-json.js"

// Set up the CLI
const cli = program
  .name("noblenewtonia")
  .description("A CLI tool to decompress pako-compressed data")
  .version("1.0.0")

// Set up the default command
const defaultCommand = cli
  .command("decompress", { isDefault: true })
  .description("Decompress a single input stream")
  .option("-f, --format <format>", "compression format (auto, deflate, raw, gzip)", "auto")
  .option("-o, --output <file>", "output file (defaults to stdout)")
  .option("-i, --input <file>", "input file (defaults to stdin)")
  .option("-v, --verbose", "enable verbose output")
  .option("-q, --quiet", "suppress all non-error output")
  .option("-d, --debug", "show detailed error information")
  .option("-s, --string", "output as string (UTF-8 to UTF-16 conversion)")
  .action((options) => {
    // Execute the main process
    processFile(options).catch((error) => {
      console.error("Fatal error:", error.message)
      if (options.debug && error.stack) {
        console.error(error.stack)
      }
      process.exit(1)
    })
  })

// Set up the batch command
setupBatchCommand(cli)

// Set up the parse-json command
setupParseJsonCommand(cli)

// Parse arguments and execute
cli.parse(process.argv)
