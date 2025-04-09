import { describe, it, beforeEach, afterEach, mock } from "node:test"
import { strict as assert } from "node:assert"
import { logVerbose, logError, logDebug, logIfNotQuiet } from "../lib/logger.js"

describe("Logger", () => {
  let consoleLogSpy
  let consoleErrorSpy

  beforeEach(() => {
    // Create spies for console methods
    consoleLogSpy = mock.method(console, "log", () => {})
    consoleErrorSpy = mock.method(console, "error", () => {})
  })

  afterEach(() => {
    // Restore console methods
    mock.restoreAll()
  })

  it("should not log verbose messages when verbose is not enabled", () => {
    const options = { verbose: false }

    logVerbose("This is a verbose message", options)

    assert.equal(consoleErrorSpy.mock.calls.length, 0, "Verbose message should not be logged")
  })

  it("should log verbose messages when verbose is enabled", () => {
    const options = { verbose: true }

    logVerbose("This is a verbose message", options)

    assert.equal(consoleErrorSpy.mock.calls.length, 1, "Verbose message should be logged")
    assert.deepEqual(consoleErrorSpy.mock.calls[0].arguments, ["This is a verbose message"])
  })

  it("should not log debug messages when debug is not enabled", () => {
    const options = { debug: false }

    logDebug("This is a debug message", options)

    assert.equal(consoleErrorSpy.mock.calls.length, 0, "Debug message should not be logged")
  })

  it("should log debug messages when debug is enabled", () => {
    const options = { debug: true }

    logDebug("This is a debug message", options)

    assert.equal(consoleErrorSpy.mock.calls.length, 1, "Debug message should be logged")
    assert.deepEqual(consoleErrorSpy.mock.calls[0].arguments, ["This is a debug message"])
  })

  it("should not log normal messages when quiet mode is enabled", () => {
    const options = { quiet: true }

    logIfNotQuiet("This is a normal message", options)

    assert.equal(
      consoleErrorSpy.mock.calls.length,
      0,
      "Normal message should not be logged in quiet mode",
    )
  })

  it("should log normal messages when quiet mode is disabled", () => {
    const options = { quiet: false }

    logIfNotQuiet("This is a normal message", options)

    assert.equal(
      consoleErrorSpy.mock.calls.length,
      1,
      "Normal message should be logged when not in quiet mode",
    )
    assert.deepEqual(consoleErrorSpy.mock.calls[0].arguments, ["This is a normal message"])
  })

  it("should always log error messages even in quiet mode", () => {
    const options = { quiet: true }

    logError("This is an error message")

    assert.equal(
      consoleErrorSpy.mock.calls.length,
      1,
      "Error message should be logged even in quiet mode",
    )
    assert.deepEqual(consoleErrorSpy.mock.calls[0].arguments, ["This is an error message"])
  })

  it("should log debug messages even in quiet mode if debug is enabled", () => {
    const options = { quiet: true, debug: true }

    logDebug("This is a debug message", options)

    assert.equal(
      consoleErrorSpy.mock.calls.length,
      1,
      "Debug message should be logged when debug is enabled, even in quiet mode",
    )
    assert.deepEqual(consoleErrorSpy.mock.calls[0].arguments, ["This is a debug message"])
  })
})
