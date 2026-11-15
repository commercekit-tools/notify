import { getNotificationStyle } from '@commercekit-tools/notification-contract';
import type { NotificationStatus } from '@commercekit-tools/notification-contract';
const providerStyle = (status: NotificationStatus) => {
  const style = getNotificationStyle(status);
  return {
    ...style,
    teams: ({ info: 'accent', success: 'good', warning: 'warning', danger: 'attention', neutral: 'default' } as const)[
      style.tone
    ],
  };
};
/** Provider-specific Teams style adapts the shared visual contract without redefining statuses. */
export const theme = {
  started: providerStyle('started'),
  success: providerStyle('success'),
  warning: providerStyle('warning'),
  failure: providerStyle('failure'),
  'internal-error': providerStyle('internal-error'),
  cancelled: providerStyle('cancelled'),
  'action-required': providerStyle('action-required'),
};
