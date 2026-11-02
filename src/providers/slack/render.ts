import type { Presentation } from '../../presentation/types.js';
export const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/@/g, '＠')
    .replace(/[\r\n\u2028\u2029]/g, ' ');
const field = (f: { label: string; value: string }) => ({
  type: 'mrkdwn',
  text: `*${esc(f.label)}*\n${escapeMrkdwn(esc(f.value))}`.slice(0, 2000),
  verbatim: true,
});
export function renderSlack(p: Presentation) {
  const lead = [
    {
      type: 'context',
      elements: [{ type: 'plain_text', text: `${p.category} · ${p.statusLabel}`.slice(0, 300), emoji: false }],
    },
  ];
  const blocks: Record<string, unknown>[] = [
    { type: 'header', text: { type: 'plain_text', text: `${p.icon} ${p.title}`.slice(0, 150), emoji: true } },
  ];
  if (p.highlights.length) blocks.push({ type: 'section', fields: p.highlights.slice(0, 2).map(field) });
  if (p.highlights.length && (p.summary || p.facts.length)) blocks.push({ type: 'divider' });
  if (p.summary)
    blocks.push({ type: 'section', text: { type: 'plain_text', text: p.summary.slice(0, 3000), emoji: true } });
  if (p.facts.length)
    blocks.push({
      type: 'section',
      fields: p.facts.slice(0, 10).map(field),
    });
  if (p.actions.length)
    blocks.push({
      type: 'actions',
      elements: p.actions.slice(0, 3).map((a, i) => ({
        type: 'button',
        text: { type: 'plain_text', text: a.label.slice(0, 75) },
        url: a.url,
        action_id: `notification_action_${i}`,
      })),
    });
  if (p.footer)
    blocks.push({ type: 'context', elements: [{ type: 'plain_text', text: p.footer.slice(0, 500), emoji: true }] });
  const fallback = [
    p.statusLabel,
    p.title,
    p.highlights.find((f) => f.label !== 'Occurred')?.value,
    p.actions[0]?.label && p.actions[0]?.url,
    p.summary,
  ]
    .filter(Boolean)
    .join(' · ');
  const safeFallback = escapeMrkdwn(esc(fallback));
  if (blocks.length + lead.length > 50) throw new Error('Slack message exceeds the Block Kit block limit.');
  return {
    text: safeFallback.length > 3900 ? `${safeFallback.slice(0, 3899)}…` : safeFallback,
    mrkdwn: false,
    blocks: lead,
    attachments: [{ color: p.accent, blocks }],
    unfurl_links: false,
    unfurl_media: false,
  };
}

function escapeMrkdwn(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/([*_`~])/g, '\\$1');
}
