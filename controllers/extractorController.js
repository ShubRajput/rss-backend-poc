import axios from 'axios';
import puppeteer from "puppeteer";
import * as cheerio from 'cheerio';
import nlp from "compromise"; // NLP for summarization

const scrapeNews = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "URL is required" });

        console.log(`Scraping main page: ${url}`);

        // Launch Puppeteer for headless browsing
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        // Extract HTML content
        const html = await page.content();
        const $ = cheerio.load(html);

        let articles = [];

        // Find all valid news links (Avoid nav bars, ads, etc.)
        $("a").each((index, element) => {
            const title = $(element).text().trim();
            const link = $(element).attr("href");

            if (title && link && isValidNewsLink(link, url)) {
                const absoluteLink = link.startsWith("http") ? link : new URL(link, url).href;
                articles.push({ title, link: absoluteLink });
            }
        });

        console.log(`Found ${articles.length} possible news articles.`);

        // Limit to first 30 articles if more than 30 are found
        if (articles.length > 30) {
            articles = articles.slice(0, 30);
            console.log(`Limiting to first 30 articles.`);
        }

        let fullArticles = [];

        // Extract full content from each news article (only for first 30)
        for (let article of articles) {
            const fullContent = await fetchFullNewsContent(article.link, browser);
            if (fullContent) {
                fullArticles.push({
                    title: article.title,
                    fullContent: fullContent,
                    summary: summarizeText(fullContent),
                    link: article.link,
                });
            }
        }

        await browser.close();

        if (fullArticles.length === 0) {
            return res.status(404).json({ error: "No valid news articles found." });
        }

        return res.status(200).json({ news: fullArticles });

    } catch (error) {
        console.error("Error scraping news:", error);
        return res.status(500).json({ error: "Failed to fetch news" });
    }
};

// **Function to check if a link is a valid news article**
function isValidNewsLink(link, baseUrl) {
    if (!link.startsWith("http")) link = new URL(link, baseUrl).href;
    return link.includes("/news/") || link.includes("/article/"); // Adjust for site structure
}

// **Function to fetch full news content from article link**
async function fetchFullNewsContent(articleUrl, browser) {
    try {
        console.log(`Fetching full article: ${articleUrl}`);
        const page = await browser.newPage();
        await page.goto(articleUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

        // Extract article content
        const html = await page.content();
        const $ = cheerio.load(html);
        let paragraphs = [];

        $("p").each((i, el) => {
            let text = $(el).text().trim();
            if (text.length > 30) paragraphs.push(text); // Ignore small texts
        });

        await page.close();

        return paragraphs.join(" ") || null;

    } catch (error) {
        console.error(`Error fetching article content from ${articleUrl}:`, error);
        return null;
    }
}

// **Function to summarize text using NLP**
function summarizeText(text) {
    if (!text || text.length < 100) return text; // Skip short text
    const doc = nlp(text);
    return doc.sentences().out("text").slice(0, 300) + "..."; // First 300 characters as summary
}

export { scrapeNews };
