import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../schema/notification-event-v1.schema.json' with { type: 'json' };
import type { NotificationEvent } from './types.js';
const ajv = new Ajv2020.default({ allErrors: true, strict: false, validateFormats: true });
addFormats.default(ajv);
const validator = ajv.compile(schema);
export function validateEvent(value: unknown): asserts value is NotificationEvent {
  if (
    value &&
    typeof value === 'object' &&
    'schemaVersion' in value &&
    (value as { schemaVersion: unknown }).schemaVersion !== 1
  )
    throw new Error(
      `NotificationEvent schema version ${String((value as { schemaVersion: unknown }).schemaVersion)} is not supported by CommerceKit Notifications v1.`,
    );
  if (!validator(value)) {
    const issue = validator.errors?.[0];
    const path = issue?.instancePath ?? '';
    const keyword = issue?.keyword ?? 'invalid value';
    const typePath = path === '/status' ? ' (eventType/status combination)' : '';
    throw new Error(`Invalid NotificationEvent${path ? ` at ${path}` : ''}: ${keyword}${typePath}.`);
  }
  const event = value as NotificationEvent;
  const allowed: Record<string, string[]> = {
    'check.completed': ['success', 'warning', 'failure', 'cancelled', 'internal-error'],
    'ccv2.build.started': ['started'],
    'ccv2.build.completed': ['success', 'failure', 'cancelled', 'internal-error'],
    'ccv2.deployment.started': ['started'],
    'ccv2.deployment.action-required': ['action-required'],
    'ccv2.deployment.completed': ['success', 'failure', 'cancelled', 'internal-error'],
  };
  if (!allowed[event.eventType]?.includes(event.status))
    throw new Error('Invalid NotificationEvent eventType/status combination.');
  for (const link of event.links ?? []) validateSafeUrl(link.url, 'NotificationEvent links');
  const context = event.context as Record<string, unknown> | undefined;
  if (typeof context?.runUrl === 'string') validateSafeUrl(context.runUrl, 'context.runUrl');
}

export function validateSafeUrl(value: string, field: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash || value.length > 2048)
    throw new Error(`${field} must be a bounded HTTPS URL without credentials or fragments.`);
  return url;
}
