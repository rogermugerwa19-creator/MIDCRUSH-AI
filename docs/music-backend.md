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


## Recommended hosting path: RunPod GPU Pod (manual setup required)

A normal GPU Pod is the most straightforward first deployment for this existing ACE-Step REST API adapter. It provides a persistent API process and avoids assuming that a serverless worker can preserve ACE-Step's in-memory task queue between separate status requests.

1. Create a RunPod account and review its current billing terms before adding any payment method or launching compute. This is a paid GPU host, not a free permanent service.
2. Create a GPU Pod with enough VRAM for the chosen ACE-Step configuration. The official ACE-Step installation guide lists 4 GB VRAM as a minimum for DiT-only mode and 6 GB for LLM+DiT, but model choice, quantization, offloading and performance affect what is practical.
3. Install ACE-Step 1.5 using its official installation guide and start the REST API on port 8001. Bind the service to the pod's network interface as required by the host.
4. Enable ACE-Step API authentication with a strong unique API key. Expose only the API port needed by MIDCRUSH; do not publish an unauthenticated generation endpoint.
5. In Cloudflare Pages, add server-side variables: ACESTEP_API_URL set to the secure reachable API base URL, and ACESTEP_API_KEY set to the same API key. Never put these values in browser code.
6. Test one short custom-lyrics song, one auto-lyrics song, one instrumental, status polling, audio playback and MP3 download.
7. Stop the GPU Pod when it is not being used. Compute is billed while running; persistent storage or other resources may have separate charges.

### Cost reference (not a quote)

RunPod's published pricing page currently lists examples including an RTX 3090 Pod from about $0.50/hour on Community Cloud and an L4 Pod around $0.59/hour. Availability, region, storage, taxes and rates can change. A GPU left running continuously at $0.50/hour would be about $12 per day or $360 for 30 days, before any additional charges. Check the live pricing page before launching: https://www.runpod.io/pricing

A serverless endpoint may reduce idle compute charges, but it needs a purpose-built ACE-Step worker and durable task/result handling. Do not point the current polling adapter at a generic serverless endpoint without adapting and testing that protocol first.

### Before proceeding with paid hosting

No RunPod account has been created, no GPU has been launched, and no payment has been authorized. The owner must decide whether paid GPU hosting is acceptable and control the billing account. Do not launch paid compute without that explicit approval.
