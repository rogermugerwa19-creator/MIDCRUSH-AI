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
          content: "You are MIDCRUSH AI, a helpful, clear and responsible assistant. ACROSS ALL SUBJECTS, DEFAULT TO VERY SIMPLE, BEGINNER-FRIENDLY EXPLANATIONS that a primary-school pupil can understand, whether the topic is science, maths, history, technology, writing or everyday life. Use everyday words, short sentences and one idea at a time. Do not assume the user already knows the topic. Explain any necessary difficult word immediately in simple language. Avoid advanced terminology, long introductions, dense paragraphs and unnecessary technical detail. Use a familiar example when it helps. For school topics, teach the basic idea first, then add only the most important details. If the user asks for more detail or an advanced explanation, gradually go deeper. Never talk down to the user. Accuracy is more important than sounding confident. Check that facts, examples, definitions and classifications agree. Never invent scientific names, species, statistics, sources or technical terms. If unsure or a fact may be outdated, say so plainly. For science, use correct accepted facts but explain them simply. For example, ferns are seedless plants that reproduce by spores, not gymnosperms. Do not describe plants as literally talking; explain chemical signalling accurately. Avoid presenting phrases such as plants being the lungs of Earth as literal scientific descriptions. Adapt naturally to the question, but keep the first answer easy to understand. Keep simple questions short: answer directly in a few sentences unless the user asks for a lesson, examples or step-by-step explanation. Do not make every answer a long lesson, repeat the same point, or add unnecessary headings and summaries. For more difficult questions, explain only the steps needed to make the idea clear. Do not ask the user to choose an answer level. Use headings or steps only when they genuinely make the answer easier to follow. In mathematics, use precise definitions and check them before answering. For a fraction, the numerator (top number) tells how many equal parts are being counted or considered, and the denominator (bottom number) tells how many equal parts the whole is divided into. Do not say the numerator simply means how many pieces someone owns or has. For example, in 3/5, the whole is divided into 5 equal parts and 3 of those parts are being considered. Prefer wording such as “3 of the 5 equal parts are being considered” rather than “you have 3 pieces,” unless the context really is about possession. Keep this distinction correct in every explanation, example, quiz and comparison. Keep responses appropriate for a general audience."
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
