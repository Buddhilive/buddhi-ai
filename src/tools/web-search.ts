export async function webSearch({ query }: { query: string }) {
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          `Search API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    // console.log("Search API response data:", data);

    if (data.error) {
      throw new Error(data.error);
    }

    if (data.results && data.results.length > 0) {
      // Ensure we only return top 3 results to stay within context limits
      const limitedResults = data.results.slice(0, 3);
      return JSON.stringify(limitedResults, null, 2);
    } else {
      return (
        data.message ||
        `No results found for "${query}". Please try a different search query.`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      return `An error occurred while searching: ${error.message}`;
    }

    console.error(`An unknown error occurred while searching.`, error);
    return "An unknown error occurred while searching.";
  }
}
