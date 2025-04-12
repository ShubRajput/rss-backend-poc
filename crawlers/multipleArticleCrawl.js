// homepageCrawler.js
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function extractArticlePreviews(url) {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  const articles = [];

  $('a:has(img)').each((_, element) => {
    const title = $(element).text().trim();
    const link = $(element).attr('href');
    const img = $(element).find('img').attr('src');

    if (title && link && img) {
      articles.push({
        title,
        url: link.startsWith('http') ? link : new URL(link, url).href,
        image: img,
      });
    }
  });

  return articles.slice(0, 10); // return first 10 articles
}
