import { validateNotificationEvent, type NotificationEvent } from '@commercekit-tools/notification-contract';

// This adapter owns diagnostic wording only. The package owns all validation.
export function validateEvent(value: unknown): asserts value is NotificationEvent {
  try {
    validateNotificationEvent(value);
  } catch (error) {
    throw notificationError(error);
  }
}

export function notificationError(error: unknown): Error {
  const message = error instanceof Error ? error.message : '';
  if (message === 'NotificationEvent exceeds byte limit.') return new Error('Event JSON exceeds the 64 KiB limit.');
  if (message === 'Invalid NotificationEvent JSON.') return new Error('Event input is not valid JSON.');
  if (message === 'Invalid notification HTTPS link.')
    return new Error(
      'NotificationEvent links and context.runUrl must be bounded HTTPS URLs without credentials or fragments.',
    );
  return new Error(
    'Invalid NotificationEvent v1 JSON object: check schema version, data and eventType/status combination.',
  );
}
