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

function decodeImage(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!match) return null;
  const binary = atob(match[2]);
  if (binary.length > 4 * 1024 * 1024) throw new Error("The uploaded image must be 4 MB or smaller.");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return json({ error: "Image generation is not connected to Cloudflare Workers AI. Check the AI binding in your Cloudflare Pages settings." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please send a valid image request." }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "Describe the image or edit you want." }, 400);
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
    form.append("guidance", body.originalImage ? "6" : "5");

    if (body.image) {
      let image;
      try {
        image = decodeImage(body.image);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
      if (!image) return json({ error: "Upload a JPG, PNG or WebP image." }, 400);
      form.append("input_image_0", image, "reference-image");

      if (body.originalImage) {
        let originalImage;
        try {
          originalImage = decodeImage(body.originalImage);
        } catch (error) {
          return json({ error: "The original reference image is invalid: " + error.message }, 400);
        }
        if (!originalImage) return json({ error: "The original reference must be a JPG, PNG or WebP image." }, 400);
        form.append("input_image_1", originalImage, "original-identity-reference");
      }
    }

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
    return json({ error: "Image generation or editing failed. Please try again in a moment." }, 502);
  }
}
