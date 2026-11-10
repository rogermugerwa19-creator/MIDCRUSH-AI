const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: HEADERS }); }
function getText(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map(part => typeof part?.text === "string" ? part.text : "").join("").trim();
  if (typeof result?.response === "string") return result.response.trim();
  if (typeof result?.output_text === "string") return result.output_text.trim();
  return "";
}
function parseContent(text) {
  let value = String(text || "").trim().replace(/^\s*\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}\s*$/, "");
  try { return JSON.parse(value); } catch {}
  const first = value.indexOf("{"), last = value.lastIndexOf("}");
  if (first >= 0 && last > first) { try { return JSON.parse(value.slice(first, last + 1)); } catch {} }
  return null;
}
function clean(value, fallback, max = 240) {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : fallback;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}
function normalizeContent(raw, prompt) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sections = Array.isArray(source.sections) ? source.sections.slice(0, 3) : [];
  return {
    title: clean(source.title, "Your new website", 70),
    eyebrow: clean(source.eyebrow, "WELCOME", 50),
    tagline: clean(source.tagline, clean(prompt, "A place to discover something new.", 110), 150),
    intro: clean(source.intro, "Explore what we offer and get in touch to learn more.", 380),
    sections: sections.map((section, index) => ({
      heading: clean(section?.heading, ["What we do", "Why choose us", "Discover more"][index], 90),
      text: clean(section?.text, "Learn more about what makes this experience useful.", 360),
      items: Array.isArray(section?.items) ? section.items.slice(0, 3).map(item => clean(item, "", 90)).filter(Boolean) : []
    })),
    ctaHeading: clean(source.ctaHeading, "Ready to get started?", 100),
    ctaText: clean(source.ctaText, "Get in touch to find out more.", 260),
    buttonText: clean(source.buttonText, "Contact us", 35)
  };
}
function buildWebsite(data, designStyle) {
  const style = String(designStyle || "").toLowerCase();
  let theme = ":root{--bg:#f5f7fb;--surface:#fff;--text:#172033;--muted:#65718a;--accent:#315de8;--accent2:#7a55e8;--line:#e5eaf3;--hero:#101a35}";
  if (/dark|cinematic/.test(style)) theme = ":root{--bg:#080d19;--surface:#111a2d;--text:#f3f5ff;--muted:#a6b0c5;--accent:#8d79ff;--accent2:#31c7d5;--line:#26334a;--hero:#090d1b}";
  else if (/premium|elegant/.test(style)) theme = ":root{--bg:#f5f1e9;--surface:#fffdf8;--text:#252016;--muted:#766d5e;--accent:#9a7137;--accent2:#c49a5a;--line:#e8dfd0;--hero:#211d17}";
  else if (/colour|color|bold/.test(style)) theme = ":root{--bg:#fff8f1;--surface:#fff;--text:#21152f;--muted:#6e607b;--accent:#ec5b38;--accent2:#6c54e8;--line:#f1dfd4;--hero:#2b174b}";
  else if (/minimal|clean/.test(style)) theme = ":root{--bg:#f7f8f7;--surface:#fff;--text:#202a25;--muted:#68736c;--accent:#287a58;--accent2:#78a98e;--line:#e3e9e4;--hero:#18372c}";
  const sectionHtml = data.sections.map((section, index) => {
    const items = section.items.length ? "<ul>" + section.items.map(item => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>" : "";
    return '<article class="card"><span class="number">0' + (index + 1) + '</span><h3>' + escapeHtml(section.heading) + '</h3><p>' + escapeHtml(section.text) + '</p>' + items + '</article>';
  }).join("");
  const safeTitle = escapeHtml(data.title);
  const css = '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}a{color:inherit;text-decoration:none}.wrap{width:min(1100px,calc(100% - 40px));margin:auto}.nav{height:78px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-weight:850;letter-spacing:-.04em;font-size:19px}.nav a:last-child{font-size:13px;font-weight:750;color:var(--accent)}.hero{background:var(--hero);color:#fff;position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:500px;height:500px;right:-130px;top:-240px;border-radius:50%;background:radial-gradient(circle,var(--accent2),transparent 68%);opacity:.32}.hero-inner{position:relative;z-index:1;padding:88px 0 100px;max-width:780px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;color:var(--accent2)}.hero .eyebrow{color:#c8c0ff}.hero h1{font-size:clamp(42px,7vw,76px);line-height:1.04;letter-spacing:-.055em;margin:17px 0 20px;max-width:760px}.hero p{max-width:650px;color:#d1d7e6;font-size:18px;line-height:1.75;margin:0 0 30px}.button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:14px 22px;font-weight:800;font-size:13px;background:var(--accent);color:white}.button-light{background:#fff;color:#191c2a}.section{padding:76px 0}.section-head{max-width:690px;margin-bottom:28px}.section-head h2{font-size:clamp(28px,4vw,42px);line-height:1.13;letter-spacing:-.04em;margin:10px 0}.section-head p,.card p{color:var(--muted);margin:0}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:25px;min-height:210px;box-shadow:0 10px 28px #10182808}.number{color:var(--accent);font-size:11px;font-weight:850;letter-spacing:.14em}.card h3{font-size:19px;line-height:1.25;margin:19px 0 10px}.card ul{padding-left:18px;color:var(--muted);font-size:13px}.cta{margin:10px auto 76px;width:min(1100px,calc(100% - 40px));background:var(--hero);color:#fff;border-radius:22px;padding:42px;display:flex;align-items:center;justify-content:space-between;gap:24px}.cta h2{font-size:clamp(25px,4vw,38px);line-height:1.15;margin:8px 0}.cta p{color:#ccd2e0;max-width:580px;margin:0}.footer{padding:22px 0 35px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}@media(max-width:760px){.hero-inner{padding:65px 0 74px}.cards{grid-template-columns:1fr}.card{min-height:0}.cta{padding:29px;align-items:flex-start;flex-direction:column}.section{padding:58px 0}.nav{height:65px}}';
  const cta = '<section class="cta" id="contact"><div><span class="eyebrow">NEXT STEP</span><h2>' + escapeHtml(data.ctaHeading) + '</h2><p>' + escapeHtml(data.ctaText) + '</p></div><a class="button button-light" href="#top">' + escapeHtml(data.buttonText) + '</a></section>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="' + escapeHtml(data.intro.slice(0, 155)) + '"><title>' + safeTitle + '</title><style>' + theme + css + '</style></head><body><header class="hero"><div class="wrap"><nav class="nav"><a class="brand" href="#top">' + safeTitle + '</a><a href="#contact">GET IN TOUCH ↗</a></nav><div class="hero-inner" id="top"><span class="eyebrow">' + escapeHtml(data.eyebrow) + '</span><h1>' + escapeHtml(data.tagline) + '</h1><p>' + escapeHtml(data.intro) + '</p><a class="button" href="#contact">' + escapeHtml(data.buttonText) + '</a></div></div></header><main><section class="section wrap"><div class="section-head"><span class="eyebrow">EXPLORE</span><h2>' + safeTitle + '</h2><p>' + escapeHtml(data.intro) + '</p></div><div class="cards">' + sectionHtml + '</div></section>' + cta + '</main><footer class="footer"><div class="wrap">' + safeTitle + ' · Website preview created with MIDCRUSH AI</div></footer></body></html>';
}
const SYSTEM_PROMPT = "Write short, specific website copy from the user's brief. Return ONLY valid compact JSON with fields title, eyebrow, tagline, intro, sections, ctaHeading, ctaText, buttonText. sections is exactly 3 objects with heading, text, and items (2 short strings each). Be relevant and natural. Do not invent real addresses, phone numbers, prices, testimonials, awards, staff, or factual claims. Use placeholders if needed. No Markdown or explanations. Keep JSON under 450 words.";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Please enter a website description." }, 400); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const siteType = typeof body.siteType === "string" ? body.siteType.slice(0, 60) : "Website";
  const designStyle = typeof body.designStyle === "string" ? body.designStyle.slice(0, 60) : "Modern";
  if (!prompt) return json({ error: "Describe the website you want to build." }, 400);
  if (prompt.length > 2800) return json({ error: "Keep your website description under 2,800 characters." }, 400);
  if (!env.AI) return json({ error: "Website generation is not connected. Check the Cloudflare Workers AI binding in your Pages settings." }, 503);
  try {
    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "Website type: " + siteType + "\nDesign style: " + designStyle + "\nBrief: " + prompt }
      ],
      max_completion_tokens: 800,
      chat_template_kwargs: { enable_thinking: false },
      temperature: 0.25
    });
    const parsed = parseContent(getText(result));
    if (!parsed) {
      const finishReason = result?.choices?.[0]?.finish_reason || result?.choices?.[0]?.finishReason || "";
      if (/length|max_tokens/i.test(String(finishReason))) return json({ error: "The AI returned incomplete website content. Please try again." }, 502);
      return json({ error: "The AI did not return website content in the expected format. Please try again." }, 502);
    }
    const data = normalizeContent(parsed, prompt);
    return json({ html: buildWebsite(data, designStyle), model: "Cloudflare Workers AI · GLM 4.7 Flash + MIDCRUSH layout" });
  } catch (error) {
    const message = String(error?.message || error || "Unknown error");
    console.error("MIDCRUSH website generation error:", message);
    if (/3036|10,000 neurons|daily free allocation/i.test(message)) return json({ error: "The free daily Cloudflare AI allowance has been used up. It resets at 00:00 UTC." }, 429);
    if (/3040|out of capacity|capacity/i.test(message)) return json({ error: "The AI service is busy right now. Try again shortly." }, 503);
    if (/3007|3008|timeout|timed out|deadline/i.test(message)) return json({ error: "Cloudflare timed out while generating the website. Try again with a brief description." }, 504);
    if (/5035|workers paid plan/i.test(message)) return json({ error: "Cloudflare says this AI model requires a paid Workers plan, so this free setup cannot run it." }, 403);
    if (/3042|no such model|model.*not found|invalid model/i.test(message)) return json({ error: "Cloudflare could not find the configured website AI model. The model configuration needs to be corrected." }, 502);
    return json({ error: "Website generation failed. Please try again." }, 502);
  }
}