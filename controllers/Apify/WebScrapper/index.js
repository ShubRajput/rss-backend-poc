// controllers/articleScraperController.js

import { ApifyClient } from "apify-client";
import { API_KEY2 } from "../constant.js";

const apifyClient = new ApifyClient({
  token: API_KEY2,
});

export async function fetchArticlesFromWebsite(url) {
  try {
    if (!url || !url.startsWith("http")) {
      throw new Error("Invalid or missing URL");
    }

    const input = {
      startUrls: [{ url }],
      includePageContent: true,
      maxDepth: 0,
    };

    // Use Apify's public website-content-crawler actor
    const run = await apifyClient
      .actor("apify/website-content-crawler")
      .call(input);

    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    // Map the items to extract relevant fields
    const articles = items.map((item, index) => ({
      id: index,
      title: item.metadata?.title || "",
      url: item.url,
      content: item.text || "",
    }));

    return articles;
  } catch (error) {
    console.error("Error scraping articles from website:", error.message);
    throw new Error("Failed to scrape articles from the provided website.");
  }
}
