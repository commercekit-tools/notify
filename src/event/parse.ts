import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseNotificationEventJson, type NotificationEvent } from '@commercekit-tools/notification-contract';
import { notificationError } from './validate.js';
export const MAX_EVENT_BYTES = 64 * 1024;
export async function parseEvent(source: { json?: string; file?: string }): Promise<NotificationEvent> {
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
  try {
    return parseNotificationEventJson(text, { maxBytes: MAX_EVENT_BYTES });
  } catch (error) {
    throw notificationError(error);
  }
}
