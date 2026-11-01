import { Buffer } from 'node:buffer';
import type { Presentation } from '../../presentation/types.js';
export const TEAMS_MAX_BYTES = 27 * 1024;
export function renderTeams(p: Presentation) {
  const body: Record<string, unknown>[] = [
    {
      type: 'Container',
      style: (
        { info: 'accent', success: 'good', warning: 'warning', danger: 'attention', neutral: 'default' } as const
      )[p.tone],
      items: [
        { type: 'TextBlock', text: `${p.icon} ${p.statusLabel}`, weight: 'Bolder', wrap: true },
        { type: 'TextBlock', text: p.title, weight: 'Bolder', size: 'Medium', wrap: true },
      ],
    },
  ];
  if (p.summary) body.push({ type: 'TextBlock', text: p.summary, wrap: true });
  if (p.facts.length)
    body.push({ type: 'FactSet', facts: p.facts.slice(0, 10).map((f) => ({ title: f.label, value: f.value })) });
  if (p.footer) body.push({ type: 'TextBlock', text: p.footer, isSubtle: true, size: 'Small', wrap: true });
  if (p.actions.length)
    body.push({
      type: 'ActionSet',
      actions: p.actions.slice(0, 3).map((a) => ({ type: 'Action.OpenUrl', title: a.label, url: a.url })),
    });
  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body,
        },
      },
    ],
  };
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > TEAMS_MAX_BYTES)
    throw new Error('Teams Workflow card exceeds the 27 KiB safety limit.');
  return payload;
}
