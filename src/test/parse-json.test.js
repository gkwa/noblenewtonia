import { describe, it, beforeEach, afterEach, mock } from "node:test"
import { strict as assert } from "node:assert"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "fs"
import { deflate } from "pako"
import { encodeBase64 } from "../lib/encoding.js"
import { load } from "js-yaml"

// Mock the commander program
function mockProgram() {
  return {
    command: function () {
      return this
    },
    description: function () {
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

describe("Parse JSON Command", () => {
  const testDir = join(__dirname, "test-data")
  const outputDir = join(testDir, "output")

  beforeEach(() => {
    // Ensure test directories exist
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    // Create test JSON files
    createOldFormatTestJson()
    createNewFormatTestJson()

    // Mock console methods to prevent test output
    mock.method(console, "log", () => {})
    mock.method(console, "error", () => {})
  })

  afterEach(() => {
    // Clean up test directory by removing files first
    try {
      if (existsSync(outputDir)) {
        // Get all files in output directory
        const files = readdirSync(outputDir)

        // Delete each file
        for (const file of files) {
          const filePath = join(outputDir, file)
          rmSync(filePath)
        }

        // Then remove the directory
        rmSync(outputDir)
      }

      // Clean up JSON test files
      const oldFormatFile = join(testDir, "test-json-old.json")
      if (existsSync(oldFormatFile)) {
        rmSync(oldFormatFile)
      }

      const newFormatFile = join(testDir, "test-json-new.json")
      if (existsSync(newFormatFile)) {
        rmSync(newFormatFile)
      }

      // Finally remove the test directory
      rmSync(testDir, { recursive: true, force: true })
    } catch (err) {
      console.error("Error during cleanup:", err)
    }

    // Restore console
    mock.restoreAll()
  })

  // Helper function to create old format test JSON
  function createOldFormatTestJson() {
    const oldFormatFile = join(testDir, "test-json-old.json")

    const testHtml = "<h1>Test HTML</h1><p>This is a test</p>"
    const compressed = deflate(testHtml)
    const base64 = Buffer.from(compressed).toString("base64")

    const testData = [
      {
        rawHtml: base64,
        name: "Test Product 1",
        id: "test-id-1",
      },
    ]

    writeFileSync(oldFormatFile, JSON.stringify(testData))
  }

  // Helper function to create new format test JSON
  function createNewFormatTestJson() {
    const newFormatFile = join(testDir, "test-json-new.json")

    const testHtml = "<h1>Test HTML</h1><p>This is a test</p>"
    const compressed = deflate(testHtml)
    const base64 = Buffer.from(compressed).toString("base64")

    const testData = {
      Items: [
        {
          category: {
            Value: "test-category",
          },
          product: {
            Value: {
              rawHtml: {
                Value: base64,
              },
              name: {
                Value: "Test Product 1",
              },
              id: {
                Value: "test-id-1",
              },
            },
          },
        },
      ],
      Count: 1,
      ScannedCount: 1,
    }

    writeFileSync(newFormatFile, JSON.stringify(testData))
  }

  it("should process old format JSON file correctly", async () => {
    // Import the parse-json module inside the test
    const { setupParseJsonCommand } = await import("../commands/parse-json.js")

    const program = mockProgram()

    // Set up the parse-json command
    setupParseJsonCommand(program)

    const oldFormatFile = join(testDir, "test-json-old.json")
    const outputFile = join(outputDir, "output.yaml")

    // Execute the parse-json command with test options
    await program.executeAction({
      input: oldFormatFile,
      output: outputFile,
      format: "deflate",
      verbose: false,
      debug: false,
    })

    // Check that output file exists
    assert.ok(existsSync(outputFile), "Output YAML file should exist")

    // Read and parse the YAML file
    const yamlContent = readFileSync(outputFile, "utf8")
    const parsedYaml = load(yamlContent)

    // Verify the YAML contains the expected data structure (an array with items)
    assert.ok(Array.isArray(parsedYaml), "Output should be a YAML array")
    assert.equal(parsedYaml.length, 1, "Output should contain 1 item")

    // Check properties of the first item
    const item = parsedYaml[0]
    assert.equal(item.id, "test-id-1", "Item should have correct ID")
    assert.equal(item.name, "Test Product 1", "Item should have correct name")
    assert.ok(item.rawHtml.includes("<h1>Test HTML</h1>"), "Item should have decompressed HTML")
  })

  it("should process new format JSON file correctly", async () => {
    // Import the parse-json module inside the test
    const { setupParseJsonCommand } = await import("../commands/parse-json.js")

    const program = mockProgram()

    // Set up the parse-json command
    setupParseJsonCommand(program)

    const newFormatFile = join(testDir, "test-json-new.json")
    const outputFile = join(outputDir, "output-new.yaml")

    // Execute the parse-json command with test options
    await program.executeAction({
      input: newFormatFile,
      output: outputFile,
      format: "deflate",
      verbose: false,
      debug: false,
    })

    // Check that output file exists
    assert.ok(existsSync(outputFile), "Output YAML file should exist")

    // Read and parse the YAML file
    const yamlContent = readFileSync(outputFile, "utf8")
    const parsedYaml = load(yamlContent)

    // Verify the YAML contains the expected data structure (an array with items)
    assert.ok(Array.isArray(parsedYaml), "Output should be a YAML array")
    assert.equal(parsedYaml.length, 1, "Output should contain 1 item")

    // Check properties of the first item
    const item = parsedYaml[0]
    assert.equal(item.id, "test-id-1", "Item should have correct ID")
    assert.equal(item.name, "Test Product 1", "Item should have correct name")
    assert.equal(item.category, "test-category", "Item should have correct category")
    assert.ok(item.rawHtml.includes("<h1>Test HTML</h1>"), "Item should have decompressed HTML")
  })

  it("should output to a single file when directory is specified", async () => {
    // Import the parse-json module inside the test
    const { setupParseJsonCommand } = await import("../commands/parse-json.js")

    const program = mockProgram()

    // Set up the parse-json command
    setupParseJsonCommand(program)

    const oldFormatFile = join(testDir, "test-json-old.json")

    // Execute the parse-json command with directory output
    await program.executeAction({
      input: oldFormatFile,
      output: outputDir,
      format: "deflate",
      verbose: false,
      debug: false,
    })

    // Check that the items.yaml file exists in the output directory
    const outputFile = join(outputDir, "items.yaml")
    assert.ok(existsSync(outputFile), "items.yaml file should exist in the output directory")

    // Read and parse the YAML file
    const yamlContent = readFileSync(outputFile, "utf8")
    const parsedYaml = load(yamlContent)

    // Verify the YAML contains the expected data structure (an array with items)
    assert.ok(Array.isArray(parsedYaml), "Output should be a YAML array")
    assert.equal(parsedYaml.length, 1, "Output should contain 1 item")

    // Check properties of the first item
    const item = parsedYaml[0]
    assert.equal(item.id, "test-id-1", "Item should have correct ID")
    assert.equal(item.name, "Test Product 1", "Item should have correct name")
    assert.ok(item.rawHtml.includes("<h1>Test HTML</h1>"), "Item should have decompressed HTML")
  })
})
