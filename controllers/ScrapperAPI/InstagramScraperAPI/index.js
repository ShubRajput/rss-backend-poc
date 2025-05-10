// utils/instagramScraper.js
import axios from "axios";
import * as cheerio from "cheerio";

const SCRAPER_API_KEY = "065a54c0b9c5b433c19d26dff36c5704"; 

export async function fetchInstagramFeed(usernameOrUrl) {
  try {
    const profileUrl = normalizeInstagramUrl(usernameOrUrl);
    const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(
      profileUrl
    )}&render=true`;

    const { data: html } = await axios.get(targetUrl, { timeout: 60000 });
    const $ = cheerio.load(html);

    // Look for embedded JSON
    const scriptTag =
      $('script[type="application/ld+json"]').html() ||
      $('script[type="application/json"]')
        .filter((_, el) => $(el).html().includes("graphql"))
        .first()
        .html();

    if (!scriptTag) throw new Error("Could not find Instagram feed JSON.");

    const jsonData = JSON.parse(scriptTag);
    let posts = [];

    if (jsonData?.entry_data?.ProfilePage?.[0]?.graphql?.user) {
      const edges =
        jsonData.entry_data.ProfilePage[0].graphql.user
          .edge_owner_to_timeline_media.edges;
      posts = edges.map(({ node }) => ({
        image: node.thumbnail_src,
        caption: node.edge_media_to_caption.edges[0]?.node?.text || "",
        postUrl: `https://www.instagram.com/p/${node.shortcode}/`,
      }));
    } else if (jsonData?.image && jsonData?.url) {
      // fallback for LD+JSON
      posts.push({
        image: jsonData.image,
        caption: jsonData.caption || "",
        postUrl: jsonData.url,
      });
    }

    return posts;
  } catch (err) {
    console.error("Instagram Scrape Error:", err);
    return [];
  }
}

function normalizeInstagramUrl(input) {
  if (input.includes("instagram.com")) return input;
  return `https://www.instagram.com/${input.replace(/^@/, "")}/`;
}
