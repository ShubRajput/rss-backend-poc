import axios from "axios";
import * as cheerio from 'cheerio';

const SCRAPINGBEE_API_KEY = '8DR400WUET0E2MDCEORYT0RHU0LGEV1RB1GMFX8TZLMBU17OEVSJBCZQGDHNQXCY7DSC5GT0VTSWUJA4';

export async function fetchArticlesUsingScrapingBee(url) {
    try {
      const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/';
      
      const { data: html } = await axios.get(scrapingBeeUrl, {
        params: {
          api_key: SCRAPINGBEE_API_KEY,
          url: url,
          render_js: true,
        },
      });
      
      
      const $ = cheerio.load(html);
      const articles = new Map(); // Avoid duplicates by using a Map
  
      $('a').each((_, el) => {
        const link = $(el).attr('href');
        const text = $(el).text().trim();
        const img = $(el).find('img').attr('src') || null;
  
        // Skip empty or irrelevant links
        if (!text || text.length < 15 || !link) return;
  
        const absoluteUrl = link.startsWith('http') ? link : new URL(link, url).href;
  
        if (!articles.has(absoluteUrl)) {
          articles.set(absoluteUrl, {
            title: text,
            url: absoluteUrl,
            image: img,
          });
        }
      });
  
      return Array.from(articles.values()); // return all without slicing
    } catch (err) {
      console.error("Error fetching articles:", err);
      return [];
    }
  }
  
  
