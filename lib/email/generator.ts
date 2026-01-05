import { readFileSync } from 'fs';
import { join } from 'path';
import translations from './translations.json';

type Locale = 'en' | 'es' | 'pt';

interface EmailTranslations {
  subject: string;
  dear: string;
  thankYou: string;
  thrilled: string;
  attending: string;
  eventDetailsTitle: string;
  date: string;
  location: string;
  whatToExpect: string;
  thanksRespond: string;
  withLove: string;
  couple: string;
  automated: string;
  questions: string;
  received: string;
}

export function getTranslations(locale: string): EmailTranslations {
  return translations[locale as Locale] || translations.en;
}

export function generateEmailHtml(
  guestName: string,
  eventDate?: string,
  eventLocation?: string,
  locale: string = 'en'
): string {
  const t = getTranslations(locale);
  const templatePath = join(process.cwd(), 'lib', 'email', 'template.html');
  let html = readFileSync(templatePath, 'utf-8');

  // Build event details section
  let eventDetails = '';
  if (eventDate || eventLocation) {
    eventDetails = `
      <div class="event-details">
        <h3>${t.eventDetailsTitle}</h3>
        ${eventDate ? `<p><strong>${t.date}:</strong> ${eventDate}</p>` : ''}
        ${eventLocation ? `<p><strong>${t.location}:</strong> ${eventLocation}</p>` : ''}
      </div>
    `;
  }

  // Replace all placeholders
  const imageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/savethedate.png`;
  
  html = html
    .replace('{{imageUrl}}', imageUrl)
    .replace('{{dear}}', t.dear)
    .replace('{{guestName}}', guestName)
    .replace('{{thankYou}}', t.thankYou)
    .replace('{{thrilled}}', t.thrilled)
    .replace('{{eventDetails}}', eventDetails)
    .replace('{{whatToExpect}}', t.whatToExpect)
    .replace('{{thanksRespond}}', t.thanksRespond)
    .replace('{{withLove}}', t.withLove)
    .replace('{{couple}}', t.couple)
    .replace('{{automated}}', t.automated)
    .replace('{{questions}}', t.questions)
    .replace('{{received}}', t.received);

  return html;
}

export function generatePlainTextEmail(
  guestName: string,
  eventDate?: string,
  eventLocation?: string,
  locale: string = 'en'
): string {
  const t = getTranslations(locale);
  
  let message = `${t.dear} ${guestName},\n\n`;
  
  message += `${t.thankYou}\n\n`;
  message += `${t.thrilled}\n\n`;
  message += `Status: ${t.attending}\n\n`;
  
  if (eventDate || eventLocation) {
    message += `${t.eventDetailsTitle.toUpperCase()}\n`;
    if (eventDate) message += `${t.date}: ${eventDate}\n`;
    if (eventLocation) message += `${t.location}: ${eventLocation}\n`;
    message += `\n`;
  }
  
  message += `${t.whatToExpect}\n\n`;
  message += `${t.thanksRespond}\n\n`;
  
  message += `${t.withLove}\n`;
  message += `${t.couple}\n\n`;
  message += `---\n`;
  message += `${t.automated}\n`;
  message += `${t.questions}\n`;
  message += `${t.received}\n`;

  return message;
}
