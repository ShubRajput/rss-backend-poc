// utils/puppeteerArticleScraper.js
import puppeteer from 'puppeteer-core';
import { URL } from "url";
import chromium from '@sparticuz/chromium';

// Configuration constants
const BROWSER_LAUNCH_TIMEOUT = 120000; // 2 minutes
const NAVIGATION_TIMEOUT = 90000; // 1.5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

export async function fetchArticlesUsingPuppeteer(baseUrl) {
  let browser;
  try {
    // Optimized browser launch configuration
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-dev-shm-usage', // Crucial for Docker/cloud environments
        '--disable-gpu',
        '--single-process',       // Reduces memory usage
        '--no-zygote',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      timeout: BROWSER_LAUNCH_TIMEOUT
    });

    const page = await browser.newPage();
    
    // Set more aggressive timeouts
    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    await page.setDefaultTimeout(NAVIGATION_TIMEOUT);

    // Implement retry logic for navigation
    await retryNavigation(page, baseUrl);

    // Optimized scrolling
    await optimizedAutoScroll(page);

    // Extract articles with error handling
    const articles = await extractArticles(page, baseUrl);
    
    return articles;
  } catch (err) {
    console.error("Puppeteer Article Scrape Error:", err.message);
    return [];
  } finally {
    if (browser) {
      await browser.close().catch(e => console.error('Browser close error:', e));
    }
  }
}

// Helper function with retry logic for navigation
async function retryNavigation(page, url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Less strict than networkidle2
        timeout: NAVIGATION_TIMEOUT
      });
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retrying navigation (attempt ${i + 1})...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
}

// Optimized scrolling function
async function optimizedAutoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100; // Reduced scroll distance
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 500); // Increased interval
    });
  });
}

// Extracted article extraction logic with better filtering
async function extractArticles(page, baseUrl) {
  return await page.evaluate((baseUrl) => {
    const anchors = Array.from(document.querySelectorAll("a"));
    const articlesMap = new Map();

    anchors.forEach((anchor) => {
      try {
        const text = anchor.innerText.trim();
        const href = anchor.getAttribute("href");
        const img = anchor.querySelector("img")?.src || null;

        // More robust filtering
        if (!text || text.length < 15 || !href || 
            href.startsWith('javascript:') || href.startsWith('mailto:')) {
          return;
        }

        let absoluteUrl;
        try {
          absoluteUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
        } catch (e) {
          return;
        }

        // Skip non-article URLs (optional)
        if (!absoluteUrl.match(/article|news|post/i)) {
          return;
        }

        if (!articlesMap.has(absoluteUrl)) {
          articlesMap.set(absoluteUrl, {
            title: text,
            url: absoluteUrl,
            image: img,
          });
        }
      } catch (e) {
        console.error('Error processing anchor:', e);
      }
    });

    return Array.from(articlesMap.values());
  }, baseUrl);
}