import axios from "axios";
import * as cheerio from 'cheerio';

const SCRAPINGBEE_API_KEY = 'FPE9X1X2J0JUG1ONN5ASYD7UNAXQ5PVSD84CUI5JZDPWH6MZ3MZSCHSL2HZQK6MX6QOXNZVFKFUF3IPU';

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
  
  
