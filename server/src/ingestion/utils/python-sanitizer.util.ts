/**
 * Converts Python stringified literals into valid JSON objects or arrays.
 * Handles:
 * - None -> null, True -> true, False -> false
 * - Single-quoted dictionaries & lists: {'key': 'val'} -> {"key": "val"}
 * - Escaped characters and apostrophes
 */
export function sanitizePythonLiteral<T = any>(raw?: string | null, defaultValue: any = []): T {
  if (!raw || typeof raw !== 'string') return defaultValue;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'None' || trimmed === 'null' || trimmed === '[]') {
    return Array.isArray(defaultValue) ? ([] as unknown as T) : defaultValue;
  }
  if (trimmed === '{}') {
    return (typeof defaultValue === 'object' && !Array.isArray(defaultValue) ? {} : defaultValue) as T;
  }

  // Fast path: try standard JSON.parse first
  try {
    return JSON.parse(trimmed) as T;
  } catch {}

  try {
    // 1. Convert Python keywords to JSON equivalents
    let sanitized = trimmed
      .replace(/\bNone\b/g, 'null')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false');

    // 2. Replace Python single-quoted string tokens with valid double-quoted JSON strings
    sanitized = sanitized.replace(/'((?:\\'|[^'])*)'/g, (_match, content: string) => {
      const unescaped = content
        .replace(/\\'/g, "'") // restore escaped single quote
        .replace(/"/g, '\\"') // escape raw double quotes
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"${unescaped}"`;
    });

    // 3. Fix potential trailing commas in arrays/objects: [1, 2,] -> [1, 2]
    sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');

    return JSON.parse(sanitized) as T;
  } catch {
    // Fallback: If it looks like a list of strings e.g. "['skill1', 'skill2']"
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const items = trimmed
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      return items as unknown as T;
    }
    return defaultValue;
  }
}

/**
 * Normalizes skills column to an array of clean string items.
 */
export function sanitizeSkills(raw?: string | null): string[] {
  const result = sanitizePythonLiteral<string[]>(raw, []);
  if (Array.isArray(result)) {
    return result
      .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter((item) => item.length > 0);
  }
  if (typeof (result as any) === 'string') {
    return [(result as unknown as string).trim()].filter(Boolean);
  }
  return [];
}
