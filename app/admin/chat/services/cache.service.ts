// Cache service for query normalization and hashing

/**
 * Normalize query for better cache matching (works for PT, EN, and ES)
 * Removes stopwords, punctuation, and sorts words alphabetically
 */
export const normalizeQueryForCache = (query: string): string => {
  // Stopwords in Portuguese, English, and Spanish
  const stopwords = new Set([
    // Portuguese
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem',
    'é', 'são', 'está', 'estão', 'foi', 'eram', 'ser', 'estar',
    'qual', 'quais', 'como', 'onde', 'quando', 'que', 'quem',
    'este', 'esse', 'aquele', 'isso', 'isto', 'aquilo',
    'me', 'te', 'se', 'lhe', 'nos', 'vos', 'lhes',
    // English
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'what', 'which', 'how', 'where', 'when', 'who', 'whom',
    'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'my', 'your', 'his', 'her', 'its', 'our', 'their',
    // Spanish
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'al', 'en', 'con', 'sin', 'por', 'para',
    'es', 'son', 'está', 'están', 'fue', 'fueron', 'ser', 'estar',
    'cuál', 'cuáles', 'cómo', 'dónde', 'cuándo', 'qué', 'quién', 'quiénes',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
    'aquel', 'aquella', 'aquellos', 'aquellas', 'esto', 'eso', 'aquello',
    'me', 'te', 'se', 'le', 'nos', 'os', 'les',
    'mi', 'tu', 'su', 'mis', 'tus', 'sus',
  ]);

  return query
    .toLowerCase()
    .trim()
    // Remove punctuation
    .replace(/[.,!?;:¿¡"""''()[\]{}]/g, '')
    // Split into words
    .split(/\s+/)
    // Remove stopwords
    .filter(word => word.length > 2 && !stopwords.has(word))
    // Sort alphabetically for consistent ordering
    .sort()
    // Join back
    .join(' ');
};

/**
 * Generate SHA-256 hash from string
 */
export const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
