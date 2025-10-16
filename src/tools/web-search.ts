export async function webSearch({query}: {query: string}) {
  try {
    const url = new URL("https://api.duckduckgo.com/");
    url.searchParams.append("q", query);
    url.searchParams.append("format", "json");
    url.searchParams.append("no_html", "1");
    url.searchParams.append("skip_disambig", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Buddhilive-WebSearch/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `DuckDuckGo API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as any;
    console.log("DuckDuckGo API response data:", data);

    const results: any[] = [];

    if (data.AbstractText) {
      /* results.push({
        title: data.Heading || "DuckDuckGo Instant Answer",
        url: data.AbstractURL || "https://duckduckgo.com",
        snippet: data.AbstractText,
      }); */
      console.log(`No results found for "${query}"`);
      return `No results found for "${query}". Try searching on https://duckduckgo.com/?q=${encodeURIComponent(
        query
      )}`;
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(" - ")[0] || "Related Topic",
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    if (results.length === 0) {
      console.log(`No results found for "${query}"`);
      return `No results found for "${query}". Try searching on https://duckduckgo.com/?q=${encodeURIComponent(
        query
      )}`;
    }

    return JSON.stringify(results, null, 2);
  } catch (error) {
    if (error instanceof Error) {
      return `An error occurred while searching: ${error.message}`;
    }

    console.error(`An unknown error occurred while searching.`, error);
    return "An unknown error occurred while searching.";
  }
}
