import type { Status } from '../event/types.js';
export interface Presentation {
  title: string;
  status: Status;
  statusLabel: string;
  icon: string;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  accent: string;
  summary?: string;
  facts: { label: string; value: string }[];
  actions: { label: string; url: string }[];
  footer?: string;
}
