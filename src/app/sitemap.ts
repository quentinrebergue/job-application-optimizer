import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/legal'

/** The pages a visitor can open without an account. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL
  return ['/', '/signup', '/login', '/privacy', '/legal', '/terms'].map((path) => ({ url: `${base}${path}` }))
}
