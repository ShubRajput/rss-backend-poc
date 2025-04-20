import axios from 'axios';
import * as cheerio from 'cheerio';
const SCRAPINGBEE_API_KEY = '8DR400WUET0E2MDCEORYT0RHU0LGEV1RB1GMFX8TZLMBU17OEVSJBCZQGDHNQXCY7DSC5GT0VTSWUJA4';

export async function fetchYouTubeVideosWithScraping(url) {
  try {
    const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/';

    const { data: html } = await axios.get(scrapingBeeUrl, {
      params: {
        api_key: SCRAPINGBEE_API_KEY,
        url,
        render_js: true,
        wait: 5000,           // 👈 Add wait time to allow JS to load
        block_resources: false, // You can try this to load full content
      }
      
    });
    console.log("Before cheerio");
    
    const $ = cheerio.load(html);
    const videoData = [];
    console.log("after cheerio");
    $('a#video-title').each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      const url = `https://www.youtube.com${href}`;
      const videoIdMatch = href?.match(/v=([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (title && videoId && href) {
        videoData.push({
          title,
          url,
          image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        });
    
      }
    });

    return videoData;
  } catch (err) {
    console.error('Error scraping YouTube:', err.message);
    return [];
  }
}
