import axios from 'axios';
import { NextRequest } from 'next/server';
import { Node } from '@/types'
import { getCommonKeywords } from '@/utils/keywordUtils';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID!;
const GOOGLE_SEARCH_URL = process.env.GOOGLE_SEARCH_URL!;

export async function GET(req: NextRequest, res: any) {
  try {
    const query = req.nextUrl.searchParams.get('query')
    if (!query) return res.status(400).json({ message: 'Query error' });
    
    const perPage = 10
    const MAX_RESULTS = 8;

    const params = {
      key: GOOGLE_API_KEY,
      cx: SEARCH_ENGINE_ID,
      q: query,
      num: perPage.toString()
    };

    const results = []

    for (let start = 1; start <= MAX_RESULTS; start += perPage) {
      const paginatedParams = {
        ...params,
        start: start.toString(), 
      }

      const fullUrl = `${GOOGLE_SEARCH_URL}?${new URLSearchParams(paginatedParams).toString()}`
      console.debug('Fetching URL:', fullUrl);

      const response = await axios(fullUrl)

      if (response.status !== 200 || !response.data.items) break;
      
      console.info('response ', response.data.items)
      results.push(...response.data.items);
      if (response.data.items.length < 10) break; // Stop if fewer results are returned
    }

    const nodes:Node[] = results.map((item: { [x: string]: string; }, index: number) => (
      {
        "id": index.toString(),
        "title": item["title"],
        "description": item["snippet"],
        "link": item["link"],
        "image": item?.['pagemap']?.['cse_thumbnail']?.[0]?.src || undefined,
        keywords: getCommonKeywords(item['title'], item['link']),
        visible: true, // overwritten
        depth: 0 // overwritten
      }));
    console.info('aggregated nodes ', nodes)

    return Response.json({"nodes": nodes})
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ message: 'Search failed' });
  }
}