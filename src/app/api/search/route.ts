import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LANGSEARCH_API_KEY;
    
    if (!apiKey) {
      console.error("LANGSEARCH_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: 'Search service configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.langsearch.com/v1/web-search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        freshness: "noLimit",
        summary: true,
        count: 3
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Langsearch API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Langsearch API response data:", data);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];

    // Check if the response has the expected structure
    if (data.data?.webPages?.value && Array.isArray(data.data.webPages.value)) {
      // Limit to top 3 results and truncate content for context window
      const limitedResults = data.data.webPages.value.slice(0, 3);
      
      for (const page of limitedResults) {
        // Truncate summary and snippet to keep within context limits
        const snippet = page.snippet ? page.snippet.substring(0, 200) + (page.snippet.length > 200 ? '...' : '') : '';
        const summary = page.summary ? page.summary.substring(0, 300) + (page.summary.length > 300 ? '...' : '') : snippet;
        
        results.push({
          title: page.name || "Untitled",
          url: page.url || page.displayUrl || "",
          snippet: snippet,
          summary: summary,
          datePublished: page.datePublished,
          dateLastCrawled: page.dateLastCrawled,
        });
      }
    }

    if (results.length === 0) {
      console.log(`No results found for "${query}"`);
      return NextResponse.json({
        message: `No results found for "${query}". Please try a different search query.`,
        results: []
      });
    }

    return NextResponse.json({
      results: results,
      message: JSON.stringify(results, null, 2)
    });

  } catch (error) {
    console.error('Search API error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred while searching';
    
    return NextResponse.json(
      { error: `An error occurred while searching: ${errorMessage}` },
      { status: 500 }
    );
  }
}