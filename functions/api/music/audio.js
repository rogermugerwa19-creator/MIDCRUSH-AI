function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getApiBase(env) {
  const raw = typeof env.ACESTEP_API_URL === "string" ? env.ACESTEP_API_URL.trim() : "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const requestUrl = new URL(request.url);
  const file = requestUrl.searchParams.get("file") || "";
  if (!file.startsWith("/v1/audio?")) return json({ error: "Invalid audio file reference." }, 400);

  const base = getApiBase(env);
  if (!base) return json({ error: "Music generation is not configured yet." }, 503);

  let audioUrl;
  try {
    audioUrl = new URL(file, base);
    if (audioUrl.origin !== new URL(base).origin || audioUrl.pathname !== "/v1/audio" || !audioUrl.searchParams.has("path")) {
      return json({ error: "Invalid audio file reference." }, 400);
    }
  } catch {
    return json({ error: "Invalid audio file reference." }, 400);
  }

  const headers = {};
  if (env.ACESTEP_API_KEY) headers.Authorization = `Bearer ${env.ACESTEP_API_KEY}`;

  try {
    const upstream = await fetch(audioUrl.toString(), { headers });
    if (!upstream.ok) return json({ error: "The generated audio is not available yet." }, upstream.status === 404 ? 404 : 502);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
        "Content-Disposition": "inline; filename=\"midcrush-music.mp3\"",
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return json({ error: "Could not retrieve the generated audio." }, 502);
  }
}
