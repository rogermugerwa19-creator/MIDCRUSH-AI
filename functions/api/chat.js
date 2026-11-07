const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

const SYSTEM_PROMPT = "You are MIDCRUSH AI, a helpful, clear and responsible assistant. ACROSS ALL SUBJECTS, DEFAULT TO VERY SIMPLE, BEGINNER-FRIENDLY EXPLANATIONS that a primary-school pupil can understand, whether the topic is science, maths, history, technology, writing or everyday life. Use everyday words, short sentences and one idea at a time. Do not assume the user already knows the topic. Explain any necessary difficult word immediately in simple language. Avoid advanced terminology, long introductions, dense paragraphs and unnecessary technical detail. Use a familiar example when it helps. For school topics, teach the basic idea first, then add only the most important details. If the user asks for more detail or an advanced explanation, gradually go deeper. Never talk down to the user. Accuracy is more important than sounding confident. Check that facts, examples, definitions and classifications agree. Never invent scientific names, species, statistics, sources or technical terms. If unsure or a fact may be outdated, say so plainly. For science, use correct accepted facts but explain them simply. For example, ferns are seedless plants that reproduce by spores, not gymnosperms. Do not describe plants as literally talking; explain chemical signalling accurately. Avoid presenting phrases such as plants being the lungs of Earth as literal scientific descriptions. Adapt naturally to the question, but keep the first answer easy to understand. Keep simple questions short: answer directly in a few sentences unless the user asks for a lesson, examples or step-by-step explanation. Do not make every answer a long lesson, repeat the same point, or add unnecessary headings and summaries. For more difficult questions, explain only the steps needed to make the idea clear. Do not ask the user to choose an answer level. Use headings or steps only when they genuinely make the answer easier to follow. In mathematics, use precise definitions and check them before answering. For a fraction, the numerator (top number) tells how many equal parts are being counted or considered, and the denominator (bottom number) tells how many equal parts the whole is divided into. Do not say the numerator simply means how many pieces someone owns or has. For example, in 3/5, the whole is divided into 5 equal parts and 3 of those parts are being considered. Prefer wording such as “3 of the 5 equal parts are being considered” rather than “you have 3 pieces,” unless the context really is about possession. Keep this distinction correct in every explanation, example, quiz and comparison. Keep responses appropriate for a general audience.";

function extractText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(part => typeof part === "string" ? part : (typeof part?.text === "string" ? part.text : "")).join("").trim();
  }
  if (value && typeof value === "object" && typeof value.text === "string") return value.text.trim();
  return "";
}

function getOpenAIAnswer(data) {
  return extractText(data?.choices?.[0]?.message?.content) ||
    extractText(data?.response) ||
    extractText(data?.output_text) ||
    extractText(data?.generated_text);
}

async function callOpenAICompatible({ name, url, key, model, messages, headers = {}, image }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.map((item, index) => image && index === messages.length - 1 && item.role === "user" ? { role: "user", content: [{ type: "text", text: item.content }, { type: "image_url", image_url: { url: image } }] } : item)],
      max_tokens: 1400,
      temperature: 0.35
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${name} returned HTTP ${response.status}`);
  }
  const answer = getOpenAIAnswer(data);
  if (!answer) throw new Error(`${name} returned an empty response`);
  return { response: answer, provider: name, truncated: data?.choices?.[0]?.finish_reason === "length" };
}

async function callGemini(key, messages, image) {
  const contents = messages.map(item => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }, ...(image && item === messages[messages.length - 1] && item.role === "user" ? [{ inlineData: { mimeType: image.slice(5, image.indexOf(";")), data: image.slice(image.indexOf(",") + 1) } }] : [])]
  }));
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 1400, temperature: 0.35 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}`);
  const answer = extractText(data?.candidates?.[0]?.content?.parts);
  if (!answer) throw new Error("Gemini returned an empty response");
  return {
    response: answer,
    provider: "Gemini",
    truncated: data?.candidates?.[0]?.finishReason === "MAX_TOKENS"
  };
}

async function callCloudflare(ai, messages) {
  const result = await ai.run("@cf/zai-org/glm-4.7-flash", {
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    max_completion_tokens: 1400,
    temperature: 0.35
  });
  const answer = getOpenAIAnswer(result);
  if (!answer) throw new Error("Cloudflare AI returned an empty response");
  const finishReason = result?.choices?.[0]?.finish_reason || result?.choices?.[0]?.finishReason || null;
  return {
    response: answer,
    provider: "Cloudflare",
    truncated: finishReason === "length" || finishReason === "max_tokens"
  };
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please send a valid chat message." }, 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
    return json({ error: "Please send between 1 and 12 recent messages." }, 400);
  }

  const image = typeof body.image === "string" ? body.image : "";
  if (image && (!/^data:image\/(jpeg|png|webp);base64,/i.test(image) || image.length > 5_800_000)) return json({ error: "The photo must be a JPG, PNG or WebP image smaller than 4 MB." }, 400);
  const messages = [];
  let totalCharacters = 0;
  for (const item of body.messages) {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
      return json({ error: "One of the messages is invalid." }, 400);
    }
    const content = item.content.trim();
    if (!content || content.length > 3000) {
      return json({ error: "Each message must contain 1 to 3,000 characters." }, 400);
    }
    totalCharacters += content.length;
    messages.push({ role: item.role, content });
  }

  if (totalCharacters > 10000 || messages[messages.length - 1].role !== "user") {
    return json({ error: "The conversation is too long or the latest message is missing." }, 400);
  }

  // Providers are tried in order. Only providers with configured secrets are attempted.
  const providers = [];
  if (env.GROQ_API_KEY) {
    providers.push(() => callOpenAICompatible({
      name: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: env.GROQ_API_KEY,
      model: image ? "meta-llama/llama-4-scout-17b-16e-instruct" : "openai/gpt-oss-20b",
      messages,
      image
    }));
  }
  if (env.GEMINI_API_KEY) {
    providers.push(() => callGemini(env.GEMINI_API_KEY, messages, image));
  }
  if (env.OPENROUTER_API_KEY) {
    providers.push(() => callOpenAICompatible({
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: env.OPENROUTER_API_KEY,
      model: "openrouter/free",
      messages,
      image,
      headers: { "HTTP-Referer": "https://midcrush-ai.pages.dev", "X-Title": "MIDCRUSH AI" }
    }));
  }
  if (env.AI && !image) {
    providers.push(() => callCloudflare(env.AI, messages));
  }

  if (providers.length === 0) {
    return json({ error: "MIDCRUSH AI is not connected to an AI provider yet. Please configure a provider in Cloudflare Pages settings." }, 503);
  }

  for (const attempt of providers) {
    try {
      const result = await attempt();
      return json(result);
    } catch (error) {
      // Continue to the next configured provider if this one is unavailable,
      // rate-limited, misconfigured, or returns an unusable response.
    }
  }

  return json({
    error: "All configured AI providers are temporarily unavailable or have reached their limits. Please try again later."
  }, 503);
}
