/**
 * Flag parsing module - CLI argument parsing utilities
 */

/**
 * Filter out flags from positional arguments
 */
export function filterFlags(args: string[]): string[] {
  return args.filter(arg => !arg.startsWith("--"));
}

/**
 * Get positional argument at index (0-based, after filtering flags)
 */
export function getPositionalArg(index: number): string | undefined {
  const args = filterFlags(process.argv.slice(2));
  return args[index];
}

/**
 * Get numeric flag value
 */
export function getNumericFlag(flag: string, defaultValue: number): number {
  const match = process.argv.find(arg => arg.startsWith(`--${flag}=`));
  if (match) {
    const value = parseInt(match.split("=")[1]);
    return isNaN(value) ? defaultValue : value;
  }
  return defaultValue;
}

/**
 * Get string flag value
 */
export function getStringFlag(flag: string, defaultValue?: string): string | undefined {
  const match = process.argv.find(arg => arg.startsWith(`--${flag}=`));
  if (match) {
    return match.split("=")[1];
  }
  return defaultValue;
}

/**
 * Check if flag is present
 */
export function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}
