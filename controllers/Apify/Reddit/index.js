// controllers/redditController.js

import { ApifyClient } from "apify-client";
import { decode } from "html-entities";
import { API_KEY2 } from "../constant.js";

const apifyClient = new ApifyClient({
  token: API_KEY2, // Move to .env in production
});

function stripHtml(html) {
  return html.replace(/<[^>]*>?/gm, "").trim();
}

export async function fetchApifyRedditFeed(subredditUrl, maxItems = 50) {
  try {
    // Extract subreddit name from the URL
    console.log("Reaches");
    
    const match = subredditUrl.match(/reddit\.com\/r\/([^/]+)/);
    const subreddit = match?.[1];

    if (!subreddit) {
      throw new Error("Invalid Reddit subreddit URL");
    }

    // Prepare input for the actor
    const input = {
      startUrls: [
        {
          url: `https://www.reddit.com/r/${subreddit}/`,
        },
      ],
      sort: "new", // Options: 'hot', 'new', 'top'
      maxItems,
    };

    // Run the actor
    const run = await apifyClient
      .actor("trudax/reddit-scraper-lite")
      .call(input);

    // Fetch the scraped posts from the dataset
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    // Process and return the posts
    
    console.log("POST are", items);
    const posts = items.map((item, index) => ({
      id: `${subreddit}_${index}`,
      title: item.title || "",
      description: stripHtml(decode(item.html || "")),
      date: item.date,
      url: item.url,
      media: item.image || item.video || null,
    }));
    
    return posts;
  } catch (error) {
    console.error("Error fetching Reddit posts:", error.message);
    throw new Error("Failed to fetch Reddit posts.");
  }
}
