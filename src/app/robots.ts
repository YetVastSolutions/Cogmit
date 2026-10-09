import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'cogmit.com'}`;
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/login', '/auth', '/myCogs/', '/repo/', '/connect/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
