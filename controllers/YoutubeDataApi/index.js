// controllers/youtubeController.js
import axios from "axios";

const YOUTUBE_API_KEY = "AIzaSyApxMomnwpet3Tnlltxmy59mUb4xXVdPdk"; //Note: this google console project is setup in Darsh Yadav profile

export async function fetchVideosFromUrl(inputUrl, maxResults = 30) {
  try {
    const channelId = await extractChannelId(inputUrl);
    if (!channelId) throw new Error("Could not extract channel ID.");

    const apiUrl = "https://www.googleapis.com/youtube/v3/search";

    const response = await axios.get(apiUrl, {
      params: {
        key: YOUTUBE_API_KEY,
        channelId,
        part: "snippet",
        order: "date",
        maxResults,
      },
    });

    const videos = response.data.items
      .filter((item) => item.id.kind === "youtube#video")
      .map((item) => ({
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        publishedAt: item.snippet.publishedAt,
      }));

    return videos;
  } catch (err) {
    console.error("Failed to fetch YouTube videos:", err.message);
    throw err;
  }
}

export async function extractChannelId(url) {
    try {
      // Direct /channel/UCxxxxxx
      const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
      if (channelMatch) return channelMatch[1];
  
      // Video URL → Get channelId from video metadata
      const videoMatch = url.match(/v=([\w-]{11})|youtu\.be\/([\w-]{11})/);
      const videoId = videoMatch?.[1] || videoMatch?.[2];
      if (videoId) {
        const res = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
          params: {
            key: process.env.YOUTUBE_API_KEY,
            part: 'snippet',
            id: videoId
          }
        });
        return res.data.items?.[0]?.snippet?.channelId;
      }
  
      // @handle, /user/, /c/ → Fetch HTML and extract channelId
      const handleMatch = url.match(/youtube\.com\/(@[\w-]+|user\/[\w-]+|c\/[\w-]+)/);
      if (handleMatch) {
        const response = await axios.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
          }
        });
        const html = response.data;
  
        // Improved regex to extract channelId
        const idMatch = html.match(/"channelId":"(UC[\w-]{22})"/);
        if (idMatch) return idMatch[1];
  
        // Try another structure
        const metaMatch = html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})/);
        if (metaMatch) return metaMatch[1];
      }
    } catch (error) {
      console.error('Error extracting channel ID:', error.message);
    }
  
    return null;
  }
