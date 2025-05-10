import axios from "axios";
import * as cheerio from "cheerio";

const SCRAPER_API_KEY = "065a54c0b9c5b433c19d26dff36c5704";

export async function fetchArticlesUsingScraperAPI(baseUrl) {
  try {
    const encodedUrl = encodeURIComponent(baseUrl);
    const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodedUrl}&render=true`;

    const { data: html } = await axios.get(targetUrl, { timeout: 60000 });

    const $ = cheerio.load(html);
    const articlesMap = new Map();

    $("a").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      const img = $(el).find("img").attr("src") || null;

      if (!text || text.length < 15 || !href) return;

      let absoluteUrl = href;
      try {
        absoluteUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).href;
      } catch (e) {
        return;
      }

      if (!articlesMap.has(absoluteUrl)) {
        articlesMap.set(absoluteUrl, {
          title: text,
          url: absoluteUrl,
          image: img,
        });
      }
    });

    return Array.from(articlesMap.values());
  } catch (err) {
    console.error("ScraperAPI Article Scrape Error:", err.message);
    return [];
  }
}

// async function getArticleSummary(articleUrl) {
//   try {
//     const encodedUrl = encodeURIComponent(articleUrl);
//     const fullUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodedUrl}&render=true`;
//     const { data: html } = await axios.get(fullUrl, { timeout: 60000 });

//     const $ = cheerio.load(html);

//     // Try to extract paragraphs from article content
//     const paragraphs = [];
//     $("article p, main p, .content p").each((_, el) => {
//       const text = $(el).text().trim();
//       if (text && text.length > 50) {
//         paragraphs.push(text);
//       }
//     });

//     const fullText = paragraphs.join(" ");
//     if (!fullText || fullText.length < 200) return null;

//     // Send to Hugging Face summarization model
//     const summary = await axios.post(
//       "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
//       { inputs: fullText.slice(0, 2000) }, // Trim input for limits
//       {
//         headers: {
//           Authorization: `Bearer YOUR_HUGGINGFACE_API_KEY`,
//         },
//       }
//     );

//     return summary.data[0]?.summary_text || null;
//   } catch (err) {
//     console.error("Summary fetch failed:", err.message);
//     return null;
//   }
// }
