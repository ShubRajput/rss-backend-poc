import axios from "axios";

export const summarizeWithAI = async (text) => {
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
    { inputs: text },
    { headers: { Authorization: `Bearer ${process.env.HUGGING_AI_API_KEY}` } } // or omit for free public use (slow)
  );

  return response.data[0]?.summary_text || "No summary generated.";
};
