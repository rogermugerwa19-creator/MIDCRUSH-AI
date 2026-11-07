const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return json({ error: "MIDCRUSH AI is temporarily unavailable. Please try again later." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please send a valid chat message." }, 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
    return json({ error: "Please send between 1 and 12 recent messages." }, 400);
  }

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


  try {
    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        {
          role: "system",
          content: "You are MIDCRUSH AI, a helpful, clear and responsible assistant. Accuracy is more important than sounding confident. Before answering, check that facts, examples, definitions and classifications agree with one another. Never invent scientific names, species, statistics, sources or technical terms. If you are unsure or a fact may be outdated, say so plainly and give only what you can support. For science and school topics, use standard accepted terminology, distinguish related categories correctly, and explain important exceptions. For example, do not classify ferns as gymnosperms: ferns are seedless vascular plants that reproduce by spores. Do not describe plants as literally talking; explain chemical signalling accurately. Avoid presenting simplified phrases such as plants being the lungs of Earth as literal scientific descriptions. " " Adapt naturally to the user’s question and apparent needs: be concise for simple questions, explain step by step when useful, and give deeper detail for complex topics. Do not ask the user to choose a level. Use clear headings and examples when useful, and keep responses appropriate for a general audience."
        },
        ...messages
      ],
      max_completion_tokens: 1400,
      temperature: 0.35,
      chat_template_kwargs: { enable_thinking: false }
    });

    // Accept the documented chat-completion shape and the alternate text shape.
    const message = result?.choices?.[0]?.message;
    const candidates = [
      result?.response,
      message?.content,
      result?.output_text,
      result?.generated_text
    ];
    const answer = candidates.map(value => {
      if (typeof value === "string") return value.trim();
      if (Array.isArray(value)) {
        return value.map(part => typeof part === "string" ? part : (typeof part?.text === "string" ? part.text : "")).join("").trim();
      }
      if (value && typeof value === "object" && typeof value.text === "string") return value.text.trim();
      return "";
    }).find(Boolean) || "";

    if (!answer) {
      return json({ error: "The AI service returned an unexpected response. Please try again." }, 502);
    }
    const finishReason = result?.choices?.[0]?.finish_reason || result?.choices?.[0]?.finishReason || null;
    return json({ response: answer, truncated: finishReason === "length" || finishReason === "max_tokens" });
  } catch (error) {
    return json({ error: "MIDCRUSH AI is temporarily unavailable. Please try again shortly." }, 502);
  }
}
