/**
 * Decode base64 string to buffer
 * @param {string} base64String - Base64 encoded string
 * @returns {Buffer} Decoded data as Buffer
 */
export function decodeBase64(base64String) {
  return Buffer.from(base64String, "base64")
}

/**
 * Encode buffer to base64 string
 * @param {Buffer} buffer - Data to encode
 * @returns {string} Base64 encoded string
 */
export function encodeBase64(buffer) {
  return buffer.toString("base64")
}
