export type Locale = 'en' | 'pt' | 'es';

export const locales: Locale[] = ['en', 'pt', 'es'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
