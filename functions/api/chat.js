const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return json({ error: "The AI service is not connected yet. Please finish the Workers AI binding in Cloudflare and redeploy." }, 503);
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
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are MIDCRUSH AI, a helpful, clear and responsible assistant. Give accurate answers, explain uncertainty, and keep responses appropriate for a general audience."
        },
        ...messages
      ],
      max_tokens: 700,
      temperature: 0.65
    });

    const answer = result && typeof result.response === "string" ? result.response : "";
    if (!answer) return json({ error: "The AI model returned an empty response. Please try again." }, 502);
    return json({ response: answer });
  } catch (error) {
    return json({ error: "The AI service is temporarily unavailable or its daily free allowance may have been reached. Please try again later." }, 502);
  }
}
