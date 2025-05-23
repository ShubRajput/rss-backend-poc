// utils/puppeteerTelegramScraper.js
import { URL } from "url";

// Environment configuration
const isProduction = process.env.NODE_ENV === "production";
let puppeteer;
let chromium;

if (isProduction) {
  puppeteer = await import("puppeteer-core");
  chromium = await import("@sparticuz/chromium");
} else {
  puppeteer = await import("puppeteer");
}

// Configuration constants
const BROWSER_LAUNCH_TIMEOUT = 180000; // 3 minutes (Telegram can be slow)
const NAVIGATION_TIMEOUT = 120000; // 2 minutes
const MAX_RETRIES = 5; // More retries for Telegram
const RETRY_DELAY = 10000; // 10 seconds between retries
const SCROLL_PAUSE = 2000; // Longer pause for Telegram loading

// Helper function with retry logic for Telegram's heavy pages
async function retryTelegramNavigation(page, url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, {
        waitUntil: "networkidle2", // Telegram needs more complete loading
        timeout: NAVIGATION_TIMEOUT,
      });
      
      // Wait specifically for Telegram's content
      await page.waitForSelector('.tgme_widget_message', { timeout: 30000 });
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retrying Telegram navigation (attempt ${i + 1})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
}

// Telegram-specific scrolling function
async function scrollTelegramPage(page) {
  await page.evaluate(async (pauseTime) => {
    await new Promise((resolve) => {
      let previousHeight = 0;
      let currentHeight = document.body.scrollHeight;
      let scrollAttempts = 0;
      const maxAttempts = 50; // Prevent infinite scrolling

      const timer = setInterval(() => {
        window.scrollTo(0, document.body.scrollHeight);
        currentHeight = document.body.scrollHeight;
        scrollAttempts++;

        if (currentHeight === previousHeight || scrollAttempts >= maxAttempts) {
          clearInterval(timer);
          resolve();
        }
        previousHeight = currentHeight;
      }, pauseTime);
    });
  }, SCROLL_PAUSE);
}

// Extract Telegram messages with media and metadata
async function extractTelegramMessages(page, channelUrl) {
  return await page.evaluate((url) => {
    const messages = Array.from(document.querySelectorAll('.tgme_widget_message'));
    const results = [];

    messages.forEach((message) => {
      try {
        const textElement = message.querySelector('.tgme_widget_message_text');
        const text = textElement ? textElement.innerText.trim() : '';
        
        const dateElement = message.querySelector('.tgme_widget_message_date time');
        const date = dateElement ? dateElement.getAttribute('datetime') : '';
        
        const mediaElements = message.querySelectorAll('.tgme_widget_message_photo_wrap, video');
        const media = Array.from(mediaElements).map(el => {
          if (el.tagName === 'VIDEO') {
            return {
              type: 'video',
              url: el.querySelector('source')?.src || ''
            };
          }
          return {
            type: 'image',
            url: el.style.backgroundImage.match(/url\("(.*?)"\)/)?.[1] || ''
          };
        }).filter(item => item.url);

        const linkElements = message.querySelectorAll('a');
        const links = Array.from(linkElements)
          .map(a => a.href)
          .filter(href => href && !href.includes('t.me') && !href.startsWith('mailto:'));

        if (text || media.length > 0) {
          results.push({
            text,
            date,
            media,
            links,
            url: `${url}#${message.id || ''}`
          });
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    return results;
  }, channelUrl);
}

// Main Telegram scraper function
export async function scrapeTelegramChannel(channelUrl) {
  console.log(`Starting Telegram scrape for: ${channelUrl}`);

  let browser;
  let page;
  try {
    // Browser launch configuration optimized for Telegram
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--aggressive-cache-discard",
        "--disable-cache",
        "--disable-application-cache",
        "--disable-offline-load-stale-cache",
        "--disk-cache-size=0"
      ],
      headless: isProduction ? "new" : false, // Better to see what's happening in dev
      ignoreHTTPSErrors: true,
      timeout: BROWSER_LAUNCH_TIMEOUT
    };

    if (isProduction) {
      launchOptions.executablePath = 
        process.env.PUPPETEER_EXECUTABLE_PATH || 
        await chromium.executablePath();
    } else {
      launchOptions.args.push("--start-maximized");
      launchOptions.slowMo = 100; // Slower for debugging
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    // Configure page for Telegram
    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    await page.setDefaultTimeout(NAVIGATION_TIMEOUT);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    
    // Bypass potential bot detection
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    // Navigate to channel
    await retryTelegramNavigation(page, channelUrl);
    
    // Scroll to load more messages
    await scrollTelegramPage(page);
    
    // Extract messages
    const messages = await extractTelegramMessages(page, channelUrl);
    
    return messages;
  } catch (err) {
    console.error("Telegram scraping error:", err);
    throw err;
  } finally {
    try {
      if (page && !page.isClosed()) await page.close();
      if (browser) await browser.close();
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
}