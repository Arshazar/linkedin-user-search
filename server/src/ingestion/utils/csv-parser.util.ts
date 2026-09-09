import * as fs from 'fs';
import * as readline from 'readline';

const GREP_PREFIX_REGEX = /^H:\\.*?\(\d+\):\s*/;
const HASH_PREFIX_REGEX = /^[a-zA-Z0-9_-]{20,30}$/;

/**
 * Strips surrounding quotes and unescapes doubled quotes.
 */
function cleanField(str: string): string {
  let s = str.trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    s = s.slice(1, -1).replace(/""/g, '"').trim();
  }
  return s;
}

/**
 * Tokenizes a single CSV record line into field values respecting:
 * - RFC 4180 double-quotes
 * - Nested Python brackets [] and braces {} without premature splitting
 */
export function tokenizeCsvLine(line: string): string[] {
  const fields: string[] = [];
  let curr: string[] = [];
  let inQuote = false;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
        curr.push('"');
        i++;
        continue;
      }
      inQuote = !inQuote;
      curr.push(ch);
    } else if (!inQuote) {
      if (ch === '[') {
        bracketDepth++;
        curr.push(ch);
      } else if (ch === ']') {
        bracketDepth = Math.max(0, bracketDepth - 1);
        curr.push(ch);
      } else if (ch === '{') {
        braceDepth++;
        curr.push(ch);
      } else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        curr.push(ch);
      } else if (ch === ',' && bracketDepth === 0 && braceDepth === 0) {
        fields.push(cleanField(curr.join('')));
        curr = [];
      } else {
        curr.push(ch);
      }
    } else {
      curr.push(ch);
    }
  }
  fields.push(cleanField(curr.join('')));
  return fields;
}

/**
 * Checks whether a line likely represents the start of a user record.
 */
function isRecordStart(line: string): boolean {
  return /^(?:[a-zA-Z0-9_-]{20,30},)?[a-zA-Z\s\.\'\-]+,[a-zA-Z\s\.\'\-]*,[a-zA-Z\s\.\'\-]*,/i.test(
    line,
  );
}

/**
 * Parses the raw LinkedIn CSV file into normalized field dictionaries.
 */
export async function parseLinkedInCsv(
  filePath: string,
): Promise<Record<string, any>[]> {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  const records: string[] = [];
  let buffer = '';
  let lineIndex = 0;

  for await (const rawLine of rl) {
    lineIndex++;
    if (!rawLine || !rawLine.trim()) continue;

    if (lineIndex === 1) {
      headers = rawLine.split(',').map((h) => h.trim());
      continue;
    }

    const cleanLine = rawLine.replace(GREP_PREFIX_REGEX, '');

    if (isRecordStart(cleanLine)) {
      if (buffer) {
        records.push(buffer);
      }
      buffer = cleanLine;
    } else if (!buffer) {
      buffer = cleanLine;
    } else {
      // Continuation line of multi-line field
      buffer += ' ' + cleanLine;
    }
  }

  if (buffer) {
    records.push(buffer);
  }

  const results: Record<string, any>[] = [];

  for (const rec of records) {
    const fields = tokenizeCsvLine(rec);

    // If an extra partition hash exists at column 0, shift it off
    if (fields.length > headers.length || (fields.length >= 70 && HASH_PREFIX_REGEX.test(fields[0]))) {
      fields.shift();
    }

    // Only include records that have sufficient columns to represent a valid user
    if (fields.length >= 40 && fields[0] && fields[0].trim().length > 0) {
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = fields[idx] !== undefined && fields[idx] !== '' ? fields[idx] : null;
      });
      results.push(rowObj);
    }
  }

  return results;
}
