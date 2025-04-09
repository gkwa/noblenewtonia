import { createReadStream } from "fs"
import { createInterface } from "readline"

/**
 * Read a file line by line
 * @param {string} filePath - Path to the file
 * @returns {Promise<string[]>} Array of lines
 */
export async function readLineByLine(filePath) {
  const lines = []

  const fileStream = createReadStream(filePath)
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    lines.push(line)
  }

  return lines
}
