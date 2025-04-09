/**
 * Generate random test data of specified size
 * @param {number} size - The size of data to generate
 * @returns {string} Random test data
 */
export function generateTestData(size) {
  let result = ""
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < size; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}
