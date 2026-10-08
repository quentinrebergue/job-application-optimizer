import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/legal'

/** Crawlers may read the public pages; the signed-in app and the API are not for them. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/jobs', '/entities', '/resume', '/ui', '/verify-email', '/reset-password'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
