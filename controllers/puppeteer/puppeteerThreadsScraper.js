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

async function extractThreadsPosts(page, profileUrl) {
  return await page.evaluate((sourceUrl) => {
    const cards = document.querySelectorAll('[data-testid="post-container"]');
    const posts = [];

    cards.forEach((card) => {
      try {
        const content = card.querySelector('[data-testid="post-text"]')?.innerText || "";
        const image = card.querySelector("img")?.src || "";
        const timestamp = card.querySelector("time")?.getAttribute("datetime") || "";
        const url = "https://www.threads.net" + (card.querySelector('a[href*="/@"]')?.getAttribute("href") || "");

        if (content) {
          posts.push({
            content,
            image,
            timestamp,
            url,
            source: sourceUrl
          });
        }
      } catch (err) {
        console.error("Error extracting thread post:", err);
      }
    });

    return posts;
  }, profileUrl);
}

export async function scrapeThreadsProfile(profileUrl) {
  console.log(`Starting Threads scrape for: ${profileUrl}`);

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

    await page.goto(profileUrl, { waitUntil: "networkidle2" });

    // Give Threads time to hydrate content
    await new Promise(resolve => setTimeout(resolve, 5000));


    const posts = await extractThreadsPosts(page, profileUrl);
    return posts;
  } catch (err) {
    console.error("Threads scraping error:", err);
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
