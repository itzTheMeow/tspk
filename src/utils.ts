/**
 * Evens out strings so they look like this:
 *
 * text             this
 * text 2           side
 * super long text  is
 * short text       even
 *
 * @param strings Array of strings to even out.
 * @param padding Padding between left and right of longest string. (default: 2)
 * @returns Array of even strings.
 */
export function evenTable(strings: string[][], padding = 2): string[] {
  const maxLen = [...strings].sort((a, b) => b[0].length - a[0].length)[0][0].length;
  return strings.map(
    (str) => str[0].trim() + " ".repeat(maxLen - str[0].length + padding) + str[1].trim()
  );
}
