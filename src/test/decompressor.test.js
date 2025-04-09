import { describe, it, beforeEach, afterEach } from "node:test"
import { strict as assert } from "node:assert"
import { deflate, deflateRaw, gzip } from "pako"
import { decompressData } from "../lib/decompressor.js"

describe("Decompressor", () => {
  const testData = "Hello, world!"
  const compressedDeflate = deflate(testData)
  const compressedRaw = deflateRaw(testData)
  const compressedGzip = gzip(testData)

  let consoleErrorMock
  let originalConsoleError

  beforeEach(() => {
    // Mock console.error to avoid cluttering test output
    originalConsoleError = console.error
    consoleErrorMock = () => {}
    console.error = consoleErrorMock
  })

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError
  })

  it("should decompress deflate data correctly", async () => {
    const options = { format: "deflate" }
    const result = await decompressData(compressedDeflate, options)
    assert.equal(Buffer.from(result).toString(), testData)
  })

  it("should decompress raw deflate data correctly", async () => {
    const options = { format: "raw" }
    const result = await decompressData(compressedRaw, options)
    assert.equal(Buffer.from(result).toString(), testData)
  })

  it("should decompress gzip data correctly", async () => {
    const options = { format: "gzip" }
    const result = await decompressData(compressedGzip, options)
    assert.equal(Buffer.from(result).toString(), testData)
  })

  it("should handle auto format detection correctly", async () => {
    const options = { format: "auto" }
    const result = await decompressData(compressedDeflate, options)
    assert.equal(Buffer.from(result).toString(), testData)
  })

  it("should handle string output correctly", async () => {
    const options = { format: "deflate", string: true }
    const result = await decompressData(compressedDeflate, options)
    assert.equal(result, testData)
  })
})
