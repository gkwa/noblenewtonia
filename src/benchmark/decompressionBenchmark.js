import { inflate, inflateRaw, ungzip } from "pako"
import { benchmark } from "./benchmarkRunner.js"

/**
 * Run all decompression benchmarks
 * @param {string} smallData - Small test data
 * @param {string} mediumData - Medium test data
 * @param {string} largeData - Large test data
 * @param {Object} compressionResults - Results from compression benchmarks
 * @returns {Object} Decompression results
 */
export async function runDecompressionBenchmarks(
  smallData,
  mediumData,
  largeData,
  compressionResults,
) {
  // Run small data decompression benchmarks
  const smallResults = await runDecompressionBenchmarkSuite(compressionResults.small, "Small Data")

  // Run medium data decompression benchmarks
  const mediumResults = await runDecompressionBenchmarkSuite(
    compressionResults.medium,
    "Medium Data",
  )

  // Run large data decompression benchmarks
  const largeResults = await runDecompressionBenchmarkSuite(compressionResults.large, "Large Data")

  return {
    small: smallResults,
    medium: mediumResults,
    large: largeResults,
  }
}

/**
 * Run decompression benchmarks for a specific data size
 * @param {Object} compressedData - Compressed data from previous benchmarks
 * @param {string} sizeLabel - Label for the data size
 * @returns {Object} Decompression results
 */
async function runDecompressionBenchmarkSuite(compressedData, sizeLabel) {
  const inflateResult = benchmark(() => inflate(compressedData.deflate), `${sizeLabel} Inflate`)

  const inflateRawResult = benchmark(
    () => inflateRaw(compressedData.deflateRaw),
    `${sizeLabel} InflateRaw`,
  )

  const ungzipResult = benchmark(() => ungzip(compressedData.gzip), `${sizeLabel} Ungzip`)

  return {
    inflate: inflateResult.stats,
    inflateRaw: inflateRawResult.stats,
    ungzip: ungzipResult.stats,
  }
}
