import Parser from "rss-parser";
import axios from "axios";
const parser = new Parser();

export const checkForRSSFeed = async (url) => {
  try {
    const feed = await parser.parseURL(url);
    return { isRSS: true, feed };
  } catch (e) {
    return { isRSS: false, error: e.message };
  }
};
