# MIDCRUSH Music API foundation

This branch adds the first server-side adapter for the ACE-Step 1.5 music engine.

## Current scope

- `POST /api/music` with `action: "create"` submits a music-generation task.
- `POST /api/music` with `action: "status"` checks a task and returns its track metadata.
- The ACE-Step server address and API key stay in Cloudflare environment secrets; they are never sent to browser code.
- Song requests with empty lyrics use ACE-Step sample mode to generate lyrics automatically.
- Instrumental requests send an explicit no-vocals instruction and empty lyrics.
- Generation duration is capped at 180 seconds and each request creates one track.

## Required Cloudflare Pages environment variables

Configure these as server-side environment variables/secrets for the Pages project:

- `ACESTEP_API_URL` — base URL of the running ACE-Step API, for example `https://music-api.example.com`. Do not include an endpoint path.
- `ACESTEP_API_KEY` — optional API key matching the key configured on the ACE-Step server.

Do not put either value in `index.html`, `script.js`, or any other browser-delivered file.

## API flow

1. Browser sends a create request to `/api/music`.
2. Cloudflare Pages Function forwards a validated request to ACE-Step `POST /release_task`.
3. Browser polls `/api/music` with the returned `taskId`.
4. The function checks ACE-Step `POST /query_result` and returns normalized task status.

ACE-Step generation is asynchronous. A successful create response means a task was queued, not that audio is ready.

## Not finished yet

- The music page UI is not connected to this API.
- Generated audio is not yet proxied through MIDCRUSH AI.
- The ACE-Step server has not been deployed or connected.
- No generation has been tested end-to-end.
- Rate limiting, abuse prevention, storage and a public visitor queue still need to be added before public launch.

## Test plan

After a secured ACE-Step server is available:

1. Set the two Cloudflare environment variables.
2. Submit a short song request with custom lyrics.
3. Submit a song request with no lyrics to verify automatic lyric generation.
4. Submit an instrumental request and listen for vocals (there should be none).
5. Poll task status until success or failure.
6. Add a protected audio proxy and browser playback only after the returned file path handling is verified.

## Official ACE-Step references

- Installation: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INSTALL.md
- API: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md
