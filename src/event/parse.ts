import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateEvent } from './validate.js';
export const MAX_EVENT_BYTES = 64 * 1024;
export async function parseEvent(source: { json?: string; file?: string }): Promise<Record<string, unknown>> {
  if (Boolean(source.json) === Boolean(source.file)) throw new Error('Supply exactly one of event-json or event-file.');
  let text: string;
  if (source.file) {
    const path = resolve(source.file);
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error('event-file must be a regular non-symbolic-link file.');
    if (stat.size > MAX_EVENT_BYTES) throw new Error('event-file exceeds the 64 KiB limit.');
    text = await readFile(path, 'utf8');
  } else text = source.json!;
  if (Buffer.byteLength(text, 'utf8') > MAX_EVENT_BYTES) throw new Error('Event JSON exceeds the 64 KiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Event input is not valid JSON.');
  }
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error('Event input must be one JSON object.');
  validateEvent(value);
  return value as Record<string, unknown>;
}
