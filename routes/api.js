import express from 'express';
import {  scrapeNews } from '../controllers/extractorController.js'; // Adjust the path as needed
import { feedExtractor, articleExtractor } from '../controllers/feedController.js';

const router = express.Router();

// POST route to handle content extraction
// router.post('/extract', extractContent);
router.post("/extract-news", scrapeNews);
router.post("/fetch-feed", feedExtractor);
router.post("/articleExtractor", articleExtractor);




export default router;
