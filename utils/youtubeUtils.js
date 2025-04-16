import axios from 'axios';
import xml2js from 'xml2js';

export function isYouTubeUrl(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export async function fetchYouTubeFeed(url) {
  try {
    const channelId = await extractChannelId(url);
    if (!channelId) return [];

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await axios.get(feedUrl);

    const result = await xml2js.parseStringPromise(response.data, { explicitArray: false });
    const entries = result.feed.entry || [];

    // Sort by published date, latest first
    const sorted = Array.isArray(entries)
      ? entries.sort((a, b) => new Date(b.published) - new Date(a.published))
      : [entries];

    return sorted.map((entry) => ({
      title: entry.title,
      url: entry.link['$'].href,
      image: `https://img.youtube.com/vi/${entry['yt:videoId']}/hqdefault.jpg`,
    }));
  } catch (error) {
    console.error('Error fetching YouTube feed:', error.message);
    return [];
  }
}

async function extractChannelId(url) {
  const match = url.match(/(channel\/|user\/|@)([A-Za-z0-9_\-]+)/);
  if (match) {
    const type = match[1];
    const idOrName = match[2];

    if (type === 'channel/') return idOrName;

    // Resolve user or handle to channel ID
    try {
      const response = await axios.get(`https://www.youtube.com/${type}${idOrName}`);
      const html = response.data;
      const matched = html.match(/"channelId":"(UC[\w-]+)"/);
      return matched ? matched[1] : null;
    } catch (err) {
      console.error('Error resolving user/handle:', err.message);
    }
  }

  // Fallback: Try to extract from video URL
  const videoId = extractVideoId(url);
  if (videoId) {
    try {
      const { data } = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (data.author_url) {
        const channelIdMatch = data.author_url.match(/channel\/(UC[\w-]+)/);
        return channelIdMatch ? channelIdMatch[1] : null;
      }
    } catch (err) {
      console.error('Fallback oEmbed channel fetch failed:', err.message);
    }
  }

  return null;
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|$)/);
  return match ? match[1] : null;
}


