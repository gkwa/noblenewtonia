import { createReadStream, createWriteStream, promises as fsPromises } from "fs"
import path from "path"
import { pipeline } from "stream/promises"
import { decompressData } from "../lib/decompressor.js"
import { logVerbose, logError, logDebug, logInfo, logIfNotQuiet } from "../lib/logger.js"
import { readLineByLine } from "../lib/fileReader.js"
import { decodeBase64 } from "../lib/encoding.js"

/**
 * Setup the batch command
 * @param {Object} program - Commander program instance
 */
export function setupBatchCommand(program) {
  program
    .command("batch")
    .description("Process a file with base64-encoded, newline-delimited compressed data")
    .requiredOption(
      "-i, --input <file>",
      "input file containing base64 encoded data (one per line)",
    )
    .option(
      "-o, --output-dir <dir>",
      "output directory for decompressed files (use '-' for stdout)",
      "./output",
    )
    .option("-p, --prefix <prefix>", "filename prefix for output files", "decompressed_")
    .option("-f, --format <format>", "compression format (auto, deflate, raw, gzip)", "auto")
    .option("-v, --verbose", "enable verbose output")
    .option("-q, --quiet", "suppress all non-error output")
    .option("-d, --debug", "show detailed error information")
    .option("-s, --summary", "show summary statistics after processing")
    .option("--separator <sep>", "separator between entries when using stdout", "\n---\n")
    .action(processBatchCommand)
}

/**
 * Process the batch command
 * @param {Object} options - Command options
 */
async function processBatchCommand(options) {
  try {
    // Check if output is stdout
    const useStdout = options.outputDir === "-" || options["output-dir"] === "-"

    // Get the actual output directory value
    const outputDirectory = options.outputDir || options["output-dir"] || "./output"

    // Only create output directory if not outputting to stdout
    if (!useStdout) {
      // Ensure output directory exists
      await fsPromises.mkdir(outputDirectory, { recursive: true })
      logVerbose(`Output directory: ${outputDirectory}`, options)
    } else {
      logVerbose(`Output: stdout (separator: ${JSON.stringify(options.separator)})`, options)
    }

    logVerbose(`Processing batch file: ${options.input}`, options)

    // Read the input file line by line
    const lines = await readLineByLine(options.input)

    if (lines.length === 0) {
      throw new Error("No data found in input file")
    }

    logVerbose(`Found ${lines.length} lines to process`, options)

    // Statistics for summary report
    const stats = {
      totalProcessed: 0,
      totalInputBytes: 0,
      totalOutputBytes: 0,
      successCount: 0,
      errorCount: 0,
    }

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue // Skip empty lines

      try {
        const result = await processLine(line, i, options, useStdout, outputDirectory)

        // Update statistics
        stats.totalProcessed++
        stats.totalInputBytes += result.inputSize
        stats.totalOutputBytes += result.outputSize
        stats.successCount++
      } catch (error) {
        stats.totalProcessed++
        stats.errorCount++

        logError(`Error processing line ${i + 1}:`, error.message)
        if (options.debug) {
          logDebug(error.stack, options)
        }
      }
    }

    // Show summary if requested or in verbose mode
    if (options.summary || options.verbose) {
      displaySummary(stats, options, useStdout, outputDirectory)
    }

    // Only show completion message if not in quiet mode
    if (!options.quiet) {
      if (useStdout) {
        logIfNotQuiet(
          `Batch processing complete: ${stats.successCount} successful, ${stats.errorCount} errors (output to stdout)`,
          options,
        )
      } else {
        logIfNotQuiet(
          `Batch processing complete: ${stats.successCount} successful, ${stats.errorCount} errors (output in: ${outputDirectory})`,
          options,
        )
      }
    }
  } catch (error) {
    logError("Error in batch processing:", error.message)
    if (options.debug) {
      logDebug(error.stack, options)
    }
    process.exit(1)
  }
}

/**
 * Display summary statistics from batch processing
 * @param {Object} stats - Statistics object
 * @param {Object} options - Command options
 * @param {boolean} useStdout - Whether output is to stdout
 * @param {string} outputDirectory - Output directory path
 */
function displaySummary(stats, options, useStdout, outputDirectory) {
  logIfNotQuiet("\nBatch Processing Summary:", options)
  logIfNotQuiet(`Total files processed: ${stats.totalProcessed}`, options)
  logIfNotQuiet(`  Success: ${stats.successCount}`, options)
  logIfNotQuiet(`  Errors: ${stats.errorCount}`, options)

  if (!useStdout) {
    logIfNotQuiet(`  Output directory: ${outputDirectory}`, options)
  } else {
    logIfNotQuiet(`  Output: stdout`, options)
  }

  if (stats.successCount > 0) {
    const totalCompressionRatio = (stats.totalInputBytes / stats.totalOutputBytes) * 100
    const averageExpansionFactor = stats.totalOutputBytes / stats.totalInputBytes

    logIfNotQuiet(`\nTotal input size: ${formatBytes(stats.totalInputBytes)}`, options)
    logIfNotQuiet(`Total output size: ${formatBytes(stats.totalOutputBytes)}`, options)
    logIfNotQuiet(`Overall compression ratio: ${totalCompressionRatio.toFixed(2)}%`, options)
    logIfNotQuiet(`Expansion factor: ${averageExpansionFactor.toFixed(2)}x`, options)
  }
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Process a single line from the batch file
 * @param {string} line - The base64 encoded line
 * @param {number} index - Line index (for naming)
 * @param {Object} options - Command options
 * @param {boolean} useStdout - Whether output is to stdout
 * @param {string} outputDirectory - Output directory path
 * @returns {Object} Processing result with sizes
 */
async function processLine(line, index, options, useStdout, outputDirectory) {
  logVerbose(`Processing line ${index + 1}`, options)

  // Decode base64
  const decodedData = decodeBase64(line)

  logVerbose(`Decoded ${line.length} base64 characters to ${decodedData.length} bytes`, options)

  // Decompress the data
  const decompressed = await decompressData(decodedData, options)

  // Output the decompressed data
  if (useStdout) {
    // Write to stdout
    if (index > 0) {
      // Add separator between entries (but not before the first one)
      process.stdout.write(options.separator)
    }

    // Write the decompressed data
    if (typeof decompressed === "string") {
      process.stdout.write(decompressed)
    } else {
      process.stdout.write(decompressed)
    }
  } else {
    // Create output filename
    const outputFileName = `${options.prefix}${index + 1}.txt`
    const outputPath = path.join(outputDirectory, outputFileName)

    // Write the output to a file
    await writeOutputFile(decompressed, outputPath)

    logVerbose(`Written to ${outputPath}`, options)
  }

  // Return processing result with sizes
  return {
    inputSize: decodedData.length,
    outputSize: typeof decompressed === "string" ? decompressed.length : decompressed.length,
  }
}

/**
 * Write decompressed data to an output file
 * @param {Buffer|string} data - The decompressed data
 * @param {string} outputPath - Path to write the file
 */
async function writeOutputFile(data, outputPath) {
  const outputData = typeof data === "string" ? Buffer.from(data) : data

  // Ensure the directory exists
  const outputDir = path.dirname(outputPath)
  await fsPromises.mkdir(outputDir, { recursive: true })

  // Write the file
  await fsPromises.writeFile(outputPath, outputData)
}

// Make sure we're exporting the correct function
export default { setupBatchCommand }
