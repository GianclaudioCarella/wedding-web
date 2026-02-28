import { readFileSync } from 'fs';
import { join } from 'path';
import translations from './accommodation-translations.json';

type Locale = 'en' | 'es' | 'pt';

interface Accommodation {
  name: string;
  details: string[];
  note?: string;
  website?: string;
}

interface AccommodationTranslations {
  subject: string;
  dear: string;
  intro1: string;
  intro2: string;
  accommodationTitle: string;
  accommodations: Accommodation[];
  averageCostsTitle: string;
  averageCosts: string[];
  helpText: string;
  closing: string;
  withLove: string;
  couple: string;
  automated: string;
  questions: string;
  websiteLabel: string;
}

export function getAccommodationTranslations(locale: string): AccommodationTranslations {
  return translations[locale as Locale] || translations.en;
}

export function generateAccommodationEmailHtml(
  guestName: string,
  locale: string = 'en'
): string {
  const t = getAccommodationTranslations(locale);
  const templatePath = join(process.cwd(), 'lib', 'email', 'accommodation-template.html');
  let html = readFileSync(templatePath, 'utf-8');

  // Build accommodation list HTML
  const accommodationList = t.accommodations.map((acc) => {
    const detailItems = acc.details.map(d => `<li>${d}</li>`).join('\n        ');
    const noteHtml = acc.note
      ? `<div class="accommodation-note">${acc.note}</div>`
      : '';
    const websiteHtml = acc.website
      ? `<p class="accommodation-website">${t.websiteLabel}: <a href="https://${acc.website}">${acc.website}</a></p>`
      : '';

    return `
      <div class="accommodation-item">
        <p class="accommodation-name">${acc.name}</p>
        <ul class="accommodation-details">
          ${detailItems}
        </ul>
        ${noteHtml}
        ${websiteHtml}
      </div>`;
  }).join('\n');

  // Build average costs list HTML
  const averageCostsList = t.averageCosts
    .map(cost => `<li>${cost}</li>`)
    .join('\n        ');

  html = html
    .replace('{{dear}}', t.dear)
    .replace('{{guestName}}', guestName)
    .replace('{{intro1}}', t.intro1)
    .replace('{{intro2}}', t.intro2)
    .replace('{{accommodationTitle}}', t.accommodationTitle)
    .replace('{{accommodationList}}', accommodationList)
    .replace('{{averageCostsTitle}}', t.averageCostsTitle)
    .replace('{{averageCostsList}}', averageCostsList)
    .replace('{{helpText}}', t.helpText)
    .replace('{{closing}}', t.closing)
    .replace('{{withLove}}', t.withLove)
    .replace('{{couple}}', t.couple)
    .replace('{{automated}}', t.automated)
    .replace('{{questions}}', t.questions);

  return html;
}

export function generateAccommodationPlainText(
  guestName: string,
  locale: string = 'en'
): string {
  const t = getAccommodationTranslations(locale);

  let text = `${t.dear} ${guestName},\n\n`;
  text += `${t.intro1}\n\n`;
  text += `${t.intro2}\n\n`;
  text += `${t.accommodationTitle.toUpperCase()}\n${'─'.repeat(40)}\n\n`;

  t.accommodations.forEach((acc, i) => {
    text += `${i + 1}. ${acc.name}\n`;
    acc.details.forEach(d => { text += `   • ${d}\n`; });
    if (acc.note) text += `   ⚠ ${acc.note}\n`;
    if (acc.website) text += `   ${t.websiteLabel}: ${acc.website}\n`;
    text += '\n';
  });

  text += `${t.averageCostsTitle.toUpperCase()}\n${'─'.repeat(40)}\n`;
  t.averageCosts.forEach(cost => { text += `• ${cost}\n`; });
  text += '\n';

  text += `${t.helpText}\n\n`;
  text += `${t.closing}\n\n`;
  text += `${t.withLove}\n${t.couple}\n\n`;
  text += `---\n${t.automated}\n${t.questions}\n`;

  return text;
}
