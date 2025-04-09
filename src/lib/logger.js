/**
 * Log a regular info message (only shown if not in quiet mode)
 * @param {...any} args - The message parts
 */
export function logInfo(...args) {
  console.log(...args)
}

/**
 * Log a verbose message (only shown if verbose flag is set)
 * @param {...any} args - The message parts
 * @param {Object} options - Command options
 */
export function logVerbose(...args) {
  // Last argument might be options object
  const lastArg = args[args.length - 1]

  // Check if the last argument is the options object
  if (lastArg && typeof lastArg === "object" && lastArg.verbose === true) {
    // Remove options from args before logging
    console.error(...args.slice(0, -1))
  }
}

/**
 * Log an error message (always shown)
 * @param {...any} args - The message parts
 */
export function logError(...args) {
  console.error(...args)
}

/**
 * Log a debug message (only shown if debug flag is set)
 * @param {...any} args - The message parts
 * @param {Object} options - Command options
 */
export function logDebug(...args) {
  // Last argument might be options object
  const lastArg = args[args.length - 1]

  // Check if the last argument is the options object with debug enabled
  if (lastArg && typeof lastArg === "object" && lastArg.debug === true) {
    // Remove options from args before logging
    console.error(...args.slice(0, -1))
  }
}

/**
 * Log only if not in quiet mode
 * @param {...any} args - The message parts
 * @param {Object} options - Command options
 */
export function logIfNotQuiet(...args) {
  // Last argument should be options object
  const lastArg = args[args.length - 1]

  // Check if quiet mode is disabled (verbose is true or not explicitly quiet)
  if (
    lastArg &&
    typeof lastArg === "object" &&
    (lastArg.verbose === true || lastArg.quiet !== true)
  ) {
    // Remove options from args before logging
    console.error(...args.slice(0, -1))
  }
}
