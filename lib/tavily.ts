// Small client for the Tavily web search API

const TAVILY_URL = "https://api.tavily.com";

export type SearchResult = { title: string; url: string; content: string };
export type PageContent = { url: string; content: string };

async function callTavily<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TAVILY_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000), // give up after 20 seconds
  });

  if (!res.ok) {
    throw new Error(`Tavily ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

// Searches the web (costs 1 Tavily credit)
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const data = await callTavily<{
    results?: { title?: string; url?: string; content?: string }[];
  }>("/search", {
    query,
    search_depth: "basic",
    max_results: 8,
  });

  return (data.results ?? [])
    .filter((result) => Boolean(result.url))
    .map((result) => ({
      title: String(result.title ?? ""),
      url: String(result.url),
      content: String(result.content ?? "").slice(0, 300),
    }));
}

// Reads the text of up to 5 web pages (costs 1 Tavily credit)
export async function extractPages(urls: string[]): Promise<PageContent[]> {
  const data = await callTavily<{
    results?: { url?: string; raw_content?: string }[];
  }>("/extract", {
    urls,
    extract_depth: "basic",
  });

  return (data.results ?? [])
    .filter((result) => Boolean(result.url))
    .map((result) => ({
      url: String(result.url),
      content: String(result.raw_content ?? "").replace(/\s+/g, " ").slice(0, 2500),
    }));
}