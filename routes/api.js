import express from "express";
// import { scrapeNews } from "../controllers/extractorController.js"; // Adjust the path as needed
import {
  feedExtractor,
  articleExtractor,
} from "../controllers/feedController.js";
import {
  scrapeYouTubeVideos,
  scrapeArticlesWithPuppeteer,
  // scrapeTelegramPostWithPuppeteer,
  scrapeYouTubeVideosWithPlaywright,
} from "../controllers/feedController.js";
// import { handleYouTubeInputWithYTDL } from '../controllers/puppeteer/puppeteer-youtube-scraper.js';
import { fetchVideosFromUrl } from "../controllers/YoutubeDataApi/index.js";
import { fetchArticlesUsingScraperAPI } from "../controllers/ScrapperAPI/index.js";
import { fetchInstagramFeed } from "../controllers/ScrapperAPI/InstagramScraperAPI/index.js";
import { fetchApifyInstagramFeed } from "../controllers/Apify/Instagram/index.js";
import { fetchApifyLinkedInFeed } from "../controllers/Apify/Linkedin/index.js";
import { fetchApifyTelegramFeed } from "../controllers/Apify/Telegram/index.js";
import { fetchApifyRedditFeed } from "../controllers/Apify/Reddit/index.js";
import { fetchArticlesFromWebsite } from "../controllers/Apify/WebScrapper/index.js";

const router = express.Router();

// POST route to handle content extraction
// router.post('/extract', extractContent);
// router.post("/extract-news", scrapeNews);
router.post("/fetch-feed", feedExtractor);

//coneten and yotube by ScrappingBee
router.post("/articleExtractor", articleExtractor);

//puppeteer
router.post("/fetchYouTubeVideosWithPuppeteer", scrapeYouTubeVideos);
router.post("/fetchArticlesUsingPuppeteer", scrapeArticlesWithPuppeteer);
// router.post(
//   "/fetchTelegramPostUsingPuppeteer",
//   scrapeTelegramPostWithPuppeteer
// );
router.post(
  "/scrapeYouTubeVideosWithPlaywright",
  scrapeYouTubeVideosWithPlaywright
);
router.post("/youtubeDataApi", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const videos = await fetchVideosFromUrl(url);
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});

router.post("/model/scrapperapi", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const article = await fetchArticlesUsingScraperAPI(url);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});

router.post("/model/scrapperapi/instagram", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const article = await fetchInstagramFeed(url);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});

router.post("/model/apify/instagram", async (req, res) => {
  const { url } = req.body;
  console.log("URl is", url);
  
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const article = await fetchApifyInstagramFeed(url);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});

router.post("/model/apify/linkedin", async (req, res) => {
  const { url } = req.body;
  console.log("URl is", url);
  
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const article = await fetchApifyLinkedInFeed(url);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});


router.post("/model/apify/telegram", async (req, res) => {
  const { url } = req.body;
  console.log("URl is", url);
  
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const article = await fetchApifyTelegramFeed(url);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});

router.post("/model/apify/reddit", async (req, res) => {
  const { url } = req.body;
  console.log("URl is", url);
  
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const article = await fetchApifyRedditFeed(url);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});

router.post("/model/apify/webscrapper", async (req, res) => {
  const { url } = req.body;
  console.log("URl is", url);
  
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const article = await fetchArticlesFromWebsite(url);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch videos, ${err}` });
  }
});
export default router;
