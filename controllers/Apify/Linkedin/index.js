import { ApifyClient } from "apify-client";
import { API_KEY2 } from "../constant.js";

const apifyClient = new ApifyClient({
  token: API_KEY2,
});

export async function fetchApifyLinkedInFeed(url) {
  try {
    if (!url || !url.includes('linkedin.com/company/')) {
      throw new Error('Invalid LinkedIn company URL');
    }

    const companyMatch = url.match(/linkedin\.com\/company\/([^/?]+)/);
    const company = companyMatch?.[1];
    if (!company) {
      throw new Error('Could not extract company name');
    }

    console.log('Extracted company:', company);

    const run = await apifyClient.actor('scraping_ronin/linkedin-fast-profile-scraper').call({
      companyUrls: [`https://www.linkedin.com/company/${company}/`],
      resultsLimit: 10,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    const posts = items.map(post => ({
      id: post.url,
      content: post.content,
      date: post.date,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      url: post.url,
    }));

    return posts;
  } catch (error) {
    console.error('LinkedIn scraping failed:', error.message);
    throw new Error('Failed to fetch LinkedIn feed.');
  }
}

