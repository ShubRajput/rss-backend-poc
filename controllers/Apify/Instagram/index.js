// controllers/instagramController.js

import { ApifyClient } from "apify-client";
import { API_KEY2 } from "../constant.js";

const apifyClient = new ApifyClient({
  token: API_KEY2,
});

export async function fetchApifyInstagramFeed(url) {
  try {
    if (!url || !url.includes("instagram.com")) {
      throw new Error("Invalid Instagram URL");
    }

    // Extract the username
    const usernameMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    const username = usernameMatch?.[1];
    if (!username) {
      throw new Error("Could not extract Instagram username");
    }

    console.log("Username extracted:", username);

    // ✅ This is the correct input format
    const run = await apifyClient.actor("apify/instagram-profile-scraper").call({
      usernames: [username],      // ← REQUIRED FIELD
      resultsLimit: 12,
      scrapePosts: true,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    const posts = items.flatMap(profile =>
      (profile?.latestPosts || []).map(post => ({
        id: post.id,
        username: profile.username,
        image: post.displayUrl,
        caption: post.caption,
        likes: post.likesCount,
        comments: post.commentsCount,
        timestamp: post.timestamp,
        url: `https://www.instagram.com/p/${post.shortCode}/`,
      }))
    );

    return posts;
  } catch (error) {
    console.error("Instagram scraping failed:", error.message);
    throw new Error("Failed to fetch Instagram feed.");
  }
}
