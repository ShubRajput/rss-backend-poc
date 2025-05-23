// utils/puppeteerArticleScraper.js
import { URL } from "url";

// Environment configuration
const isProduction = process.env.NODE_ENV === "production";
let puppeteer;
let chromium;

if (isProduction) {
  // Use puppeteer-core and chromium for production (AWS Lambda)
  puppeteer = await import("puppeteer-core");
  chromium = await import("@sparticuz/chromium");
} else {
  // Use full puppeteer for local development
  puppeteer = await import("puppeteer");
}

// Configuration constants
const BROWSER_LAUNCH_TIMEOUT = 120000; // 2 minutes
const NAVIGATION_TIMEOUT = 90000; // 1.5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Helper function with retry logic for navigation
async function retryNavigation(page, url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT,
      });
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retrying navigation (attempt ${i + 1})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
}

// Optimized scrolling function
async function optimizedAutoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 500);
    });
  });
}

// Extracted article extraction logic
async function extractArticles(page, baseUrl) {
  return await page.evaluate((baseUrl) => {
    const anchors = Array.from(document.querySelectorAll("a"));
    const articlesMap = new Map();

    anchors.forEach((anchor) => {
      try {
        const text = anchor.innerText.trim();
        const href = anchor.getAttribute("href");
        const img = anchor.querySelector("img")?.src || null;

        if (
          !text ||
          text.length < 15 ||
          !href ||
          href.startsWith("javascript:") ||
          href.startsWith("mailto:")
        ) {
          return;
        }

        let absoluteUrl;
        try {
          absoluteUrl = href.startsWith("http")
            ? href
            : new URL(href, baseUrl).href;
        } catch (e) {
          return;
        }

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
        console.error("Error processing anchor:", e);
      }
    });

    return Array.from(articlesMap.values());
  }, baseUrl);
}

// Main exported function
export async function fetchArticlesUsingPuppeteer(baseUrl) {
  console.log("Starting fetchArticlesUsingPuppeteer");

  let browser;
  let page;
  try {
    // Browser launch configuration
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      headless: isProduction ? "new" : true,
      ignoreHTTPSErrors: true,
    };

    if (isProduction) {
      launchOptions.executablePath = 
        process.env.PUPPETEER_EXECUTABLE_PATH || 
        await chromium.executablePath();
      launchOptions.args.push(
        "--single-process",
        "--no-zygote",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-accelerated-2d-canvas"
      );
    } else {
      launchOptions.args.push("--start-maximized");
      launchOptions.slowMo = 50;
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    await page.setDefaultTimeout(NAVIGATION_TIMEOUT);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    await retryNavigation(page, baseUrl);
    await page.waitForSelector('body', { timeout: 10000 });
    await optimizedAutoScroll(page);

    const articles = await extractArticles(page, baseUrl);
    return articles;
  } catch (err) {
    console.error("Puppeteer error:", err);
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