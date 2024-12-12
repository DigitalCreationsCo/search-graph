import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const customsearch = google.customsearch('v1');
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
// const GOOGLE_SEARCH_URL = process.env.GOOGLE_SEARCH_URL;

export async function GET(req: NextRequest, res: any) {
  try {
    const query = req.nextUrl.searchParams.get('query')
    if (!query) return res.status(400).json({ message: 'Query error' });
    
    const response = await customsearch.cse.list({
      auth: GOOGLE_API_KEY,
      cx: SEARCH_ENGINE_ID,
      q: query,
      num: 10 
    });

    if (response.status !== 200)
      throw new Error("Failed to fetch search results");

    const results = await response.data!.items!
    const nodes = results.map((item, index: number) => (
      {
          "id": index,
          "title": item["title"],
          "description": item["snippet"],
          "link": item["link"],
          "image": item?.['pagemap']?.['cse_thumbnail']?.[0]?.src || ""
      }));

    return Response.json({"nodes": nodes})
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ message: 'Search failed' });
  }
}