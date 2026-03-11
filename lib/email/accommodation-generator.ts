import { readFileSync } from 'fs';
import { join } from 'path';
import translations from './accommodation-translations.json';

type Locale = 'en' | 'es' | 'pt';

interface Accommodation {
  name: string;
  details: string[];
  note?: string;
  website?: string;
  address?: string;
  distance?: string;
}

interface AccommodationTranslations {
  subject: string;
  dear: string;
  intro1: string;
  intro2: string;
  accommodationTitle: string;
  accommodations: Accommodation[];
  helpText: string;
  closing: string;
  withLove: string;
  couple: string;
  websiteLabel: string;
  directionsLabel: string;
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
    const desc = acc.details.length > 0
      ? ` <span class="accommodation-desc">— ${acc.details.join('; ')}</span>`
      : '';
    const noteHtml = acc.note
      ? `<div class="accommodation-note">${acc.note}</div>`
      : '';
    const mapsUrl = acc.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acc.address)}`
      : null;
    const nameHtml = acc.website
      ? `<a href="https://${acc.website}">${acc.name}</a>`
      : acc.name;
    const directionsHtml = mapsUrl
      ? `<p class="accommodation-links"><a href="${mapsUrl}" class="directions-link">${t.directionsLabel}</a></p>`
      : '';

    return `
      <div class="accommodation-item">
        <p class="accommodation-name">${nameHtml}${desc}</p>
        ${noteHtml}
        ${directionsHtml}
      </div>`;
  }).join('\n');

  html = html
    .replace('{{dear}}', t.dear)
    .replace('{{guestName}}', guestName)
    .replace('{{intro1}}', t.intro1)
    .replace('{{intro2}}', t.intro2)
    .replace('{{accommodationTitle}}', t.accommodationTitle)
    .replace('{{accommodationList}}', accommodationList)
    .replace('{{helpText}}', t.helpText)
    .replace('{{closing}}', t.closing)
    .replace('{{withLove}}', t.withLove)
    .replace('{{couple}}', t.couple)
    ;

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
    if (acc.address) text += `   ${t.directionsLabel}: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acc.address)}${acc.distance ? ` (${acc.distance})` : ''}\n`;
    text += '\n';
  });

  text += `${t.helpText}\n\n`;
  text += `${t.closing}\n\n`;
  text += `${t.withLove}\n${t.couple}\n\n`;
  text += `---\n`;

  return text;
}
