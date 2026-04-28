/**
 * JSON parsing utilities for LLM responses that may be wrapped in markdown.
 *
 * Handles common LLM output formats:
 * - Markdown code blocks: ```json\n...\n```
 * - Plain JSON with whitespace
 * - Mixed content (extracts JSON from prose)
 */

/**
 * Unwrap JSON from markdown code blocks or mixed content.
 * Returns the extracted JSON string ready for parsing.
 */
export function unwrapMarkdownJson(text: string): string {
  // Fast path: try direct parse format
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Detect markdown code blocks: ```json\n...\n``` or ```\n...\n```
  const markdownMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (markdownMatch) {
    return markdownMatch[1].trim();
  }

  // Fallback: extract JSON object/array with regex
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // No JSON found - return original (will fail parse with descriptive error)
  return text;
}

/**
 * Safe JSON parse with automatic markdown unwrapping.
 * Throws standard JSON parse error if unwrapped text is not valid JSON.
 *
 * @example
 * // Handles markdown-wrapped JSON
 * parseJsonWithUnwrap('```json\n{"key": "value"}\n```')
 * // Returns: { key: "value" }
 *
 * @example
 * // Handles plain JSON
 * parseJsonWithUnwrap('{"key": "value"}')
 * // Returns: { key: "value" }
 */
export function parseJsonWithUnwrap<T = any>(text: string): T {
  const unwrapped = unwrapMarkdownJson(text);
  return JSON.parse(unwrapped);
}
