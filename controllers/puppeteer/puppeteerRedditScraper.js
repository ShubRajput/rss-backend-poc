// utils/puppeteerRedditScraper.js
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
const BROWSER_LAUNCH_TIMEOUT = 240000;
const NAVIGATION_TIMEOUT = 120000;
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000;
const SCROLL_PAUSE = 2000;
const MAX_SCROLL_ATTEMPTS = 20;
const MIN_POSTS = 20;
const MAX_AGE_HOURS = 24;

// 1. First define helper functions
async function retryRedditNavigation(page, url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT,
      });
      
      await Promise.race([
        page.waitForSelector('[data-testid="post-container"]', { timeout: 15000 }),
        page.waitForSelector('.Post', { timeout: 15000 }),
        page.waitForSelector('shreddit-post', { timeout: 15000 })
      ]);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retrying Reddit navigation (attempt ${i + 1})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
}

async function scrollRedditPage(page) {
  let scrollAttempts = 0;
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let oldestPostDate = new Date();
  let postsCount = 0;

  while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await new Promise(resolve => setTimeout(resolve, SCROLL_PAUSE));
    
    const currentPosts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="post-container"], .Post, shreddit-post')).map(post => {
        const timeElement = post.querySelector('a[data-click-id="timestamp"], .Post__time, [slot="post-metadata"] time');
        return {
          date: timeElement ? new Date(timeElement.getAttribute('datetime') || new Date() ) : new Date()
        };
      });
    });

    postsCount = currentPosts.length;
    oldestPostDate = currentPosts.reduce((oldest, post) => 
      post.date < oldest ? post.date : oldest, new Date());
    
    const hoursOld = (new Date() - oldestPostDate) / (1000 * 60 * 60);
    
    if (postsCount >= MIN_POSTS && 
        (hoursOld >= MAX_AGE_HOURS || currentHeight === previousHeight)) {
      break;
    }

    previousHeight = currentHeight;
    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    scrollAttempts++;
  }
  console.log(`Scrolled ${scrollAttempts} times. Found ${postsCount} posts. Oldest post: ${oldestPostDate}`);
}

async function extractRedditPosts(page, subredditUrl) {
  const oneDayAgo = new Date(Date.now() - (MAX_AGE_HOURS * 60 * 60 * 1000));

  return await page.evaluate((url, oneDayAgoTimestamp) => {
    const oneDayAgo = new Date(oneDayAgoTimestamp);
    const posts = Array.from(document.querySelectorAll(
      '[data-testid="post-container"], .Post, shreddit-post'
    ));
    const results = [];

    posts.forEach((post) => {
      try {
        const titleElement = post.querySelector('h3') || 
                           post.querySelector('[slot="title"]') ||
                           post.querySelector('.Post__title');
        const title = titleElement ? titleElement.innerText.trim() : '';
        
        const textElement = post.querySelector('[data-test-id="post-content"]') ||
                          post.querySelector('.Post__body') ||
                          post.querySelector('[slot="text-body"]');
        const text = textElement ? textElement.innerText.trim() : '';
        
        const authorElement = post.querySelector('[data-testid="post_author_link"]') ||
                            post.querySelector('.Post__author') ||
                            post.querySelector('[slot="author"]');
        const author = authorElement ? authorElement.innerText.replace('u/', '').trim() : '';
        
        const timeElement = post.querySelector('a[data-click-id="timestamp"]') ||
                          post.querySelector('.Post__time') ||
                          post.querySelector('[slot="post-metadata"] time');
        const postDate = timeElement ? 
          new Date(timeElement.getAttribute('datetime') || timeElement.innerText) : 
          new Date();

        if (postDate < oneDayAgo) return;

        const upvoteElement = post.querySelector('[data-test-id="post-upvote-button"]') ||
                            post.querySelector('.Post__upvote') ||
                            post.querySelector('[slot="upvote-button"]');
        const upvotes = upvoteElement ? 
          (upvoteElement.nextElementSibling?.innerText.trim() || 
           upvoteElement.getAttribute('aria-label')?.match(/\d+/)?.[0] || 
           '0') : '0';
        
        const commentsElement = post.querySelector('[data-test-id="comments-page-link-num-comments"]') ||
                              post.querySelector('.Post__comments') ||
                              post.querySelector('[slot="comment-count"]');
        const comments = commentsElement ? commentsElement.innerText.trim() : '0';
        
        const media = [];
        const imageElement = post.querySelector('img[src^="https://i.redd.it"], [data-test-id="post-media"] img');
        if (imageElement) {
          media.push({
            type: 'image',
            url: imageElement.src
          });
        }
        
        const videoElement = post.querySelector('video, [data-test-id="post-media"] video');
        if (videoElement) {
          const source = videoElement.querySelector('source') || { src: videoElement.src };
          if (source.src) {
            media.push({
              type: 'video',
              url: source.src
            });
          }
        }
        
        const links = [];
        const linkElements = post.querySelectorAll('a[href^="http"]:not([href*="reddit.com"])');
        linkElements.forEach(link => {
          if (!links.includes(link.href)) {
            links.push(link.href);
          }
        });

        const postLinkElement = post.querySelector('a[data-test-id="post-title"], [slot="title"] a');
        const postUrl = postLinkElement ? 
          (postLinkElement.href.startsWith('http') ? 
            postLinkElement.href : 
            `https://www.reddit.com${postLinkElement.getAttribute('href')}`) : '';

        if (title) {
          results.push({
            title,
            text,
            author,
            date: postDate.toISOString(),
            timestamp: timeElement?.getAttribute('href') || '',
            upvotes,
            comments,
            media,
            links,
            url: postUrl,
            subreddit: url
          });
        }
      } catch (e) {
        console.error('Error processing post:', e);
      }
    });

    return results.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, subredditUrl, oneDayAgo.getTime());
}

// 2. Then define the main exported function
export async function scrapeRedditSubreddit(subredditUrl, options = {}) {
  const {
    minPosts = MIN_POSTS,
    maxAgeHours = MAX_AGE_HOURS
  } = options;

  if (!subredditUrl.includes('://www.reddit.com')) {
    subredditUrl = `https://www.reddit.com${subredditUrl.startsWith('/') ? '' : '/'}${subredditUrl}`;
  }
  subredditUrl = subredditUrl.replace('://www.reddit.com', '://new.reddit.com');

  console.log(`Starting Reddit scrape for: ${subredditUrl}`);

  let browser;
  let page;
  try {
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "--window-size=1920,1080"
      ],
      headless: isProduction ? "new" : false,
      ignoreHTTPSErrors: true,
      timeout: BROWSER_LAUNCH_TIMEOUT
    };

    if (isProduction) {
      launchOptions.executablePath = 
        process.env.PUPPETEER_EXECUTABLE_PATH || 
        await chromium.executablePath();
    } else {
      launchOptions.args.push("--start-maximized");
      launchOptions.slowMo = 100;
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    await page.setDefaultTimeout(NAVIGATION_TIMEOUT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await retryRedditNavigation(page, subredditUrl);
    await scrollRedditPage(page);
    
    let posts = await extractRedditPosts(page, subredditUrl);
    
    if (posts.length < minPosts) {
      console.log(`Only found ${posts.length} posts, trying to scroll more...`);
      await scrollRedditPage(page);
      posts = await extractRedditPosts(page, subredditUrl);
    }

    return posts.slice(0, Math.max(minPosts, posts.length));
  } catch (err) {
    console.error("Reddit scraping error:", err);
    throw err;
  } finally {
    try {
      if (page) {
        page.removeAllListeners('request');
        if (!page.isClosed()) await page.close();
      }
      if (browser) await browser.close();
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
}