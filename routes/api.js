import express from 'express';
import {  scrapeNews } from '../controllers/extractorController.js'; // Adjust the path as needed
import { feedExtractor, articleExtractor } from '../controllers/feedController.js';
import { scrapeYouTubeVideos, scrapeArticlesWithPuppeteer, scrapeTelegramPostWithPuppeteer, scrapeYouTubeVideosWithPlaywright } from '../controllers/feedController.js';
// import { handleYouTubeInputWithYTDL } from '../controllers/puppeteer/puppeteer-youtube-scraper.js';

const router = express.Router();

// POST route to handle content extraction
// router.post('/extract', extractContent);
router.post("/extract-news", scrapeNews);
router.post("/fetch-feed", feedExtractor);

//coneten and yotube by ScrappingBee
router.post("/articleExtractor", articleExtractor);

//puppeteer
router.post('/fetchYouTubeVideosWithPuppeteer', scrapeYouTubeVideos);
router.post('/fetchArticlesUsingPuppeteer', scrapeArticlesWithPuppeteer);
router.post('/fetchTelegramPostUsingPuppeteer', scrapeTelegramPostWithPuppeteer);
router.post('/scrapeYouTubeVideosWithPlaywright', scrapeYouTubeVideosWithPlaywright);




export default router;
