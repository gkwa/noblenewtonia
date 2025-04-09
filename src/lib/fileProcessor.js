import { createReadStream, createWriteStream } from "fs"
import { pipeline } from "stream/promises"
import { decompressData } from "./decompressor.js"
import { logVerbose, logError, logDebug } from "./logger.js"

/**
 * Process an input file or stream and output the decompressed result
 * @param {Object} options - Command line options
 * @returns {Promise<void>}
 */
export async function processFile(options) {
  try {
    // Read input
    const inputData = await readInput(options)

    if (inputData.length === 0) {
      throw new Error("No input data received")
    }

    // Process the data
    const decompressed = await decompressData(inputData, options)

    // Write output
    await writeOutput(decompressed, options)
  } catch (error) {
    logError("Error:", error.message)
    if (options.debug && error.stack) {
      logError(error.stack)
    }
    throw error
  }
}

/**
 * Read input from file or stdin
 * @param {Object} options - Command line options
 * @returns {Promise<Buffer>} The input data
 */
async function readInput(options) {
  let inputData

  if (options.input) {
    const chunks = []
    for await (const chunk of createReadStream(options.input)) {
      chunks.push(chunk)
    }
    inputData = Buffer.concat(chunks)
  } else {
    // Read from stdin
    const chunks = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }

    if (chunks.length === 0) {
      throw new Error("No input data received")
    }

    inputData = Buffer.concat(chunks)
  }

  return inputData
}

/**
 * Write output to file or stdout
 * @param {Buffer|string} decompressed - The decompressed data
 * @param {Object} options - Command line options
 * @returns {Promise<void>}
 */
async function writeOutput(decompressed, options) {
  if (options.output) {
    const outputData = typeof decompressed === "string" ? Buffer.from(decompressed) : decompressed

    await pipeline(async function* () {
      yield outputData
    }, createWriteStream(options.output))

    if (options.verbose) {
      logVerbose(`Output written to ${options.output}`)
    }
  } else {
    // Write to stdout
    process.stdout.write(typeof decompressed === "string" ? decompressed : decompressed)
  }
}
