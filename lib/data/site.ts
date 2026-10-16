import { serviceDb } from './client'

/** Public site content of one wedding, as shown on a guest's invite page. */
export async function getPublicSiteData(weddingId: string) {
  const [transport, externalAccommodations, content, registry, faqs] = await Promise.all([
    serviceDb
      .from('transport_options')
      .select('id, name, direction, departure_location, departure_time, capacity, notes')
      .eq('wedding_id', weddingId)
      .eq('is_active', true)
      .order('sort_order'),
    serviceDb
      .from('external_accommodations')
      .select('id, name, description, url, directions_url, distance_from_venue')
      .eq('wedding_id', weddingId)
      .eq('is_active', true)
      .order('sort_order'),
    serviceDb.from('site_content').select('key, value').eq('wedding_id', weddingId),
    serviceDb
      .from('registry_items')
      .select('id, title, description, url, store_name, price, currency')
      .eq('wedding_id', weddingId)
      .eq('is_active', true)
      .eq('is_claimed', false)
      .order('sort_order'),
    serviceDb
      .from('faq_items')
      .select('id, question, answer, sort_order')
      .eq('wedding_id', weddingId)
      .eq('is_active', true)
      .order('sort_order'),
  ])

  const contentMap: Record<string, string> = {}
  for (const row of content.data ?? []) contentMap[row.key] = row.value || ''

  return {
    transport: transport.data ?? [],
    externalAccommodations: externalAccommodations.data ?? [],
    content: contentMap,
    registry: registry.data ?? [],
    faqs: faqs.data ?? [],
  }
}
