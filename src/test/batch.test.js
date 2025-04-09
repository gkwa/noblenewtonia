import { describe, it, beforeEach, afterEach, mock } from "node:test"
import { strict as assert } from "node:assert"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs"
import { deflate } from "pako"
import { encodeBase64 } from "../lib/encoding.js"

// Mock the commander program
function mockProgram() {
  return {
    command: function () {
      return this
    },
    description: function () {
      return this
    },
    requiredOption: function () {
      return this
    },
    option: function () {
      return this
    },
    action: function (callback) {
      this.actionCallback = callback
      return this
    },
    executeAction: function (options) {
      return this.actionCallback(options)
    },
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe("Batch Command", () => {
  const testDir = join(__dirname, "test-data")
  const inputFile = join(testDir, "input.txt")
  const outputDir = join(testDir, "output")

  // Sample test data
  const testData = ["Hello, world!", "Testing batch processing"]

  beforeEach(() => {
    // Ensure test directories exist
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    // Create test input file with base64 encoded deflated data
    const encodedData = testData.map((text) => {
      const compressed = deflate(text)
      return Buffer.from(compressed).toString("base64")
    })

    writeFileSync(inputFile, encodedData.join("\n"))

    // Mock console methods to prevent test output
    mock.method(console, "log", () => {})
    mock.method(console, "error", () => {})
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      // Remove files first before attempting to remove directory
      try {
        if (existsSync(inputFile)) {
          rmSync(inputFile)
        }

        // Clean up output directory contents before removing the directory
        if (existsSync(outputDir)) {
          const files = require("fs").readdirSync(outputDir)
          files.forEach((file) => {
            const filePath = join(outputDir, file)
            rmSync(filePath)
          })

          rmSync(outputDir)
        }

        // Finally remove the parent test directory
        rmSync(testDir, { recursive: true, force: true })
      } catch (err) {
        console.error("Error during cleanup:", err)
      }
    }

    // Restore console
    mock.restoreAll()
  })

  it("should process batch file correctly", async () => {
    // Import the batch module inside the test to allow for mocking
    const batchModule = await import("../commands/batch.js")
    const { setupBatchCommand } = batchModule

    const program = mockProgram()

    // Set up the batch command
    setupBatchCommand(program)

    // Execute the batch command with test options
    await program.executeAction({
      input: inputFile,
      outputDir: outputDir,
      prefix: "test_",
      format: "deflate",
      verbose: false,
      debug: false,
    })

    // Check that output files exist
    const file1Path = join(outputDir, "test_1.txt")
    const file2Path = join(outputDir, "test_2.txt")

    assert.ok(existsSync(file1Path), "First output file should exist")
    assert.ok(existsSync(file2Path), "Second output file should exist")

    // Verify file contents
    const file1Content = readFileSync(file1Path, "utf8")
    const file2Content = readFileSync(file2Path, "utf8")

    assert.equal(file1Content, testData[0], "First file content should match")
    assert.equal(file2Content, testData[1], "Second file content should match")
  })
})
