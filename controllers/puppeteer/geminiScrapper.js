// fallbackExtractor.js
import { URL } from "url";
const isProduction = process.env.NODE_ENV === "production";
let puppeteer;
let chromium;
import { GoogleGenerativeAI } from "@google/generative-ai";

if (isProduction) {
  puppeteer = await import("puppeteer-core");
  chromium = await import("@sparticuz/chromium");
} else {
  puppeteer = await import("puppeteer");
}

const BROWSER_LAUNCH_TIMEOUT = 120000;
const NAVIGATION_TIMEOUT = 60000;
const SCROLL_PAUSE = 1500;
const MAX_SCROLL_ATTEMPTS = 5;

async function scrollPage(page) {
  await page.evaluate(
    async (pauseTime, maxScrolls) => {
      await new Promise((resolve) => {
        let scrolls = 0;
        const interval = setInterval(() => {
          window.scrollBy(0, window.innerHeight);
          scrolls++;
          if (scrolls >= maxScrolls) {
            clearInterval(interval);
            resolve();
          }
        }, pauseTime);
      });
    },
    SCROLL_PAUSE,
    MAX_SCROLL_ATTEMPTS
  );
}

export async function getHtmlContent(url) {
  let browser, page;
  try {
    const launchOptions = {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: isProduction ? "new" : false,
      timeout: BROWSER_LAUNCH_TIMEOUT,
    };
    if (isProduction) {
      launchOptions.executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (await chromium.executablePath());
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();
    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2" });
    await scrollPage(page);

    const html = await page.content();
    return html;
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

// geminiExtractor.js

const genAI = new GoogleGenerativeAI("AIzaSyCWzHZqj5vY7_yU2CfgiGbfE3zzID9YA-I");

export async function extractArticlesFromHTML(htmlContent) {
  console.log("reached in Gemeni extractor");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are an article extractor. Given raw HTML of a webpage, extract all articles from it. if it is any social media platform then extract the latest post from it.

Return an array of objects with the following format:

[
  {
    "title": "Title of the article",
    "url": "URL of the article",
    "image": "URL of the article image",
    "summary": "A short summary or description of the article"
  },
  ...
]

Only return valid and relevant articles.

HTML Content:
${htmlContent}
`;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text(); // plain string

  try {
    // Find where the JSON array starts/ends
    const jsonStart = rawText.indexOf("[");
    const jsonEnd = rawText.lastIndexOf("]") + 1;

    // Extract just the JSON portion
    const jsonText = rawText.slice(jsonStart, jsonEnd);

    // Parse to JavaScript array/object
    const parsed = JSON.parse(jsonText);

    console.log("Parsed result:", parsed);
    return parsed;
  } catch (err) {
    console.error("Failed to parse Gemini response:", err);
    return [];
  }
}
