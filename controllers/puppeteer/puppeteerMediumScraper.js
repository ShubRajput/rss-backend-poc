import { URL } from "url";

const isProduction = process.env.NODE_ENV === "production";
let puppeteer;
let chromium;

if (isProduction) {
  puppeteer = await import("puppeteer-core");
  chromium = await import("@sparticuz/chromium");
} else {
  puppeteer = await import("puppeteer");
}

const BROWSER_LAUNCH_TIMEOUT = 120000;
const NAVIGATION_TIMEOUT = 60000;
const SCROLL_PAUSE = 2000;
const MAX_SCROLL_ATTEMPTS = 30;

async function scrollMediumPage(page) {
  await page.evaluate(async (pauseTime, maxAttempts) => {
    await new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        window.scrollBy(0, window.innerHeight);
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve();
        }
      }, pauseTime);
    });
  }, SCROLL_PAUSE, MAX_SCROLL_ATTEMPTS);
}

async function extractMediumArticles(page, channelUrl) {
  return await page.evaluate((url) => {
    const articles = Array.from(document.querySelectorAll('article'));
    const results = [];

    articles.forEach((article) => {
      try {
        const titleElement = article.querySelector('h2');
        const title = titleElement?.innerText.trim();

        const anchor = article.querySelector('a');
        const articleUrl = anchor?.href?.startsWith('http') ? anchor.href : '';

        const authorElement = article.querySelector('a[rel="noopener"]');
        const author = authorElement?.innerText.trim() || '';

        const previewElement = article.querySelector('p');
        const preview = previewElement?.innerText.trim() || '';

        const imageElement = article.querySelector('img');
        const image = imageElement?.src || '';

        const dateElement = article.querySelector('time');
        const date = dateElement?.getAttribute('datetime') || '';

        if (title && articleUrl) {
          results.push({
            title,
            url: articleUrl,
            author,
            preview,
            image,
            date,
            source: url
          });
        }
      } catch (err) {
        console.error('Error parsing article:', err);
      }
    });

    return results;
  }, channelUrl);
}

export async function fetchMediumArticles(channelUrl) {
  console.log(`Starting Medium scrape for: ${channelUrl}`);

  let browser;
  let page;
  try {
    const launchOptions = {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: isProduction ? "new" : false,
      ignoreHTTPSErrors: true,
      timeout: BROWSER_LAUNCH_TIMEOUT,
    };

    if (isProduction) {
      launchOptions.executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();
    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );

    await page.goto(channelUrl, { waitUntil: "networkidle2" });
    await scrollMediumPage(page);
    const articles = await extractMediumArticles(page, channelUrl);

    return articles;
  } catch (err) {
    console.error("Medium scraping error:", err);
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
