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
  if (!env.OPENAI_API_KEY) {
    return json({ error: "Image editing is not configured yet. Add the OPENAI_API_KEY secret in your Cloudflare Pages project settings." }, 503);
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
    form.append("model", "gpt-image-2.6-sunburst");
    form.append("prompt", prompt);
    form.append("size", `${width}x${height}`);
    form.append("quality", "high");
    form.append("output_format", "jpeg");

    let endpoint = "https://api.openai.com/v1/images/generations";

    if (body.image) {
      let image;
      try {
        image = decodeImage(body.image);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
      if (!image) return json({ error: "Upload a JPG, PNG or WebP image." }, 400);
      form.append("image[]", image, "source-photo.jpg");
      endpoint = "https://api.openai.com/v1/images/edits";

      if (body.originalImage) {
        let originalImage;
        try {
          originalImage = decodeImage(body.originalImage);
        } catch (error) {
          return json({ error: "The original reference image is invalid: " + error.message }, 400);
        }
        if (!originalImage) return json({ error: "The original reference must be a JPG, PNG or WebP image." }, 400);
        form.append("image[]", originalImage, "original-identity-reference.jpg");
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMessage = typeof result.error?.message === "string" ? result.error.message : "";
      if (response.status === 401 || response.status === 403) {
        return json({ error: "OpenAI rejected the API key or the account does not have image API access. Check the key, billing and organisation verification." }, 502);
      }
      if (response.status === 429) {
        return json({ error: "The OpenAI image API rate limit or available balance has been reached. Check API usage and billing, then try again." }, 429);
      }
      return json({ error: apiMessage || "The OpenAI image service could not complete this request." }, response.status >= 500 ? 502 : response.status);
    }

    const imageData = result.data?.[0]?.b64_json;
    if (typeof imageData !== "string" || !imageData) {
      return json({ error: "The image model returned no image. Please try a different prompt." }, 502);
    }

    return json({
      image: "data:image/jpeg;base64," + imageData,
      model: "GPT Image 2.6 Sunburst",
      aspectRatio
    });
  } catch {
    return json({ error: "Image generation or editing failed because the image service could not be reached. Please try again." }, 502);
  }
}
