import { MetadataRoute } from 'next'
import { getCanonicalCogmitUrl } from '@/lib/utils';
import {
  COGMIT_REPO_PUBLIC,
  DEFAULT_PRODUCTION_DOMAIN,
  PATH_COGMITS_INDEX,
  REVALIDATE_INTERVAL_SITEMAP,
} from '@/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allowedUsersStr = process.env.ALLOWED_GITHUB_USERS;
  if (!allowedUsersStr) return [];
  
  const users = allowedUsersStr.split(',').map(u => u.trim()).filter(Boolean);
  
  const sitemapEntries: MetadataRoute.Sitemap = [];
  const baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || DEFAULT_PRODUCTION_DOMAIN}`;
  
  for (const ownerId of users) {
    try {
      const res = await fetch(`https://api.github.com/repos/${ownerId}/${COGMIT_REPO_PUBLIC}/contents/${PATH_COGMITS_INDEX}`, {
        next: { revalidate: REVALIDATE_INTERVAL_SITEMAP }
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      if (!data.content) continue;
      
      const index = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
      
      if (Array.isArray(index.cogmits)) {
        for (const cogmit of index.cogmits) {
          // Avoid duplicate URLs if the index is somehow malformed
          if (!sitemapEntries.some(entry => entry.url === getCanonicalCogmitUrl(baseUrl, ownerId, cogmit.cogmitId))) {
            sitemapEntries.push({
              url: getCanonicalCogmitUrl(baseUrl, ownerId, cogmit.cogmitId),
              lastModified: cogmit.publishedAt ? new Date(cogmit.publishedAt) : new Date(),
            });
          }
        }
      }
    } catch (e) {
      console.error(`Sitemap generation failed for ${ownerId}:`, e);
    }
  }
  
  return sitemapEntries;
}
