import { promises as fsPromises } from "fs"
import path from "path"
import { pipeline } from "stream/promises"
import { createWriteStream } from "fs"
import { decompressData } from "../lib/decompressor.js"
import { logVerbose, logError, logDebug, logIfNotQuiet } from "../lib/logger.js"
import { decodeBase64 } from "../lib/encoding.js"
import { dump } from "js-yaml"

/**
 * Setup the parse-json command
 * @param {Object} program - Commander program instance
 */
export function setupParseJsonCommand(program) {
  program
    .command("parse-json")
    .description("Process a JSON file with items containing base64-encoded rawHtml")
    .option("-i, --input <file>", "input JSON file (use '-' for stdin)")
    .option("-o, --output <output>", "output file or directory (use '-' for stdout)", "-")
    .option("-f, --format <format>", "compression format (auto, deflate, raw, gzip)", "auto")
    .option("-v, --verbose", "enable verbose output")
    .option("-q, --quiet", "suppress all non-error output")
    .option("-d, --debug", "show detailed error information")
    .option("-s, --summary", "show summary statistics after processing")
    .option("--sample <count>", "process only a random sample of items", parseInt)
    .action(processJsonCommand)
}

/**
 * Process the parse-json command
 * @param {Object} options - Command line options
 */
async function processJsonCommand(options) {
  try {
    // Check if output is stdout or a file/directory
    const useStdout = options.output === "-"
    let outputFile = options.output

    // If output is not stdout and not ending with .yml or .yaml, treat as directory
    if (!useStdout && !outputFile.endsWith(".yml") && !outputFile.endsWith(".yaml")) {
      await fsPromises.mkdir(outputFile, { recursive: true })
      logVerbose(`Output directory: ${outputFile}`, options)
    } else if (!useStdout) {
      // Ensure the directory for the output file exists
      const outputDir = path.dirname(outputFile)
      await fsPromises.mkdir(outputDir, { recursive: true })
      logVerbose(`Output file: ${outputFile}`, options)
    } else {
      logVerbose(`Output: stdout`, options)
    }

    // Get JSON content - either from file or stdin
    let jsonContent
    if (!options.input || options.input === "-") {
      logVerbose(`Reading JSON from stdin`, options)
      // Read from stdin
      const chunks = []
      for await (const chunk of process.stdin) {
        chunks.push(chunk)
      }
      jsonContent = Buffer.concat(chunks).toString("utf8")
    } else {
      logVerbose(`Processing JSON file: ${options.input}`, options)
      // Read the input file
      jsonContent = await fsPromises.readFile(options.input, "utf8")
    }

    let jsonData
    try {
      jsonData = JSON.parse(jsonContent)
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`)
    }

    // Handle both the new nested structure and the old flat array structure
    let itemsToProcess = []

    if (jsonData.Items && Array.isArray(jsonData.Items) && jsonData.Items.length > 0) {
      // New structure: { Items: [ ... ] }
      logVerbose(`Found new nested JSON structure with Items array`, options)
      itemsToProcess = jsonData.Items.map((item) => {
        // Extract the product data and category from the nested structure
        const category = item.category && item.category.Value ? item.category.Value : null
        const domain = item.domain && item.domain.Value ? item.domain.Value : null

        if (item.product && item.product.Value) {
          return {
            type: "nested",
            data: item.product.Value,
            category: category,
            domain: domain,
          }
        }
        return { type: "unknown", data: item, category: category, domain: domain }
      })
    } else if (Array.isArray(jsonData) && jsonData.length > 0) {
      // Old structure: [ ... ]
      logVerbose(`Found old flat JSON array structure`, options)
      itemsToProcess = jsonData.map((item) => ({
        type: "flat",
        data: item,
        category: item.category || null,
        domain: item.domain || null,
      }))
    } else {
      // Handle empty arrays or null Items
      if (
        jsonData.Items === null ||
        (Array.isArray(jsonData.Items) && jsonData.Items.length === 0) ||
        (Array.isArray(jsonData) && jsonData.length === 0)
      ) {
        logVerbose(`Input contains empty Items array or null Items`, options)

        // Create a YAML output that reflects the empty input
        const emptyYaml = dump([])

        if (useStdout) {
          process.stdout.write(emptyYaml)
        } else if (outputFile.endsWith(".yml") || outputFile.endsWith(".yaml")) {
          await fsPromises.writeFile(outputFile, emptyYaml)
          logVerbose(`Written empty YAML to ${outputFile}`, options)
        } else {
          const emptyFilePath = path.join(outputFile, "empty-response.yaml")
          await fsPromises.writeFile(emptyFilePath, emptyYaml)
          logVerbose(`Written empty YAML to ${emptyFilePath}`, options)
        }

        // Show summary
        if (options.summary || options.verbose) {
          logIfNotQuiet("\nJSON Processing Summary:", options)
          logIfNotQuiet("No items found to process", options)
          logIfNotQuiet(`Output: ${useStdout ? "stdout" : options.output}`, options)
        }

        if (!options.quiet) {
          logIfNotQuiet("JSON processing complete: No items to process", options)
        }

        return
      }

      throw new Error("Input JSON must be an array or contain an Items array")
    }

    logVerbose(`Found ${itemsToProcess.length} items to process`, options)

    // Apply sampling if requested
    if (options.sample && options.sample > 0 && options.sample < itemsToProcess.length) {
      logVerbose(
        `Sampling ${options.sample} items from ${itemsToProcess.length} total items`,
        options,
      )
      itemsToProcess = sampleItems(itemsToProcess, options.sample)
      logVerbose(`Selected ${itemsToProcess.length} items for processing`, options)
    }

    // Statistics for summary report
    const stats = {
      totalProcessed: 0,
      totalInputBytes: 0,
      totalOutputBytes: 0,
      successCount: 0,
      errorCount: 0,
    }

    // Process each item and collect the results
    const processedItems = []

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i]

      try {
        const { type, data, category, domain } = item

        // Extract the relevant data based on the item type
        let rawHtml, name, id, url, imageUrl

        if (type === "flat") {
          // Direct access for old format
          if (!data.rawHtml) {
            throw new Error("Item missing required rawHtml field")
          }
          rawHtml = data.rawHtml
          name = data.name || "Unknown"
          id = data.id
          url = data.url || null
          imageUrl = data.imageUrl || null
        } else if (type === "nested") {
          // Nested structure from new format
          if (data.rawHtml && typeof data.rawHtml === "string") {
            // Direct string
            rawHtml = data.rawHtml
          } else if (data.rawHtml && data.rawHtml.Value) {
            // Value property
            rawHtml = data.rawHtml.Value
          } else {
            throw new Error("Item missing required rawHtml field")
          }

          // Get name from different possible locations
          if (typeof data.name === "string") {
            name = data.name
          } else if (data.name && data.name.Value) {
            name = data.name.Value
          } else {
            name = "Unknown"
          }

          // Get ID
          if (typeof data.id === "string") {
            id = data.id
          } else if (data.id && data.id.Value) {
            id = data.id.Value
          }

          // Get URL
          if (typeof data.url === "string") {
            url = data.url
          } else if (data.url && data.url.Value) {
            url = data.url.Value
          } else {
            url = null
          }

          // Get imageUrl
          if (typeof data.imageUrl === "string") {
            imageUrl = data.imageUrl
          } else if (data.imageUrl && data.imageUrl.Value) {
            imageUrl = data.imageUrl.Value
          } else {
            imageUrl = null
          }
        } else {
          throw new Error("Unknown item type")
        }

        // Decode base64
        const decodedData = decodeBase64(rawHtml)
        logVerbose(
          `Decoded ${rawHtml.length} base64 characters to ${decodedData.length} bytes`,
          options,
        )

        // Decompress the data
        const decompressed = await decompressData(decodedData, options)

        // Add to processed items
        processedItems.push({
          id: id || formatFilename(name),
          name: name,
          category: category || null,
          url: url || (domain ? `https://${domain}` : null),
          imageUrl: imageUrl || null,
          rawHtml: typeof decompressed === "string" ? decompressed : decompressed.toString("utf8"),
        })

        // Update statistics
        stats.totalProcessed++
        stats.totalInputBytes += decodedData.length
        stats.totalOutputBytes +=
          typeof decompressed === "string" ? decompressed.length : decompressed.length
        stats.successCount++
      } catch (error) {
        stats.totalProcessed++
        stats.errorCount++

        logError(`Error processing item ${i + 1}:`, error.message)
        if (options.debug) {
          logDebug(error.stack, options)
        }
      }
    }

    // Convert items to YAML as a single list
    const yamlContent = dump(processedItems)

    // Output the YAML content
    if (useStdout) {
      // Write to stdout
      process.stdout.write(yamlContent)
    } else if (outputFile.endsWith(".yml") || outputFile.endsWith(".yaml")) {
      // Write to a single YAML file
      await fsPromises.writeFile(outputFile, yamlContent)
      logVerbose(`Written to ${outputFile}`, options)
    } else {
      // Write to a single file in the output directory
      const outputPath = path.join(outputFile, "items.yaml")
      await fsPromises.writeFile(outputPath, yamlContent)
      logVerbose(`Written to ${outputPath}`, options)
    }

    // Show summary if requested or in verbose mode
    if (options.summary || options.verbose) {
      displaySummary(stats, options, useStdout)
    }

    // Only show completion message if not in quiet mode
    if (!options.quiet) {
      if (useStdout) {
        logIfNotQuiet(
          `JSON processing complete: ${stats.successCount} successful, ${stats.errorCount} errors (output to stdout)`,
          options,
        )
      } else if (outputFile.endsWith(".yml") || outputFile.endsWith(".yaml")) {
        logIfNotQuiet(
          `JSON processing complete: ${stats.successCount} successful, ${stats.errorCount} errors (output to: ${outputFile})`,
          options,
        )
      } else {
        logIfNotQuiet(
          `JSON processing complete: ${stats.successCount} successful, ${stats.errorCount} errors (output in: ${outputFile})`,
          options,
        )
      }
    }
  } catch (error) {
    logError("Error in JSON processing:", error.message)
    if (options.debug) {
      logDebug(error.stack, options)
    }
    process.exit(1)
  }
}

/**
 * Format a filename to be safe for the filesystem
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
function formatFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length
}

/**
 * Display summary statistics from processing
 * @param {Object} stats - Statistics object
 * @param {Object} options - Command options
 * @param {boolean} useStdout - Whether output is to stdout
 */
function displaySummary(stats, options, useStdout) {
  logIfNotQuiet("\nJSON Processing Summary:", options)
  logIfNotQuiet(`Total items processed: ${stats.totalProcessed}`, options)
  logIfNotQuiet(`  Success: ${stats.successCount}`, options)
  logIfNotQuiet(`  Errors: ${stats.errorCount}`, options)

  if (!useStdout) {
    logIfNotQuiet(`  Output: ${options.output}`, options)
  } else {
    logIfNotQuiet(`  Output: stdout`, options)
  }

  if (stats.successCount > 0) {
    const totalCompressionRatio = (stats.totalInputBytes / stats.totalOutputBytes) * 100
    const averageExpansionFactor = stats.totalOutputBytes / stats.totalInputBytes

    logIfNotQuiet(`\nTotal compressed size: ${formatBytes(stats.totalInputBytes)}`, options)
    logIfNotQuiet(`Total decompressed size: ${formatBytes(stats.totalOutputBytes)}`, options)
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
 * Sample a specified number of items from an array
 * @param {Array} items - Array of items to sample from
 * @param {number} sampleSize - Number of items to sample
 * @returns {Array} Sampled items
 */
function sampleItems(items, sampleSize) {
  if (sampleSize >= items.length) {
    return items
  }

  // Create a copy of the array to avoid modifying the original
  const itemsCopy = [...items]
  const sampledItems = []

  // Fisher-Yates shuffle algorithm + take first n elements
  for (let i = 0; i < sampleSize; i++) {
    // Generate random index between i and array length - 1
    const randomIndex = i + Math.floor(Math.random() * (itemsCopy.length - i))

    // Swap elements at positions i and randomIndex
    const temp = itemsCopy[i]
    itemsCopy[i] = itemsCopy[randomIndex]
    itemsCopy[randomIndex] = temp

    // Add the item at position i to our sampledItems
    sampledItems.push(itemsCopy[i])
  }

  return sampledItems
}
