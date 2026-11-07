# MIDCRUSH Music Generator

The AI Music workspace is designed to run inside MIDCRUSH AI. The browser calls same-origin Cloudflare Pages Functions; those functions call Treblo's hosted music API. Visitors do not need to visit Treblo or see the API key.

## Features in the workspace
- Song generation with AI-generated lyrics when the lyrics field is empty.
- Custom lyrics for songs.
- Instrumental-only generation.
- Prompt, genre, mood, tempo and duration controls in the interface.
- Asynchronous generation status polling.
- MP3 playback and download through a same-origin audio proxy.
- Up to 20 recent generation records stored locally in the visitor's browser.

## Treblo server-side configuration

In the Cloudflare Pages project, add this as a server-side secret:

- `TREBLO_API_KEY` — the API key from the user's Treblo developer account.

Do not put the key in `index.html`, `script.js`, any other browser-delivered file, or a public GitHub commit. Do not send the key in chat. Keep it private. If the account requires payment details or billing approval, a parent or guardian should review and handle that.

## API flow

1. Browser sends a request to `POST /api/music`.
2. The Pages Function calls Treblo `POST /v1/generations/v3` using the server-side key.
3. The browser polls `POST /api/music` with the task ID; the Pages Function checks Treblo's documented `GET /v1/generations/status/{task_id}` endpoint.
4. When status is `SUCCESS`, the Pages Function retrieves the generation using Treblo's documented `GET /v1/generations/{task_id}` endpoint.
5. The browser plays/downloads the returned CDN audio URL through `GET /api/music/audio`.

The integration requests MP3 output. Treblo's generation URLs are temporary and may be deleted after about 168 hours, so tracks should be downloaded if they need to be kept.

## Important credit and usage limits

Treblo's published API pricing says one v3 generation costs 100 credits. Its free trial is advertised as 3,000 credits (about 30 songs) after verifying a card; it is a trial, not unlimited free service. Do not enable generation for public visitors until the owner understands the account's trial, payment and usage terms. Never promise visitors unlimited free generations.

Any user-facing implementation of the Treblo API requires proper attribution to Treblo under its API terms.

## Not ready for public launch

- The Treblo key has not been configured in Cloudflare by this project work.
- No live generation or audio playback has been tested against the user's account.
- No account, API key, payment method, or billing setting has been changed by this project work.
- Authentication, per-user limits, abuse protection and a global usage cap must be implemented before public visitors can use the feature. Otherwise visitors could consume the owner's trial credits.
- History is browser-local only, not account-synced. Treblo audio links are temporary, so playback may stop after the provider removes a track.
- The interface's duration control is not a precise v3 duration setting: Treblo v3 normally creates variable-length songs, typically 2–4 minutes and up to 4 minutes 45 seconds. Do not promise exact durations.
- The UI's tempo field is not currently enforced by the v3 endpoint. Treblo recommends starting with a prompt and allowing its model to infer musical tags and settings.

Do not merge or launch the feature publicly until the key is configured securely, a test generation succeeds, audio playback/download are verified, attribution is displayed, and limits are in place.

## Test checklist

1. Add `TREBLO_API_KEY` as a Cloudflare Pages server-side secret.
2. Test one song with custom lyrics.
3. Test one song with empty lyrics and verify Treblo generates lyrics.
4. Test one instrumental and verify it has no vocals.
5. Verify status polling, MP3 playback and download.
6. Verify errors for missing/invalid keys and exhausted credits.
7. Add server-side generation limits and abuse protection before public access.

## Official Treblo references

- API documentation: https://treblo.com/developers/docs
- API pricing: https://treblo.com/developers/pricing
- API terms: https://treblo.com/developers/terms
