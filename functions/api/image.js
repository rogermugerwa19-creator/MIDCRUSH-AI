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


function describeModelError(error) {
  const message = String(error?.message || error?.cause?.message || error || "Unknown image model error")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, 500);
  const codeMatch = message.match(/\\b(3036|3040|3043|3006|3007|3008|5004|5007|5016|5018|5035)\\b/);
  const code = codeMatch ? Number(codeMatch[1]) : Number(error?.code || 0) || null;
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0) || null;
  return { message, code, status };
}

function isTemporaryImageError(details) {
  if (details.code === 3036) return false; // Daily free allocation, not a transient failure.
  if (details.code === 3040 || details.code === 3043 || details.code === 3007 || details.code === 3008) return true;
  if (details.status === 408 || details.status === 409 || details.status === 429 || details.status >= 500) return true;
  return /out of capacity|capacity temporarily|temporarily unavailable|service busy|timed? ?out|overloaded|internal server error|empty image result|try again/i.test(details.message);
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function imageErrorResponse(error, modelName) {
  const details = describeModelError(error);
  console.error("MIDCRUSH AI image model failure:", {
    model: modelName,
    code: details.code,
    status: details.status,
    message: details.message
  });

  if (details.code === 3036 || /daily free allocation|10,000 neurons/i.test(details.message)) {
    return json({ error: "The Cloudflare AI daily free allowance has been used up. It resets at 00:00 UTC. Try again after it resets.", code: details.code }, 429);
  }
  if (details.code === 3040 || /out of capacity|capacity temporarily/i.test(details.message)) {
    return json({ error: "The image service is temporarily at capacity. MIDCRUSH AI retried FLUX.2 Klein 9B and tried its smaller 4B fallback, but both were busy. Please try again shortly.", code: details.code }, 503);
  }
  if (details.code === 3043 || /internal server error/i.test(details.message)) {
    return json({ error: "The image service encountered a temporary internal error (3043). MIDCRUSH AI retried its main model and tried its smaller fallback, but the service is still failing. Please try again shortly.", code: details.code || 3043 }, 503);
  }
  if (details.status === 429) {
    return json({ error: "The image service is temporarily rate-limited. MIDCRUSH AI already retried; please wait briefly before trying again.", code: 429 });
  }
  if (details.status >= 500) {
    return json({ error: "Cloudflare's image service returned a temporary server error (HTTP " + details.status + "). MIDCRUSH AI retried and attempted its smaller fallback model. Please try again shortly.", code: details.status }, 503);
  }
  if (details.code === 3007 || details.code === 3008 || details.status === 408) {
    return json({ error: "The image service timed out while processing your photo. Your upload is still available; try Edit photo again.", code: details.code || details.status }, 504);
  }
  if (details.code === 3006 || details.status === 413) {
    return json({ error: "The image service rejected the request because it was too large. Try a smaller photo.", code: details.code || details.status }, 413);
  }
  if (details.code === 5004) {
    return json({ error: "The image service could not read the uploaded image. Try saving it as JPG or PNG and uploading it again.", code: details.code }, 400);
  }
  if (details.code === 5007 || details.code === 5035 || details.code === 5016 || details.code === 5018) {
    return json({ error: "The configured Cloudflare image model is unavailable or not enabled for this account. Check the Workers AI model access in Cloudflare.", code: details.code }, 503);
  }

  const safeDetail = details.message
    .replace(/https?:\/\/\S+/gi, "[service URL]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 180);
  return json({
    error: safeDetail
      ? "The image service returned an unexpected error: " + safeDetail
      : "The image service failed unexpectedly. Please try again.",
    code: details.code || details.status || null
  }, 502);
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

  const requestedPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const isEdit = Boolean(body.isEdit);
  if (!requestedPrompt) return json({ error: "Describe the image or edit you want." }, 400);
  if (requestedPrompt.length > (isEdit ? 1200 : 1800)) {
    return json({ error: isEdit ? "Please keep your photo-edit instructions under 1,200 characters." : "Please keep your prompt under 1,800 characters." }, 400);
  }

  // Treat the uploaded photo as the source of truth. Restrict changes to the user's request
  // and explicitly protect people, objects, framing and details that were not mentioned.
  const prompt = isEdit
    ? [
        "Edit the supplied photograph itself; do not create a different photograph or reinterpret the scene.",
        "Treat the uploaded image as the authoritative visual reference. Preserve the same subject and recognizable identity, facial structure, skin tone, hair, expression, proportions, pose, clothing and accessories unless the user explicitly asks to change one of these.",
        "Keep the original camera angle, framing, composition, lighting, and all background details and objects that the user did not ask to change.",
        "Make only the requested edit. Do not beautify, replace, add, remove, or redesign any unrequested subject or detail. When a style change is explicitly requested, apply that style while keeping the subject recognizably the same.",
        "Requested edit: " + requestedPrompt
      ].join(" ")
    : requestedPrompt;
  if (prompt.length > 1800) return json({ error: "Please shorten your photo-edit instructions and try again." }, 400);

  let aspectRatio = typeof body.aspectRatio === "string" && (dimensions[body.aspectRatio] || body.aspectRatio === "original")
    ? body.aspectRatio
    : "1:1";
  let [width, height] = dimensions[aspectRatio] || dimensions["1:1"];
  if (isEdit && aspectRatio === "original") {
    const originalWidth = Number(body.originalWidth);
    const originalHeight = Number(body.originalHeight);
    if (Number.isFinite(originalWidth) && Number.isFinite(originalHeight) &&
        originalWidth >= 1 && originalHeight >= 1 &&
        originalWidth <= 100000 && originalHeight <= 100000) {
      const longest = Math.max(originalWidth, originalHeight);
      const shortest = Math.min(originalWidth, originalHeight);
      const scale = longest > 1920 ? 1920 / longest : shortest < 256 ? 256 / shortest : 1;
      const proposedWidth = Math.round(originalWidth * scale);
      const proposedHeight = Math.round(originalHeight * scale);
      if (proposedWidth >= 256 && proposedWidth <= 1920 &&
          proposedHeight >= 256 && proposedHeight <= 1920) {
        width = proposedWidth;
        height = proposedHeight;
      } else {
        aspectRatio = "1:1";
        [width, height] = dimensions["1:1"];
      }
    } else {
      aspectRatio = "1:1";
      [width, height] = dimensions["1:1"];
    }
  }

  try {
    let image = null;
    if (body.image) {
      try {
        image = decodeImage(body.image);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
      if (!image) return json({ error: "Upload a JPG, PNG or WebP image." }, 400);
    }

    async function runFlux(modelId) {
      // Rebuild FormData for each attempt because multipart streams can only be consumed once.
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("width", String(width));
      form.append("height", String(height));
      if (isEdit) form.append("guidance", "6");
      if (body.image) {
        form.append("input_image_0", image, "reference-image");
        if (originalImage) form.append("input_image_1", originalImage, "original-identity-reference");
      }
      const formResponse = new Response(form);
      const result = await env.AI.run(modelId, {
        multipart: {
          body: formResponse.body,
          contentType: formResponse.headers.get("content-type")
        }
      });
      if (result?.error) {
        const detail = typeof result.error?.message === "string" ? result.error.message : String(result.error);
        throw new Error(detail);
      }
      if (!result || typeof result.image !== "string" || !result.image) {
        throw new Error("The image model returned an empty image result.");
      }
      return result;
    }

    let originalImage = null;
    if (body.originalImage) {
      try {
        originalImage = decodeImage(body.originalImage);
      } catch (error) {
        return json({ error: "The original reference image is invalid: " + error.message }, 400);
      }
      if (!originalImage) return json({ error: "The original reference must be a JPG, PNG or WebP image." }, 400);
    }

    const primaryModel = "@cf/black-forest-labs/flux-2-klein-9b";
    const fallbackModel = "@cf/black-forest-labs/flux-2-klein-4b";
    let result = null;
    let modelUsed = primaryModel;
    let lastError = null;

    // One automatic retry for temporary capacity, timeout, and transient server errors.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await runFlux(primaryModel);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const details = describeModelError(error);
        if (!isTemporaryImageError(details)) break;
        if (attempt === 0) await wait(details.code === 3043 ? 1200 : 900);
      }
    }

    // If the 9B model is still temporarily unavailable, make one attempt with
    // the lighter 4B model. Do not switch models for quota or invalid-input errors.
    if (!result && lastError && isTemporaryImageError(describeModelError(lastError))) {
      try {
        modelUsed = fallbackModel;
        result = await runFlux(fallbackModel);
        lastError = null;
      } catch (error) {
        lastError = error;
      }
    }

    if (!result) {
      const failure = imageErrorResponse(lastError || new Error("Unknown image model failure"), modelUsed);
      return failure;
    }

    return json({
      image: "data:image/jpeg;base64," + result.image,
      model: modelUsed === fallbackModel ? "FLUX.2 Klein 4B (automatic fallback)" : "FLUX.2 Klein 9B",
      aspectRatio
    });
  } catch (error) {
    return imageErrorResponse(error, "FLUX.2 Klein 9B");
  }
}
