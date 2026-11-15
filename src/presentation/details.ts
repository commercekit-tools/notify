import {
  createActionInputContext,
  isConfidentialInputName,
  sanitizeActionText,
  validateNotificationLink,
} from '@commercekit-tools/notification-contract';
import type { NotificationStatus } from '@commercekit-tools/notification-contract';
import type { Presentation } from './types.js';

type Data = Record<string, unknown>;
type Format = (_value: unknown) => string;
export const objectValue = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};
export function confidentialValues(data: Data): string[] {
  return Object.entries(objectValue(data.inputs))
    .filter(([name, value]) => isConfidentialInputName(name) && typeof value === 'string' && value !== '[REDACTED]')
    .map(([, value]) => value as string);
}
export function safeActionLink(value: string, secrets: readonly string[]): boolean {
  try {
    validateNotificationLink(value);
    return sanitizeActionText(value, Number.MAX_SAFE_INTEGER, secrets) === value;
  } catch {
    return false;
  }
}
export function detailSections(
  status: NotificationStatus,
  data: Data,
  format: Format,
): NonNullable<Presentation['sections']> {
  const provided = objectValue(data.inputs);
  const entries = Object.entries(provided);
  const inputs: Presentation['facts'] = [];
  if (entries.length) {
    const validNames = entries.filter(([name]) => /^[a-z][a-z0-9-]{0,63}$/.test(name)).slice(0, 50);
    const snapshot = createActionInputContext(
      validNames.map(([name]) => ({ name })),
      Object.fromEntries(validNames.map(([name, value]) => [name, typeof value === 'string' ? value : ''])),
      { validated: data.inputsValidated === true },
    );
    inputs.push(
      ...Object.entries(snapshot.inputs).map(([label, value]) => ({ label, value: format(value) || 'Not included' })),
    );
    inputs.push(
      {
        label: 'Input validation',
        value:
          data.inputsValidated === true ? 'Passed' : data.inputsValidated === false ? 'Incomplete' : 'Not reported',
      },
      {
        label: 'Input truncation',
        value:
          data.inputsTruncated === true || snapshot.inputsTruncated
            ? 'Some values were truncated; review the workflow configuration.'
            : 'No input truncation reported.',
      },
    );
    if (entries.length !== validNames.length)
      inputs.push({ label: 'Input context limits', value: 'Some invalid or excess input names were omitted.' });
  } else inputs.push({ label: 'Input context', value: 'Complete input context was not included in this event.' });
  const error = objectValue(data.error);
  const issues = Array.isArray(data.issues) ? data.issues.slice(0, 3).map(objectValue) : [];
  const issueFacts: Presentation['facts'] = [
    ...(format(error.code) ? [{ label: 'Error code', value: format(error.code) }] : []),
    ...(format(error.message) ? [{ label: 'Error', value: format(error.message) }] : []),
    ...issues.map((issue, index) => ({
      label: format(issue.code) || `Issue ${index + 1}`,
      value: format(issue.message) || 'Review the workflow report.',
    })),
  ];
  if (!issueFacts.length)
    issueFacts.push({
      label: 'Details',
      value:
        status === 'success' || status === 'started'
          ? 'No issues were reported in this event.'
          : 'Review the workflow for details about this outcome.',
    });
  return [
    { title: 'Inputs', facts: inputs },
    { title: 'Issues', facts: issueFacts },
  ];
}
