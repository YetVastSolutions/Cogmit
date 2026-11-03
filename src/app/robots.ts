import { MetadataRoute } from 'next'
import { DEFAULT_PRODUCTION_DOMAIN } from '@/constants'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || DEFAULT_PRODUCTION_DOMAIN}`;
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/login', '/auth', '/myCogs/', '/repo/', '/connect/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
