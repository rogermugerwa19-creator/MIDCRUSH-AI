function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const requestUrl = new URL(request.url);
  const file = requestUrl.searchParams.get("file") || "";
  let audioUrl;
  try {
    audioUrl = new URL(file);
    if (audioUrl.protocol !== "https:" || audioUrl.hostname !== "cdn.treblo.com" ||
        !audioUrl.pathname.startsWith("/pubapi/generations3/")) {
      return json({ error: "Invalid audio file reference." }, 400);
    }
  } catch {
    return json({ error: "Invalid audio file reference." }, 400);
  }

  try {
    const upstream = await fetch(audioUrl.toString());
    if (!upstream.ok) return json({ error: "The generated audio is no longer available. Treblo may remove songs after its retention period." }, upstream.status === 404 ? 404 : 502);
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
