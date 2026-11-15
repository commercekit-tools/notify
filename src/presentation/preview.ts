import { isConfidentialInputName, sanitizeActionText } from '@commercekit-tools/notification-contract';
import { safeActionLink } from './details.js';
import type { Presentation } from './types.js';

/** Provider display budget; preserve every field name and explicitly mark shortened values. */
export function previewPresentation(source: Presentation, maximum: number): Presentation {
  const secrets = [
    ...source.highlights,
    ...source.facts,
    ...(source.sections ?? []).flatMap((section) => section.facts),
  ]
    .filter(({ label, value }) => isConfidentialInputName(label) && value !== '[REDACTED]')
    .map(({ value }) => value);
  let limited = false;
  const text = (value: string, bound = maximum) => {
    const characters = [...sanitizeActionText(value, Number.MAX_SAFE_INTEGER, secrets)];
    const ending = '… [truncated]';
    if (characters.length <= bound) return characters.join('');
    limited = true;
    return `${characters.slice(0, bound - ending.length).join('')}${ending}`;
  };
  const facts = (values: Presentation['facts']) =>
    values.map(({ label, value }) => ({
      label: text(label, 100),
      value: isConfidentialInputName(label) ? '[REDACTED]' : text(value),
    }));
  const output = {
    ...source,
    category: text(source.category, 100),
    title: text(source.title, 120),
    summary: source.summary ? text(source.summary, Math.min(1000, maximum * 4)) : undefined,
    highlights: facts(source.highlights),
    actions: source.actions
      .filter((action) => safeActionLink(action.url, secrets))
      .map((action) => ({ label: text(action.label, 75), url: action.url })),
    facts: facts(source.facts),
    ...(source.sections
      ? {
          sections: source.sections.map((section) => ({
            title: text(section.title, 100),
            facts: facts(section.facts),
          })),
        }
      : {}),
    footer: source.footer ? text(source.footer, 256) : undefined,
  };
  if (limited)
    output.footer = `${output.footer ? `${output.footer} · ` : ''}⚠️ Display values were truncated; review the workflow report.`;
  return output;
}
