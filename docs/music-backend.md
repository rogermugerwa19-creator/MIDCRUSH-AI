# MIDCRUSH Music Generator

This branch adds the first MIDCRUSH Music workspace and a server-side adapter for ACE-Step 1.5.

## Included
- Music workspace in the existing AI Music navigation item.
- Song-with-vocals and instrumental modes.
- Prompt, optional custom lyrics, genre, mood, tempo and duration controls.
- Empty song lyrics use ACE-Step description-driven generation (sample_query with thinking enabled) so the model can generate lyrics.
- Instrumental requests send an explicit no-vocals prompt.
- Asynchronous task creation and status polling.
- Generated audio is served through a same-origin Pages Function proxy; the ACE-Step host and API key are not exposed to browser code.

## Cloudflare Pages environment variables
Set these as server-side environment variables/secrets in the Cloudflare Pages project:
- ACESTEP_API_URL — base URL of the running ACE-Step API, e.g. https://music-api.example.com. Do not include an endpoint path.
- ACESTEP_API_KEY — API key configured on the ACE-Step server. Enable authentication for a public deployment.
Do not put either value in index.html, script.js, or any browser-delivered file.

## Routes
POST /api/music with action=create submits a generation request. Set type to song or instrumental. Supply custom lyrics or leave them empty for a song to request description-driven lyric generation.
POST /api/music with action=status and the returned taskId checks generation status.
GET /api/music/audio?file=... streams the ACE-Step result through the same-origin Pages Function. The proxy accepts only the /v1/audio result path on the configured upstream origin.

## API flow
1. Browser sends a validated create request to POST /api/music.
2. Pages Function forwards it to ACE-Step POST /release_task.
3. Browser polls task status through POST /api/music.
4. When complete, browser plays/downloads audio through GET /api/music/audio.
ACE-Step is asynchronous: a successful create response means the task was queued, not that audio is ready.

## Not ready for public launch
- The ACE-Step server has not been deployed or connected.
- No end-to-end generation has been tested.
- Per-user authentication, rate limiting, abuse controls and public queue limits are not implemented.
- Audio retention and long-term generation history are not implemented.
- Free public generation cannot be promised; GPU hosting and capacity still need to be arranged.
Do not merge/launch this as a public generation service until the backend is secured, tested and capacity limits are decided.

## Test plan
1. Deploy a secured ACE-Step server with API authentication enabled.
2. Configure ACESTEP_API_URL and ACESTEP_API_KEY in Cloudflare Pages.
3. Test a short song with custom lyrics.
4. Test a song with no supplied lyrics and verify the generated lyrics.
5. Test an instrumental and confirm it contains no vocals.
6. Verify playback and MP3 download through the same-origin proxy.
7. Add rate limiting, abuse protection and queue/cost controls before public release.

## Official ACE-Step references
- API: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md
- Installation: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INSTALL.md
