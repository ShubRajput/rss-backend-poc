// utils/puppeteerArticleScraper.js
import puppeteer from 'puppeteer-core';
import { URL } from "url";
import chromium from '@sparticuz/chromium';

export async function fetchArticlesUsingPuppeteer(baseUrl) {
  try {
     const browser = await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(), // Use Chromium executable
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 });

    // Scroll to load dynamic content
    await autoScroll(page);

    const articles = await page.evaluate((baseUrl) => {
      const anchors = Array.from(document.querySelectorAll("a"));
      const articlesMap = new Map();

      anchors.forEach((anchor) => {
        const text = anchor.innerText.trim();
        const href = anchor.getAttribute("href");
        const img = anchor.querySelector("img")?.src || null;

        if (!text || text.length < 15 || !href) return;

        let absoluteUrl = href;
        try {
          absoluteUrl = href.startsWith("http")
            ? href
            : new URL(href, baseUrl).href;
        } catch (e) {
          return;
        }

        if (!articlesMap.has(absoluteUrl)) {
          articlesMap.set(absoluteUrl, {
            title: text,
            url: absoluteUrl,
            image: img,
          });
        }
      });

      return Array.from(articlesMap.values());
    }, baseUrl);

    await browser.close();
    return articles;
  } catch (err) {
    console.error("Puppeteer Article Scrape Error:", err.message);
    return [];
  }
}

// Helper to scroll the page to load more content
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}
