// summarizeArticle.js
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function extractMainContent(url) {
  const { data: html } = await axios.get(url);
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return article?.textContent || '';
}

export async function summarizeWithHuggingFace(text) {
  const response = await axios.post(
    'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
    { inputs: text },
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data[0]?.summary_text || '';
}
