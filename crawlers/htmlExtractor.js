import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const extractFromHTML = async (url) => {
  const { data: html } = await axios.get(url);
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return {
    title: article.title,
    content: article.textContent
  };
};
