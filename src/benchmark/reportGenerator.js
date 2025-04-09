/**
 * Log compression ratios
 * @param {string} smallData - Small test data
 * @param {string} mediumData - Medium test data
 * @param {string} largeData - Large test data
 * @param {Object} compressionResults - Results from compression benchmarks
 */
export function logCompressionRatios(smallData, mediumData, largeData, compressionResults) {
  logCompressionRatio("Small Data", smallData, compressionResults.small)

  logCompressionRatio("Medium Data", mediumData, compressionResults.medium)

  logCompressionRatio("Large Data", largeData, compressionResults.large)
}

/**
 * Log compression ratio for a specific data size
 * @param {string} label - Size label
 * @param {string} data - Original data
 * @param {Object} compressionResult - Compression results for this data
 */
function logCompressionRatio(label, data, compressionResult) {
  const deflateRatio = ((compressionResult.deflate.length / data.length) * 100).toFixed(2)
  const deflateRawRatio = ((compressionResult.deflateRaw.length / data.length) * 100).toFixed(2)
  const gzipRatio = ((compressionResult.gzip.length / data.length) * 100).toFixed(2)

  console.log(
    `${label}: Deflate ${deflateRatio}%, DeflateRaw ${deflateRawRatio}%, Gzip ${gzipRatio}%`,
  )
}
