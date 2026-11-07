const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return json({ error: "Image generation is not connected to Cloudflare Workers AI. Check the AI binding in your Cloudflare Pages settings." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please enter a valid image prompt." }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "Describe the image you want to create." }, 400);
  if (prompt.length > 1800) return json({ error: "Please keep your prompt under 1,800 characters." }, 400);

  try {
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt,
      steps: 4
    });

    if (!result || typeof result.image !== "string" || !result.image) {
      return json({ error: "The image model returned no image. Please try a different prompt." }, 502);
    }

    return json({
      image: "data:image/jpeg;base64," + result.image,
      model: "FLUX.1 schnell"
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (/3036|10,000 neurons|daily free allocation/i.test(message)) {
      return json({ error: "The free daily Cloudflare AI allowance has been used up. It resets at 00:00 UTC. Try again after it resets." }, 429);
    }
    if (/3040|out of capacity|capacity/i.test(message)) {
      return json({ error: "The image service is busy right now. Please wait a little and try again." }, 503);
    }
    return json({ error: "Image generation failed. Please try again in a moment." }, 502);
  }
}
