const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function getApiBase(env) {
  const raw = typeof env.ACESTEP_API_URL === "string" ? env.ACESTEP_API_URL.trim() : "";
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function callAceStep(env, path, payload) {
  const base = getApiBase(env);
  if (!base) throw new Error("Music generation is not configured yet. The ACE-Step API address is missing or invalid.");

  const headers = { "Content-Type": "application/json" };
  if (env.ACESTEP_API_KEY) headers.Authorization = `Bearer ${env.ACESTEP_API_KEY}`;

  const response = await fetch(base + path, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.code && data.code !== 200)) {
    throw new Error("The music engine could not complete that request. Please try again later.");
  }
  return data;
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please send a valid music request." }, 400);
  }

  if (body.action === "create") {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const lyrics = typeof body.lyrics === "string" ? body.lyrics.trim() : "";
    const type = body.type === "instrumental" ? "instrumental" : "song";

    if (!prompt) return json({ error: "Describe the music you want to create." }, 400);
    if (prompt.length > 1200) return json({ error: "Keep the music description under 1,200 characters." }, 400);
    if (lyrics.length > 6000) return json({ error: "Keep the lyrics under 6,000 characters." }, 400);

    const duration = Number.isFinite(Number(body.duration))
      ? Math.min(180, Math.max(10, Number(body.duration)))
      : 60;
    let bpm;
    if (body.bpm !== "" && body.bpm != null) {
      const requestedBpm = Number(body.bpm);
      if (!Number.isFinite(requestedBpm) || requestedBpm < 30 || requestedBpm > 300) {
        return json({ error: "Tempo must be a number between 30 and 300 BPM." }, 400);
      }
      bpm = Math.round(requestedBpm);
    }

    const payload = {
      lyrics: type === "instrumental" ? "" : lyrics,
      thinking: type === "song",
      audio_format: "mp3",
      audio_duration: duration,
      inference_steps: 8,
      batch_size: 1,
      task_type: "text2music"
    };

    if (type === "song" && !lyrics) {
      payload.sample_query = prompt;
    } else {
      payload.prompt = type === "instrumental"
        ? prompt + ", instrumental music only, no vocals, no singing"
        : prompt;
    }
    if (bpm !== undefined) payload.bpm = bpm;

    try {
      const result = await callAceStep(env, "/release_task", payload);
      const taskId = result?.data?.task_id;
      if (typeof taskId !== "string" || !taskId) {
        return json({ error: "The music engine did not return a generation task. Please try again." }, 502);
      }
      return json({
        taskId,
        status: result.data.status || "queued",
        queuePosition: result.data.queue_position ?? null
      }, 202);
    } catch (error) {
      const message = error?.message || "";
      const status = /not configured/i.test(message) ? 503 : 502;
      return json({ error: status === 503 ? message : "The music engine is temporarily unavailable. Please try again later." }, status);
    }
  }

  if (body.action === "status") {
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(taskId)) {
      return json({ error: "The music task ID is invalid." }, 400);
    }

    try {
      const result = await callAceStep(env, "/query_result", { task_id_list: [taskId] });
      const item = Array.isArray(result?.data)
        ? result.data.find(entry => entry?.task_id === taskId)
        : null;
      if (!item) return json({ error: "The music task could not be found." }, 404);

      let details = item.result;
      if (typeof details === "string") {
        try { details = JSON.parse(details); } catch { details = []; }
      }
      if (!Array.isArray(details)) details = [];

      return json({
        taskId,
        status: Number(item.status),
        result: details.map(track => ({
          status: Number(track.status),
          file: typeof track.file === "string" ? track.file : "",
          lyrics: typeof track.lyrics === "string" ? track.lyrics : "",
          prompt: typeof track.prompt === "string" ? track.prompt : "",
          metadata: track.metas && typeof track.metas === "object" ? track.metas : {}
        }))
      });
    } catch {
      return json({ error: "Could not check the music generation status. Please try again." }, 502);
    }
  }

  return json({ error: "Unknown music action." }, 400);
}
