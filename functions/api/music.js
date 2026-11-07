const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function getTrebloKey(env) {
  return typeof env.TREBLO_API_KEY === "string" ? env.TREBLO_API_KEY.trim() : "";
}

async function trebloRequest(env, path, options = {}) {
  const key = getTrebloKey(env);
  if (!key) throw new Error("Treblo is not connected yet. Add TREBLO_API_KEY as a server-side Cloudflare secret.");
  const response = await fetch("https://api.treblo.com/v1" + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + key,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = raw; }
  if (!response.ok) {
    const message = data && typeof data === "object" && typeof data.detail === "string"
      ? data.detail
      : "Treblo could not complete the request. Check the API account's available credits and try again.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function errorResponse(error) {
  if (/not connected/i.test(error?.message || "")) return json({ error: error.message }, 503);
  if (error?.status === 401 || error?.status === 403) return json({ error: "Treblo rejected the API key. Check the server-side secret." }, 502);
  if (error?.status === 402 || error?.status === 429) return json({ error: "Treblo has reported a credit or request limit. Check the account balance and limits." }, 429);
  return json({ error: "The music service is temporarily unavailable. Please try again later." }, 502);
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Please send a valid music request." }, 400); }

  if (body.action === "create") {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const lyrics = typeof body.lyrics === "string" ? body.lyrics.trim() : "";
    const instrumental = body.type === "instrumental";
    if (!prompt) return json({ error: "Describe the music you want to create." }, 400);
    if (prompt.length > 1200) return json({ error: "Keep the music description under 1,200 characters." }, 400);
    if (lyrics.length > 6000) return json({ error: "Keep the lyrics under 6,000 characters." }, 400);
    if (instrumental && lyrics) return json({ error: "Remove the lyrics field for an instrumental track." }, 400);

    const payload = {
      prompt,
      instrumental,
      output_format: "mp3"
    };
    if (!instrumental && lyrics) payload.lyrics = lyrics;

    try {
      const result = await trebloRequest(env, "/generations/v3", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (typeof result?.task_id !== "string" || !result.task_id) {
        return json({ error: "Treblo did not return a generation task ID." }, 502);
      }
      return json({ taskId: result.task_id, status: "RECEIVED" }, 202);
    } catch (error) { return errorResponse(error); }
  }

  if (body.action === "status") {
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(taskId)) return json({ error: "The music task ID is invalid." }, 400);
    try {
      const statusResult = await trebloRequest(env, "/generations/status/" + encodeURIComponent(taskId), { method: "GET" });
      const status = typeof statusResult === "string" ? statusResult : statusResult?.status;
      if (status === "FAILURE") return json({ status: 2, result: [] });
      if (status !== "SUCCESS") return json({ status: 0, result: [], providerStatus: status || "GENERATING" });

      const generation = await trebloRequest(env, "/generations/" + encodeURIComponent(taskId), { method: "GET" });
      const paths = Array.isArray(generation?.song_paths) ? generation.song_paths : [];
      const file = paths.find(path => typeof path === "string" && path.startsWith("https://cdn.treblo.com/"));
      if (!file) return json({ error: "Treblo completed the song but did not return a recognized audio URL." }, 502);
      return json({
        status: 1,
        result: [{
          status: 1,
          file,
          lyrics: typeof generation.lyrics === "string" ? generation.lyrics : "",
          prompt: typeof generation.prompt === "string" ? generation.prompt : ""
        }]
      });
    } catch (error) { return errorResponse(error); }
  }

  return json({ error: "Unknown music action." }, 400);
}
