import { deflate, deflateRaw, gzip } from "pako"
import { benchmark } from "./benchmarkRunner.js"

/**
 * Run all compression benchmarks
 * @param {string} smallData - Small test data
 * @param {string} mediumData - Medium test data
 * @param {string} largeData - Large test data
 * @returns {Object} Compression results
 */
export async function runCompressionBenchmarks(smallData, mediumData, largeData) {
  // Run small data compression benchmarks
  const smallResults = await runCompressionBenchmarkSuite(smallData, "Small Data")

  // Run medium data compression benchmarks
  const mediumResults = await runCompressionBenchmarkSuite(mediumData, "Medium Data")

  // Run large data compression benchmarks
  const largeResults = await runCompressionBenchmarkSuite(largeData, "Large Data")

  return {
    small: smallResults,
    medium: mediumResults,
    large: largeResults,
  }
}

/**
 * Run compression benchmarks for a specific data size
 * @param {string} data - Test data
 * @param {string} sizeLabel - Label for the data size
 * @returns {Object} Compression results
 */
async function runCompressionBenchmarkSuite(data, sizeLabel) {
  const deflateResult = benchmark(() => deflate(data), `${sizeLabel} Deflate`)

  const deflateRawResult = benchmark(() => deflateRaw(data), `${sizeLabel} DeflateRaw`)

  const gzipResult = benchmark(() => gzip(data), `${sizeLabel} Gzip`)

  return {
    deflate: deflateResult.result,
    deflateRaw: deflateRawResult.result,
    gzip: gzipResult.result,
    stats: {
      deflate: deflateResult.stats,
      deflateRaw: deflateRawResult.stats,
      gzip: gzipResult.stats,
    },
  }
}
