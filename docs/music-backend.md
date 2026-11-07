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
- The browser now keeps up to 20 recent generation records in localStorage on that device/browser only. This is not account-synced or server-backed history, and playback can stop working if the ACE-Step host deletes generated files.
- Server-side audio retention and account-synced generation history are not implemented.
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


## No-payment provider candidate: Free.ai API (not yet integrated or verified)

Free.ai publicly advertises a hosted music-generation API at https://api.free.ai/v1/music/generate/ and describes ACE-Step for songs with vocals plus AudioLDM 2 for instrumentals. Its music page advertises a free daily token allowance and says generation can be called through an API. This could let MIDCRUSH AI call a provider-hosted engine without running our own GPU server.

Important caveats before adopting it:
- The provider's public pages are not fully consistent: the music page estimates about 5,000 tokens per generation and advertises 6,000 anonymous tokens/day or 30,000/day for a free account, while its general API page lists AudioLDM 2 at 2,000 tokens/track and a 30,000-token daily free pool. These figures and eligibility need confirmation with a real API response.
- The public music-page example shows only a basic prompt/duration request. It does not document the full request and response schema needed for ACE-Step vocals, custom lyrics, automatic lyrics, job status, and returned audio URLs. Do not assume the current ACE-Step /release_task and /query_result adapter is compatible.
- The service's API documentation says API keys are created through an account. Do not put a key in browser JavaScript, commit it to Git, or share it in chat. If an account or key is needed, have a parent/guardian help review the service and its terms.
- Daily quotas, request limits, retention, uptime, and permission for public visitors to use one shared key must be checked before a public launch. Free quota is not unlimited capacity.

### Next integration gate
1. Confirm the provider's current free allowance and terms, including whether one site's public visitors may use the API through the site's server.
2. Obtain and test a key privately through the server-side Cloudflare secret setting only; never send the key to the repository or frontend.
3. Verify exact payloads and responses for a custom-lyrics song, auto-lyrics song, instrumental, job status, and audio download.
4. Only then implement a separate provider adapter and add server-side daily quotas, per-IP abuse protection, and a safe global usage cap.

Until those checks pass, keep the existing ACE-Step adapter as an unconfigured foundation and do not claim that the public generator works. No paid GPU hosting is required for this candidate, and no account, key, or payment has been created or authorized by this project work.

### Provider references
- Music generator and API example: https://free.ai/music/
- API documentation and token limits: https://free.ai/api/
- Provider quickstart: https://free.ai/docs/
