import { checkForRSSFeed } from "../utils/feedChecker.js";
import { extractFromHTML } from "../crawlers/htmlExtractor.js";
import { summarizeWithAI } from "../ai/summarizer.js";
import { extractArticlePreviews } from "../crawlers/multipleArticleCrawl.js";
import { extractMainContent } from "../ai/summarizeArticle.js";
import { summarizeWithHuggingFace } from "../ai/summarizeArticle.js";

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

export const articleExtractor = async (req, res) => {
  try {
    const { url } = req.body;
    const homepageUrl = url; 
    const articles = await extractArticlePreviews(homepageUrl);
    console.log("articles is:---", articles);
    

    const finalFeed = [];

    for (const article of articles) {
      try {
        const content = await extractMainContent(article.url);
        // const summary = await summarizeWithHuggingFace(content);
        finalFeed.push({ ...article, content });
      } catch (e) {
        console.error(`Error processing ${article.url}`, e.message);
      }
    }

    // console.log(finalFeed);
    return res.json({
      source: "html",
      article: finalFeed,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch feed." });
  }
};
