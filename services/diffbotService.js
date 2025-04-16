// services/diffbotService.js
import axios from "axios";

export async function extractWithDiffbot(url) {
  try {
    const response = await axios.get("https://api.diffbot.com/v3/extract", {
      params: {
        token: "456dc80eca67de3fb0c5e5f132f9e2a4",
        url,
      },
    });

    const data = response.data;

    if (data && data.objects && data.objects.length > 0) {
      const content = data.objects[0];
      return {
        title: content.title,
        text: content.text,
        images: content.images,
        meta: {
          author: content.author,
          date: content.date,
          tags: content.tags,
        },
      };
    } else {
      return { error: "No content found." };
    }
  } catch (err) {
    console.error("Diffbot Extract API failed:", err.message);
    return { error: err.message };
  }
}

export async function extractWithDiffbotAnalyze(url) {
  try {
    const params = new URLSearchParams({
      token: '456dc80eca67de3fb0c5e5f132f9e2a4',
      url: url,
    });

    const response = await axios.get(
      `https://api.diffbot.com/v3/analyze?${params.toString()}`
    );
    const data = response.data;
    console.log("Response is ", response);
    

    if (data && data.objects && data.objects.length > 0) {
      return data.objects.map((obj) => ({
        type: obj.type,
        title: obj.title,
        text: obj.text,
        images: obj.images?.map((img) => img.url),
        meta: {
          author: obj.author,
          date: obj.date,
          tags: obj.tags,
        },
        url: obj.pageUrl,
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error("Diffbot Analyze API failed:", error.message);
    return [];
  }
}
