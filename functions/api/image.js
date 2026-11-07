const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

const dimensions = {
  "1:1": [1024, 1024],
  "16:9": [1280, 720],
  "9:16": [720, 1280],
  "4:3": [1152, 864],
  "3:2": [1248, 832],
  "2:3": [832, 1248]
};

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

  const aspectRatio = typeof body.aspectRatio === "string" && dimensions[body.aspectRatio]
    ? body.aspectRatio
    : "1:1";
  const [width, height] = dimensions[aspectRatio];

  try {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", String(width));
    form.append("height", String(height));
    const formResponse = new Response(form);
    const result = await env.AI.run("@cf/black-forest-labs/flux-2-klein-4b", {
      multipart: {
        body: formResponse.body,
        contentType: formResponse.headers.get("content-type")
      }
    });

    if (!result || typeof result.image !== "string" || !result.image) {
      return json({ error: "The image model returned no image. Please try a different prompt." }, 502);
    }

    return json({
      image: "data:image/jpeg;base64," + result.image,
      model: "FLUX.2 klein 4B",
      aspectRatio
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
