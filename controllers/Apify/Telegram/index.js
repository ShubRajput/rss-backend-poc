// controllers/telegramController.js

import { ApifyClient } from "apify-client";
import { API_KEY2 } from "../constant.js";

const apifyClient = new ApifyClient({
  token: API_KEY2, // move to .env in production
});

export async function fetchApifyTelegramFeed(channelUrl, days = 30) {
  try {
    // Extract the channel username from the URL
    const usernameMatch = channelUrl.match(
      /(?:t(?:elegram)?\.me\/(?:s\/)?)([a-zA-Z0-9_]+)/
    );
    const channelUsername = usernameMatch?.[1];

    if (!channelUsername) {
      throw new Error("Invalid Telegram channel URL");
    }

    // Prepare the input for the actor
    const input = {
      collectMessages: true,
      profiles: [channelUsername],
      scrapeLastNDays: days,
    };

    // Run the actor
    const run = await apifyClient
      .actor("tri_angle/telegram-scraper")
      .call(input);

    console.log("Runn is", run);
    

    // Fetch the scraped messages from the dataset
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    console.log("Item are", items);
    

    // Sort messages by date descending (latest first)
    const sortedItems = items.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Process and return the messages
    const messages = sortedItems.map((item, index) => ({
      id: `${channelUsername}_${index}`,
      text: item.message || "",
      date: item.date,
      url: `https://t.me/${channelUsername}/${item.message_id || ""}`,
      media: item.media || null,
    }));

    return messages;
  } catch (error) {
    console.error("Error fetching Telegram channel messages:", error.message);
    throw new Error("Failed to fetch Telegram channel messages.");
  }
}


// export async function fetchApifyTelegramFeed(
//   channelUrl,
//   batchSize = 100,
//   totalMessages = 300
// ) {
//   try {
//     const usernameMatch = channelUrl.match(
//       /(?:t(?:elegram)?\.me\/(?:s\/)?)([a-zA-Z0-9_]+)/
//     );
//     const channelUsername = usernameMatch?.[1];

//     if (!channelUsername) {
//       throw new Error("Invalid Telegram channel URL");
//     }

//     const allMessages = [];
//     const latestStartId = 10000; // This is an estimate, you can adjust this value

//     for (
//       let to = latestStartId;
//       to > latestStartId - totalMessages;
//       to -= batchSize
//     ) {
//       const from = Math.max(to - batchSize + 1, 1);

//       const run = await apifyClient
//         .actor("danielmilevski9/telegram-channel-scraper")
//         .call({
//           channels: [channelUsername],
//           from,
//           to,
//         });

//       const { items } = await apifyClient
//         .dataset(run.defaultDatasetId)
//         .listItems();

//       const parsed = items.map((item) => ({
//         id: item.id,
//         text: item.text || "",
//         date: item.date,
//         url: `https://t.me/${channelUsername}/${item.id}`,
//         media: item.photo_url || item.video_url || null,
//       }));

//       allMessages.push(...parsed);

//       if (items.length < batchSize) break;
//     }

//     return allMessages;
//   } catch (error) {
//     console.error("Error fetching latest Telegram messages:", error.message);
//     throw new Error("Failed to fetch latest Telegram channel messages.");
//   }
// }
