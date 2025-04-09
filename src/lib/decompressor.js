import { inflate, inflateRaw, ungzip } from "pako"
import { logVerbose, logDebug } from "./logger.js"

/**
 * Decompress data using the specified or automatic format
 * @param {Buffer|Uint8Array} inputData - The compressed data
 * @param {Object} options - Command line options
 * @returns {Promise<Buffer|string>} The decompressed data
 */
export async function decompressData(inputData, options) {
  try {
    logVerbose(`Using format: ${options.format}`, options)
    logVerbose(`Input data size: ${inputData.length} bytes`, options)

    if (options.debug) {
      logDebug(
        "First 16 bytes of input:",
        Array.from(inputData.slice(0, 16))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" "),
        options,
      )
    }

    // Always convert to Uint8Array as expected by pako
    const input = Buffer.isBuffer(inputData) ? new Uint8Array(inputData) : inputData

    // Common inflate options
    const inflateOptions = options.string ? { to: "string" } : {}

    let decompressed

    switch (options.format) {
      case "raw":
        decompressed = tryDecompressRaw(input, inflateOptions, options)
        break
      case "gzip":
        decompressed = ungzip(input, inflateOptions)
        break
      case "deflate":
        decompressed = inflate(input, inflateOptions)
        break
      case "auto":
      default:
        decompressed = await tryAllFormats(input, inflateOptions, options)
        break
    }

    logDecompressionStats(decompressed, input.length, options)

    // Convert to Buffer for output, unless we already have a string
    return typeof decompressed === "string" ? decompressed : Buffer.from(decompressed)
  } catch (error) {
    logDebug("Error decompressing data:", error.message, options)
    if (options.debug) {
      logDebug(error.stack, options)
    }
    throw error
  }
}

/**
 * Try decompression with raw format
 * @param {Uint8Array} input - The compressed data
 * @param {Object} inflateOptions - Options for inflation
 * @param {Object} options - Command line options
 * @returns {Buffer|string} The decompressed data
 */
function tryDecompressRaw(input, inflateOptions, options) {
  try {
    const result = inflateRaw(input, inflateOptions)
    logDebug("Successfully decompressed with inflateRaw", options)
    return result
  } catch (err) {
    logDebug("Raw decompression error details:", err, options)
    throw err
  }
}

/**
 * Try all decompression formats until one works
 * @param {Uint8Array} input - The compressed data
 * @param {Object} inflateOptions - Options for inflation
 * @param {Object} options - Command line options
 * @returns {Promise<Buffer|string>} The decompressed data
 */
async function tryAllFormats(input, inflateOptions, options) {
  const errors = []

  try {
    const result = ungzip(input, inflateOptions)
    logVerbose("Successfully decompressed with gzip format", options)
    return result
  } catch (gzipError) {
    errors.push({ format: "gzip", error: gzipError.message })

    try {
      const result = inflate(input, inflateOptions)
      logVerbose("Successfully decompressed with deflate format", options)
      return result
    } catch (inflateError) {
      errors.push({ format: "deflate", error: inflateError.message })

      try {
        const result = inflateRaw(input, inflateOptions)
        logVerbose("Successfully decompressed with raw deflate format", options)
        return result
      } catch (rawError) {
        errors.push({ format: "raw", error: rawError.message })

        if (options.debug) {
          logDebug("All decompression attempts failed:", options)
          errors.forEach((e) => logDebug(`- ${e.format}:`, e.error, options))
        }

        throw new Error("Failed to decompress with any format")
      }
    }
  }
}

/**
 * Log information about the decompressed data
 * @param {Buffer|string} decompressed - The decompressed data
 * @param {number} inputSize - Original compressed data size
 * @param {Object} options - Command line options
 */
function logDecompressionStats(decompressed, inputSize, options) {
  const decompressedSize =
    typeof decompressed === "string" ? decompressed.length : decompressed.length

  // Calculate compression ratio
  const ratio = (inputSize / decompressedSize) * 100
  const expansionFactor = decompressedSize / inputSize

  if (typeof decompressed === "string") {
    logVerbose(`Decompressed to string, length: ${decompressedSize} characters`, options)
    logVerbose(
      `Compression ratio: ${ratio.toFixed(2)}% (${expansionFactor.toFixed(2)}x expansion)`,
      options,
    )

    if (options.debug) {
      logDebug("String preview:", decompressed.slice(0, 100), options)
    }
  } else {
    logVerbose(`Decompressed data size: ${decompressedSize} bytes`, options)
    logVerbose(
      `Compression ratio: ${ratio.toFixed(2)}% (${expansionFactor.toFixed(2)}x expansion)`,
      options,
    )

    // Show a preview of decompressed data
    if (options.debug) {
      try {
        const preview = Buffer.from(decompressed).toString("utf8").slice(0, 100)
        logDebug("Decompressed data preview:", preview, options)
      } catch (e) {
        logDebug("Could not create preview from binary data", options)
      }
    }
  }
}
