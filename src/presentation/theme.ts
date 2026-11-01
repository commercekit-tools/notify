import type { Status } from '../event/types.js';
export const theme: Record<
  Status,
  {
    label: string;
    icon: string;
    tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
    accent: string;
    teams: string;
  }
> = {
  started: { label: 'Started', icon: 'ℹ️', tone: 'info', accent: '#1877C9', teams: 'accent' },
  success: { label: 'Succeeded', icon: '✅', tone: 'success', accent: '#168A45', teams: 'good' },
  warning: { label: 'Completed with warnings', icon: '⚠️', tone: 'warning', accent: '#B7791F', teams: 'warning' },
  failure: { label: 'Failed', icon: '❌', tone: 'danger', accent: '#C62828', teams: 'attention' },
  'internal-error': { label: 'CommerceKit error', icon: '❌', tone: 'danger', accent: '#C62828', teams: 'attention' },
  cancelled: { label: 'Cancelled', icon: '⏹️', tone: 'neutral', accent: '#6B7280', teams: 'default' },
  'action-required': { label: 'Action required', icon: '⚠️', tone: 'warning', accent: '#B7791F', teams: 'warning' },
};
