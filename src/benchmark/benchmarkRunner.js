/**
 * Benchmark a function
 * @param {Function} fn - The function to benchmark
 * @param {string} name - The name of the benchmark
 * @param {number} iterations - Number of iterations
 * @returns {Object} Benchmark results
 */
export const benchmark = (fn, name, iterations = 10) => {
  console.log(`Running ${name} benchmark...`)

  const times = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    times.push(end - start)

    // Return the result from the last iteration
    if (i === iterations - 1) {
      return {
        result,
        stats: calculateStats(times, name),
      }
    }
  }
}

/**
 * Calculate statistics from benchmark times
 * @param {number[]} times - Array of execution times
 * @param {string} name - The name of the benchmark
 * @returns {Object} Statistics object
 */
function calculateStats(times, name) {
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  console.log(
    `${name}: Avg: ${avg.toFixed(2)}ms, Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`,
  )

  return { avg, min, max }
}
