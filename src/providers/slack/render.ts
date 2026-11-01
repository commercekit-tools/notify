import type { Presentation } from '../../presentation/types.js';
export const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/@/g, '＠')
    .replace(/[\r\n\u2028\u2029]/g, ' ');
export function renderSlack(p: Presentation) {
  const blocks: Record<string, unknown>[] = [
    { type: 'header', text: { type: 'plain_text', text: `${p.icon} ${p.title}`.slice(0, 150), emoji: true } },
  ];
  if (p.summary)
    blocks.push({ type: 'section', text: { type: 'plain_text', text: p.summary.slice(0, 3000), emoji: true } });
  if (p.facts.length)
    blocks.push({
      type: 'section',
      fields: p.facts.slice(0, 10).map((f) => ({
        type: 'mrkdwn',
        text: `*${esc(f.label)}*\n${esc(f.value).replace(/[*_`~]/g, '\\$&')}`,
        verbatim: true,
      })),
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
    p.facts.find((f) => ['Repository', 'Build code', 'Deployment code'].includes(f.label))?.value,
    p.actions[0]?.label && p.actions[0]?.url,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 3900);
  if (blocks.length > 50) throw new Error('Slack message exceeds the Block Kit block limit.');
  return { text: fallback, attachments: [{ color: p.accent, blocks }], unfurl_links: false, unfurl_media: false };
}
