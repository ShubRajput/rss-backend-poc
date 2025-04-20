import { checkForRSSFeed } from "../utils/feedChecker.js";
import { extractFromHTML } from "../crawlers/htmlExtractor.js";
import { summarizeWithAI } from "../ai/summarizer.js";
import { extractArticlePreviews } from "../crawlers/multipleArticleCrawl.js";
import { extractMainContent } from "../ai/summarizeArticle.js";
import { summarizeWithHuggingFace } from "../ai/summarizeArticle.js";
import {
  extractWithDiffbot,
  extractWithDiffbotAnalyze,
} from "../services/diffbotService.js";
import { fetchArticlesUsingScrapingBee } from "../services/scrappingBee.js";
import { isYouTubeUrl } from "../utils/youtubeUtils.js";
import { fetchYouTubeVideosWithScraping } from "../services/youTubeVideosWithScraping.js";

export const feedExtractor = async (req, res) => {
  const { url } = req.body;

  try {
    const rssCheck = await checkForRSSFeed(url);

    if (rssCheck.isRSS) {
      console.log("yesss rss is present");

      return res.json({
        source: "rss",
        feed: rssCheck.feed.items.map((i) => ({
          title: i.title,
          link: i.link,
          summary: i.contentSnippet || i.content || "",
        })),
      });
    }

    const article = await extractFromHTML(url);

    // const summary = await summarizeWithAI(article.content);

    return res.json({
      source: "html",
      title: article.title,
      article,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch feed." });
  }
};

// export const articleExtractor = async (req, res) => {
//   try {
//     const { url } = req.body;
//     const homepageUrl = url;

//     let articles = await extractArticlePreviews(homepageUrl);
//     console.log("Primary articles found:", articles);

//     let finalFeed = [];

//     // Helper to process articles
//     const processArticles = async (articleList) => {
//       const results = [];

//       for (const article of articleList) {
//         try {
//           const content = await extractMainContent(article.url);
//           if (content && content.length > 100) {
//             results.push({ ...article, content });
//           }
//         } catch (e) {
//           console.error(`Error processing ${article.url}`, e.message);
//         }
//       }

//       return results;
//     };

//     finalFeed = await processArticles(articles);

//     // Fallback: Try deeper links if initial articles failed
//     if (finalFeed.length === 0) {
//       console.log("⚠️ No valid articles from primary scan. Trying fallback links...");

//       const fallbackLinks = articles.map(a => a.url).slice(0, 5); // Limit fallback depth
//       for (const fallbackUrl of fallbackLinks) {
//         try {
//           const subArticles = await extractArticlePreviews(fallbackUrl);
//           console.log(`Fallback attempt on ${fallbackUrl}: Found ${subArticles.length} more articles`);

//           const fallbackFeed = await processArticles(subArticles);
//           finalFeed.push(...fallbackFeed);

//           if (finalFeed.length > 0) break; // If success, break fallback loop
//         } catch (err) {
//           console.error(`Failed fallback on ${fallbackUrl}`, err.message);
//         }
//       }
//     }

//     if (finalFeed.length === 0) {
//       return res.status(404).json({
//         message: "No valid articles found, even after fallback.",
//       });
//     }

//     return res.json({
//       source: "html",
//       articles: finalFeed,
//     });
//   } catch (error) {
//     console.error("Critical Error:", error.message);
//     res.status(500).json({ error: "Failed to fetch feed." });
//   }
// };

export const articleExtractor = async (req, res) => {
  try {
    const { url } = req.body;

    if (isYouTubeUrl(url)) {
      console.log("YouTube URL received:", url);

      // 🔁 Try scraping YouTube up to 3 times
      let videos = [];
      const maxRetries = 3;

      for (let i = 0; i < maxRetries; i++) {
        console.log(`Attempt ${i + 1} to fetch YouTube videos...`);
        videos = await fetchYouTubeVideosWithScraping(url);
        
        if (videos.length) break; // ✅ If we get data, break out of loop
      }

      // ❌ If still no data, fallback
      if (!videos.length) {
        console.log("All attempts failed. Falling back to generic article extraction...");
        const articles = await fetchArticlesUsingScrapingBee(url);

        if (!articles.length) {
          return res.status(404).json({
            message: "Unable to extract YouTube article. Please provide a valid link.",
          });
        }

        return res.json({
          source: "scrapingBee",
          articles,
        });
      }

      // ✅ Successfully fetched YouTube video data
      return res.json({
        source: "youtubeScrape",
        articles: videos,
      });
    }

    // 🌐 Non-YouTube: Use regular article scraping
    const articles = await fetchArticlesUsingScrapingBee(url);
    if (!articles.length) {
      return res.status(404).json({ message: "Unable to extract articles." });
    }

    res.json({
      source: "scrapingBee",
      articles,
    });
  } catch (err) {
    console.error("Error in articleExtractor:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

