// import puppeteer from "puppeteer";

// export async function fetchTelegramChannelPostsUsingPuppeteer(channelUrl) {
//   try {
//     const browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();
//     await page.goto(channelUrl, { waitUntil: "networkidle2", timeout: 60000 });

//     // Wait for posts to load (Telegram uses .tgme_widget_message for each message block)
//     await page.waitForSelector(".tgme_widget_message", { timeout: 20000 });

//     // Extract posts
//     const posts = await page.evaluate(() => {
//       const postNodes = Array.from(
//         document.querySelectorAll(".tgme_widget_message")
//       );

//       return postNodes.slice(0, 5).map((post) => {
//         const text =
//           post.querySelector(".tgme_widget_message_text")?.innerText.trim() ||
//           "";
//         const image = post.querySelector("img")?.src || null;
//         const time = post.querySelector("time")?.getAttribute("datetime") || "";
//         const postUrl =
//           post.querySelector("a.tgme_widget_message_date")?.href || "";

//         return {
//           title: text,
//           image,
//           time,
//           url: postUrl,
//         };
//       });
//     });

//     await browser.close();
//     return posts;
//   } catch (err) {
//     console.error("Telegram Scrape Error:", err.message);
//     return [];
//   }
// }
