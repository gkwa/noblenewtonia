import { runCompressionBenchmarks } from "./compressionBenchmark.js"
import { runDecompressionBenchmarks } from "./decompressionBenchmark.js"
import { generateTestData } from "./testDataGenerator.js"
import { logCompressionRatios } from "./reportGenerator.js"

async function runBenchmarks() {
  console.log("Generating test data...")
  const smallData = generateTestData(10_000)
  const mediumData = generateTestData(100_000)
  const largeData = generateTestData(1_000_000)

  console.log("\nCompression Benchmarks:")
  const compressionResults = await runCompressionBenchmarks(smallData, mediumData, largeData)

  console.log("\nDecompression Benchmarks:")
  const decompressionResults = await runDecompressionBenchmarks(
    smallData,
    mediumData,
    largeData,
    compressionResults,
  )

  console.log("\nCompression Ratios:")
  logCompressionRatios(smallData, mediumData, largeData, compressionResults)
}

runBenchmarks().catch(console.error)
