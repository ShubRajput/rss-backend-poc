// utils/puppeteerLinkedInScraper.js

//TOOD: Not in Work
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
const BROWSER_LAUNCH_TIMEOUT = 300000;
const NAVIGATION_TIMEOUT = 180000;
const MAX_RETRIES = 5;
const RETRY_DELAY = 20000;
const SCROLL_PAUSE = 5000;
const MAX_SCROLL_ATTEMPTS = 15;
const MIN_POSTS = 10;
const MAX_AGE_DAYS = 3;

// LinkedIn selectors with fallbacks
const LINKEDIN_SELECTORS = {
  POST: '.feed-shared-update-v2, .update-components-text',
  CONTENT: '.feed-shared-update-v2__description, .update-components-text',
  AUTHOR: '.feed-shared-post-meta__name, .update-components-actor__title',
  DATE: 'time, .update-components-actor__sub-description span',
  LIKES: '.social-details-social-counts__reactions-count, .social-counts-reactions',
  COMMENTS: '.social-details-social-counts__comments-count, .social-counts-comments',
  MEDIA: '.feed-shared-image__container img, .feed-shared-video__container video, .update-components-image img',
  LINK: 'a.feed-shared-article__title, a.update-components-article__title'
};

async function handleLinkedInLogin(page) {
  if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
    throw new Error('LinkedIn credentials required for scraping');
  }

  try {
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.type('#username', process.env.LINKEDIN_EMAIL);
    await page.type('#password', process.env.LINKEDIN_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('[data-litms-control-urn="login-submit"]')
    ]);
  } catch (err) {
    console.warn('Login attempt failed:', err);
    throw err;
  }
}

async function retryLinkedInNavigation(page, url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: NAVIGATION_TIMEOUT,
      });

      // Check for login wall
      if (await page.$('#username')) {
        await handleLinkedInLogin(page);
      }

      // Check for verification challenge
      if (await page.$('#challenge-dialog')) {
        throw new Error('LinkedIn verification challenge encountered');
      }

      // Wait for content with multiple fallbacks
      await Promise.race([
        page.waitForSelector(LINKEDIN_SELECTORS.POST, { timeout: 30000 }),
        page.waitForSelector('.scaffold-finite-scroll__content', { timeout: 30000 }),
        page.waitForSelector('.main-feed', { timeout: 30000 }),
        page.waitForSelector('.feed-shared-update-v2', { timeout: 30000 })
      ]);

      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      
      console.log(`Retrying LinkedIn navigation (attempt ${i + 1})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      
      try {
        await page.reload({ waitUntil: 'networkidle0', timeout: NAVIGATION_TIMEOUT });
      } catch (refreshErr) {
        console.warn('Page refresh failed:', refreshErr);
      }
    }
  }
}

async function scrollLinkedInPage(page) {
  let scrollAttempts = 0;
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let postsCount = 0;

  while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    try {
      await page.evaluate(async () => {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      await new Promise(resolve => setTimeout(resolve, SCROLL_PAUSE));

      // Check if still on LinkedIn
      if (!(await page.url()).includes('linkedin.com')) {
        throw new Error('Redirected away from LinkedIn');
      }

      const newPostsCount = await page.evaluate((selector) => {
        return document.querySelectorAll(selector).length;
      }, LINKEDIN_SELECTORS.POST);

      if (newPostsCount === postsCount && postsCount >= MIN_POSTS) {
        break;
      }

      postsCount = newPostsCount;
      previousHeight = currentHeight;
      currentHeight = await page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        break;
      }

      scrollAttempts++;
    } catch (err) {
      console.warn('Scroll attempt failed:', err);
      break;
    }
  }
  console.log(`Finished scrolling. Found ${postsCount} posts.`);
}

async function extractLinkedInPosts(page, profileUrl) {
  try {
    return await page.evaluate((SELECTORS, profileUrl) => {
      const posts = Array.from(document.querySelectorAll(SELECTORS.POST));
      const results = [];

      posts.forEach((post) => {
        try {
          const contentElement = post.querySelector(SELECTORS.CONTENT);
          const content = contentElement ? contentElement.innerText.trim() : '';
          
          const authorElement = post.querySelector(SELECTORS.AUTHOR);
          const author = authorElement ? authorElement.innerText.trim() : '';
          const authorProfile = authorElement?.href || '';
          
          const timeElement = post.querySelector(SELECTORS.DATE);
          const postDate = timeElement ? 
            new Date(timeElement.getAttribute('datetime') || timeElement.innerText) : 
            new Date();
          
          const likesElement = post.querySelector(SELECTORS.LIKES);
          const likes = likesElement ? parseInt(likesElement.innerText.trim().replace(/\D/g, '') || '0') : 0;
          
          const commentsElement = post.querySelector(SELECTORS.COMMENTS);
          const comments = commentsElement ? parseInt(commentsElement.innerText.trim().replace(/\D/g, '') || '0') : 0;
          
          const media = [];
          const mediaElements = post.querySelectorAll(SELECTORS.MEDIA);
          mediaElements.forEach(el => {
            if (el.tagName === 'IMG') {
              media.push({
                type: 'image',
                url: el.src || el.getAttribute('data-delayed-url') || ''
              });
            } else if (el.tagName === 'VIDEO') {
              const source = el.querySelector('source');
              if (source) {
                media.push({
                  type: 'video',
                  url: source.src || ''
                });
              }
            }
          });
          
          const links = [];
          const linkElements = post.querySelectorAll(SELECTORS.LINK);
          linkElements.forEach(link => {
            if (link.href && !link.href.includes('linkedin.com')) {
              links.push(link.href);
            }
          });

          const postUrl = post.querySelector('a.feed-shared-update-v2__footer-link')?.href || '';

          const companyElement = post.querySelector('.feed-shared-actor__sub-description');
          const company = companyElement ? companyElement.innerText.trim() : '';

          if (content || media.length > 0) {
            results.push({
              id: post.id || Math.random().toString(36).substring(2, 9),
              content,
              author,
              authorProfile,
              date: postDate.toISOString(),
              likes,
              comments,
              media,
              links,
              url: postUrl,
              isRepost: !!post.querySelector('.feed-shared-actor__sub-description'),
              company,
              profileUrl
            });
          }
        } catch (e) {
          console.error('Error processing post:', e);
        }
      });

      return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, LINKEDIN_SELECTORS, profileUrl);
  } catch (err) {
    console.error('Extraction failed:', err);
    return [];
  }
}

export async function scrapeLinkedInProfile(profileUrl, options = {}) {
  const {
    minPosts = MIN_POSTS,
    maxAgeDays = MAX_AGE_DAYS,
    requireLogin = true
  } = options;

  if (!profileUrl.includes('linkedin.com')) {
    throw new Error('Invalid LinkedIn URL');
  }

  // Normalize URL
  if (profileUrl.includes('/in/') && !profileUrl.includes('/detail/recent-activity')) {
    profileUrl = `${profileUrl.replace(/\/$/, '')}/detail/recent-activity`;
  }

  console.log(`Starting LinkedIn scrape for: ${profileUrl}`);

  let browser;
  let page;
  try {
    // Initialize chromium only if needed
    const chromiumArgs = isProduction ? (await chromium).args : [];
    const chromiumExecutablePath = isProduction ? await (await chromium).executablePath() : undefined;
    const chromiumHeadless = isProduction ? (await chromium).headless : false;

    const launchOptions = {
      args: [
        ...chromiumArgs,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 20) + 90}.0.0.0 Safari/537.36`,
        "--window-size=1920,1080"
      ],
      headless: chromiumHeadless,
      ignoreHTTPSErrors: true,
      timeout: BROWSER_LAUNCH_TIMEOUT,
    };

    if (isProduction) {
      launchOptions.executablePath = chromiumExecutablePath;
    } else {
      launchOptions.args.push("--start-maximized");
      launchOptions.slowMo = 200;
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    // Configure page
    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    await page.setDefaultTimeout(NAVIGATION_TIMEOUT);
    
    // Set random viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false,
    });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to profile
    await retryLinkedInNavigation(page, profileUrl);
    
    // Scroll to load more posts
    await scrollLinkedInPage(page);
    
    // Extract posts
    let posts = await extractLinkedInPosts(page, profileUrl);
    
    // Filter by date if needed
    if (maxAgeDays) {
      const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
      posts = posts.filter(post => new Date(post.date) >= cutoffDate);
    }

    // Ensure minimum posts
    if (posts.length < minPosts) {
      console.log(`Only found ${posts.length} posts, trying to scroll more...`);
      await scrollLinkedInPage(page);
      posts = await extractLinkedInPosts(page, profileUrl);
    }   

    return posts.slice(0, Math.max(minPosts, posts.length));
  } catch (err) {
    console.error("LinkedIn scraping failed:", err);
    throw err;
  } finally {
    try {
      if (page && !page.isClosed()) {
        await page.close().catch(e => console.warn('Page close error:', e));
      }
      if (browser) {
        await browser.close().catch(e => console.warn('Browser close error:', e));
      }
    } catch (e) {
      console.error("Cleanup failed:", e);
    }
  }
}