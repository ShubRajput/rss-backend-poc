// import { chromium } from 'playwright'; // NOT puppeteer
// import play from 'play-dl';

// // === Function 1: Playwright YouTube Scraper ===
// export async function fetchYouTubeVideosWithPlaywright(url) {
//   console.log("Reached in fetchYouTubeVideosWithPlaywright");

//   let browser;
//   try {
//     browser = await chromium.launch({
//       headless: true, // always headless in production
//       args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     });

//     const page = await browser.newPage();
//     await page.goto(url, {
//       waitUntil: 'networkidle',
//       timeout: 100000,
//     });

//     // Scroll to load more videos
//     await autoScroll(page);

//     const videoData = await page.evaluate(() => {
//       const videos = [];
//       const elements = document.querySelectorAll('a#video-title');
//       elements.forEach(el => {
//         const title = el.innerText.trim();
//         const href = el.getAttribute('href');
//         const videoIdMatch = href?.match(/v=([a-zA-Z0-9_-]{11})/);
//         const videoId = videoIdMatch ? videoIdMatch[1] : null;
//         const fullUrl = `https://www.youtube.com${href}`;
//         const image = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

//         if (title && href && videoId) {
//           videos.push({ title, url: fullUrl, image });
//         }
//       });
//       return videos;
//     });

//     return videoData;
//   } catch (err) {
//     console.error('Playwright scraping error:', err.message);
//     return [];
//   } finally {
//     if (browser) await browser.close();
//   }
// }

// // === Helper: Auto Scroll (same logic) ===
// async function autoScroll(page) {
//   await page.evaluate(async () => {
//     await new Promise((resolve) => {
//       let totalHeight = 0;
//       const distance = 400;
//       const timer = setInterval(() => {
//         window.scrollBy(0, distance);
//         totalHeight += distance;
//         if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
//           clearInterval(timer);
//           resolve();
//         }
//       }, 400);
//     });
//   });
// }

// // === Function 2: Handle YT input (video/channel) ===
// export async function handleYouTubeInputWithPlaywright(url) {
//   try {
//     const isVideo = play.yt_validate(url) === 'video';

//     if (!isVideo) {
//       return await fetchYouTubeVideosWithPlaywright(url);
//     }

//     const info = await play.video_basic_info(url);
//     const channelId = info.video_details.channel.id;

//     if (!channelId) {
//       console.error("Channel ID not found using play-dl");
//       return [];
//     }

//     const channelUrl = `https://www.youtube.com/channel/${channelId}`;
//     console.log("Extracted channel URL using play-dl:", channelUrl);

//     return await fetchYouTubeVideosWithPlaywright(channelUrl);
//   } catch (err) {
//     console.error("Error resolving YouTube URL with play-dl:", err.message);
//     return [];
//   }
// }


///New code:

import { chromium } from 'playwright';

export async function handleYouTubeInputWithPlaywright(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await autoScroll(page);

  const videos = await page.evaluate(() => {
    const data = [];
    document.querySelectorAll('a#video-title').forEach(el => {
      const title = el.textContent.trim();
      const href = el.getAttribute('href');
      const videoId = href?.match(/v=([a-zA-Z0-9_-]{11})/)?.[1];
      const fullUrl = `https://www.youtube.com${href}`;
      const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
      if (title && href && thumbnail) data.push({ title, url: fullUrl, image: thumbnail });
    });
    return data;
  });

  await browser.close();
  return videos;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}
