export type Provider = 'slack' | 'teams-workflow';
export type Status = 'started' | 'success' | 'warning' | 'failure' | 'cancelled' | 'internal-error' | 'action-required';
export type EventType =
  | 'check.completed'
  | 'ccv2.build.started'
  | 'ccv2.build.completed'
  | 'ccv2.deployment.started'
  | 'ccv2.deployment.action-required'
  | 'ccv2.deployment.completed';
export type SourceComponent = 'cli-check' | 'ccv2-build' | 'ccv2-deploy' | 'workflow';
export interface SafeError {
  code?: string;
  message: string;
}
export interface NotificationEvent {
  schemaVersion: 1;
  eventId: string;
  eventType: EventType;
  status: Status;
  occurredAt: string;
  source: { product: 'commercekit'; component: SourceComponent; version?: string };
  context?: Record<string, unknown>;
  data: Record<string, unknown>;
  links?: { label: string; url: string }[];
  [key: string]: unknown;
}
