const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

function getText(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map(part => typeof part?.text === "string" ? part.text : "").join("").trim();
  }
  if (typeof result?.response === "string") return result.response.trim();
  if (typeof result?.output_text === "string") return result.output_text.trim();
  return "";
}

function extractHtml(value) {
  let html = String(value || "").trim();
  const fenced = html.match(new RegExp("\\x60{3}(?:html)?\\s*([\\s\\S]*?)\\x60{3}", "i"));
  if (fenced) html = fenced[1].trim();

  const doctypeAt = html.search(/<!doctype\s+html/i);
  const htmlAt = html.search(/<html\b/i);
  const start = doctypeAt >= 0 ? doctypeAt : htmlAt;

  if (start >= 0) {
    html = html.slice(start).trim();
    const end = html.toLowerCase().lastIndexOf("</html>");
    if (end >= 0) {
      html = html.slice(0, end + 7).trim();
    } else if (/<body\b/i.test(html) && html.length > 1200) {
      if (!/<\/body\s*>/i.test(html)) html += "\n</body>";
      html += "\n</html>";
    } else {
      return "";
    }
  } else if (/<(main|header|nav|section|article|div)\b/i.test(html) && html.length > 500) {
    html = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Generated website</title><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body>" + html + "</body></html>";
  } else {
    return "";
  }

  if (!/<html\b/i.test(html) || !/<body\b/i.test(html)) return "";
  const policy = "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const securityMeta = '<meta http-equiv="Content-Security-Policy" content="' + policy + '"><meta name="referrer" content="no-referrer">';
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, match => match + "\n" + securityMeta);
  } else {
    html = html.replace(/<html\b[^>]*>/i, match => match + "\n<head>" + securityMeta + "</head>");
  }
  return html;
}

const SYSTEM_PROMPT = "You are the MIDCRUSH AI Website Builder. Turn the user's brief into a complete, polished, responsive website as ONE self-contained HTML document. Return ONLY one complete HTML document, starting with <!doctype html> and ending with </html>. Never use Markdown fences or explanations. Keep code concise enough to finish in the token budget. Build a single-page landing website with a hero, navigation, up to four relevant content sections and a footer. Avoid unnecessary repeated cards, long copy or oversized scripts. Use semantic HTML, accessible labels, responsive CSS, attractive typography, thoughtful spacing, and a cohesive colour palette. Write real page copy that fits the user's brief; do not use lorem ipsum. Put all CSS inside one <style> element and all JavaScript inside one inline <script> element. Do not load external scripts, libraries, CSS files, fonts or iframes. Do not use network requests, fetch, XMLHttpRequest, WebSockets, analytics, cookies, storage, eval, or Function. Do not include payment processing, account/password collection, sensitive-data collection, or real backend claims. Forms must be front-end demos only and must not submit data; show a clear demo success message locally if suitable. Do not invent business addresses, phone numbers, testimonials, prices, awards, or factual claims. Use placeholders such as [Add your phone number] when the brief does not provide real details. Use CSS shapes, gradients, and simple inline SVG for decorative visuals. Do not depend on external image URLs. Make buttons and navigation work within the page. Ensure the mobile menu works if one is included. Include helpful hover and focus states. Keep the generated source reasonably compact and make sure all tags and braces are closed.";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please enter a website description." }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const siteType = typeof body.siteType === "string" ? body.siteType.slice(0, 60) : "Website";
  const designStyle = typeof body.designStyle === "string" ? body.designStyle.slice(0, 60) : "Modern";
  if (!prompt) return json({ error: "Describe the website you want to build." }, 400);
  if (prompt.length > 2800) return json({ error: "Keep your website description under 2,800 characters." }, 400);

  if (!env.AI) {
    return json({ error: "Website generation is not connected. Check the Cloudflare Workers AI binding in your Pages settings." }, 503);
  }

  try {
    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: "Website type: " + siteType + "\nDesign direction: " + designStyle + "\n\nBuild this website:\n" + prompt
        }
      ],
      max_completion_tokens: 4000,
      chat_template_kwargs: { enable_thinking: false },
      temperature: 0.2
    });

    const generatedText = getText(result);
    const html = extractHtml(generatedText);
    if (!html) {
      const finishReason = result?.choices?.[0]?.finish_reason || result?.choices?.[0]?.finishReason || "";
      const hitLimit = /length|max_tokens/i.test(String(finishReason));
      return json({
        error: hitLimit
          ? "The AI response reached its output limit before the website was complete. Try again; the builder now has a larger output allowance."
          : "The AI response did not contain usable HTML. Try again with a shorter description."
      }, 502);
    }
    if (html.length > 70000) {
      return json({ error: "The generated website is too large. Try a shorter description." }, 502);
    }

    return json({ html, model: "Cloudflare Workers AI · GLM 4.7 Flash" });
  } catch (error) {
    const message = String(error?.message || error || "Unknown error");
    console.error("MIDCRUSH website generation error:", message);
    if (/3036|10,000 neurons|daily free allocation/i.test(message)) {
      return json({ error: "The free daily Cloudflare AI allowance has been used up. It resets at 00:00 UTC." }, 429);
    }
    if (/3040|out of capacity|capacity/i.test(message)) {
      return json({ error: "The AI service is busy right now. Try again shortly." }, 503);
    }
    if (/5007|3042|no such model|model.*not found|invalid model/i.test(message)) {
      return json({ error: "Cloudflare could not find the configured website AI model. The model configuration needs to be corrected." }, 502);
    }
    if (/5035|workers paid plan/i.test(message)) {
      return json({ error: "Cloudflare says this AI model requires a paid Workers plan, so this free setup cannot run it." }, 403);
    }
    if (/3007|3008|timeout|timed out|deadline/i.test(message)) {
      return json({ error: "Cloudflare timed out while generating the website. Try a shorter description." }, 504);
    }
    if (/3006|request too large|payload too large/i.test(message)) {
      return json({ error: "The website request is too large. Shorten the description and try again." }, 413);
    }
    if (/5016|model agreement/i.test(message)) {
      return json({ error: "Cloudflare requires an account agreement before this AI model can be used." }, 403);
    }
    if (/3023|account blocked|account not allowed|5018|3041/i.test(message)) {
      return json({ error: "Cloudflare is not allowing this account to use the selected AI model. Check the Workers AI account and model access." }, 403);
    }
    const safeMessage = message
      .replace(/Bearer\s+[^\s]+/gi, "Bearer [hidden]")
      .replace(/(?:api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, "credential=[hidden]")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 180);
    return json({ error: safeMessage && safeMessage !== "Unknown error"
      ? "Website generation error: " + safeMessage
      : "Website generation failed for an unknown reason. Check the Cloudflare Pages function logs." }, 502);
  }
}
