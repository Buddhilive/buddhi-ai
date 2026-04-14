import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/chat/*'],
            },
        ],
        sitemap: 'https://ai.buddhilive.com/sitemap.xml',
        host: 'https://ai.buddhilive.com',
    }
}