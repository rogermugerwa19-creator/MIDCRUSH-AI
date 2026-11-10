const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS});}
function readText(result){
  const c=result?.choices?.[0]?.message?.content;
  if(typeof c==="string")return c.trim();
  if(Array.isArray(c))return c.map(x=>typeof x?.text==="string"?x.text:"").join("").trim();
  return typeof result?.response==="string"?result.response.trim():"";
}
function parseJson(value){
  let s=String(value||"").trim().replace(/^\s*\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}\s*$/,"");
  try{return JSON.parse(s);}catch{}
  const a=s.indexOf("{"),b=s.lastIndexOf("}");
  if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1));}catch{}}
  return null;
}
function clean(value,fallback,max=300){
  if(typeof value!=="string")return fallback;
  const s=value.replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim();
  return s?s.slice(0,max):fallback;
}
function esc(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function normalize(raw,prompt){
  const x=raw&&typeof raw==="object"?raw:{};
  const s=Array.isArray(x.sections)?x.sections:[];
  const defaults=[
    {heading:"About us",text:"Learn more about the people, purpose and ideas behind this website.",items:["Our story","What matters to us"]},
    {heading:"What we offer",text:"Explore the services and opportunities available.",items:["Our main services","How to get started"]},
    {heading:"Get in touch",text:"Contact us to ask a question or learn more.",items:["General enquiries","Next steps"]}
  ];
  return {
    title:clean(x.title,"Your website",65),
    eyebrow:clean(x.eyebrow,"WELCOME",45),
    tagline:clean(x.tagline,clean(prompt,"A better way to bring your ideas to life.",110),145),
    intro:clean(x.intro,"Discover what we offer and learn how to get started.",360),
    sections:defaults.map((d,i)=>{
      const v=s[i]||{};
      return {heading:clean(v.heading,d.heading,80),text:clean(v.text,d.text,300),items:Array.isArray(v.items)?v.items.slice(0,3).map(z=>clean(z,"",75)).filter(Boolean):d.items};
    }),
    ctaHeading:clean(x.ctaHeading,"Let's get started",85),
    ctaText:clean(x.ctaText,"Get in touch to find out more.",220),
    buttonText:clean(x.buttonText,"Contact us",30)
  };
}
function buildPage(data,style,page){
  const dark=/dark|cinematic/i.test(style), premium=/premium|elegant/i.test(style), colourful=/colour|color|bold/i.test(style), minimal=/minimal|clean/i.test(style);
  const theme=dark
    ?":root{--bg:#090e1b;--surface:#131c30;--text:#f5f6ff;--muted:#aeb8ce;--accent:#9a83ff;--accent2:#39c6d2;--line:#28344b;--hero:#10182b}"
    :premium
    ?":root{--bg:#f6f1e8;--surface:#fffdf8;--text:#292116;--muted:#786e5e;--accent:#98703a;--accent2:#caa76b;--line:#e9dfce;--hero:#241e17}"
    :colourful
    ?":root{--bg:#fff8f2;--surface:#fff;--text:#261a35;--muted:#74677e;--accent:#ee603e;--accent2:#7657e8;--line:#f0dfd6;--hero:#2b194c}"
    :minimal
    ?":root{--bg:#f6f8f6;--surface:#fff;--text:#1c2b23;--muted:#68776e;--accent:#287c59;--accent2:#82b398;--line:#e1e9e3;--hero:#193a2e}"
    :":root{--bg:#f5f7fb;--surface:#fff;--text:#172033;--muted:#65718a;--accent:#315de8;--accent2:#7a55e8;--line:#e5eaf3;--hero:#101a35}";
  const links=[["index.html","Home"],["about.html","About"],["services.html","Services"],["contact.html","Contact"]];
  const nav=links.map(([href,label])=>'<a href="'+href+'"'+(page===href?' aria-current="page"':'')+'>'+label+'</a>').join("");
  const css='*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}a{color:inherit;text-decoration:none}.wrap{width:min(1100px,calc(100% - 40px));margin:auto}.topbar{height:auto;min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{font-size:19px;font-weight:850;letter-spacing:-.04em}.nav{display:flex;gap:22px;flex-wrap:wrap}.nav a{font-size:13px;font-weight:750;color:var(--muted);padding:9px 0}.nav a[aria-current=page],.nav a:hover{color:var(--accent)}.hero{background:var(--hero);color:white;position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:480px;height:480px;right:-130px;top:-260px;border-radius:50%;background:radial-gradient(circle,var(--accent2),transparent 68%);opacity:.3}.hero-inner{position:relative;z-index:1;padding:75px 0 88px;max-width:790px}.eyebrow{font-size:11px;font-weight:850;letter-spacing:.17em;color:var(--accent2)}.hero .eyebrow{color:#c9c2ff}.hero h1{font-size:clamp(40px,7vw,72px);line-height:1.04;letter-spacing:-.055em;margin:16px 0 20px}.hero p{max-width:650px;color:#d3d9e8;font-size:17px;margin:0 0 28px}.button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:13px 21px;background:var(--accent);color:#fff;font-weight:800;font-size:13px}.section{padding:68px 0}.section h1{font-size:clamp(34px,5vw,54px);line-height:1.1;letter-spacing:-.045em;margin:12px 0 18px}.section p{color:var(--muted);max-width:720px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px;margin-top:28px}.card{background:var(--surface);border:1px solid var(--line);border-radius:17px;padding:24px;box-shadow:0 10px 26px #17203308}.card h2{font-size:20px;line-height:1.25;margin:10px 0}.card p{font-size:14px;margin:0}.card ul{padding-left:18px;color:var(--muted);font-size:13px}.cta{margin:10px auto 68px;padding:38px;border-radius:20px;background:var(--hero);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:24px}.cta h2{font-size:clamp(25px,4vw,36px);margin:8px 0}.cta p{color:#d0d6e4;margin:0;max-width:590px}.button-light{background:white;color:#202033}.footer{border-top:1px solid var(--line);padding:22px 0 32px;font-size:12px;color:var(--muted)}@media(max-width:720px){.topbar{align-items:flex-start;flex-direction:column;padding:17px 0}.nav{gap:15px}.hero-inner{padding:58px 0 68px}.cards{grid-template-columns:1fr}.section{padding:52px 0}.cta{align-items:flex-start;flex-direction:column;padding:27px}}';
  const header='<header class="hero"><div class="wrap"><div class="topbar"><a class="brand" href="index.html">'+esc(data.title)+'</a><nav class="nav" aria-label="Main navigation">'+nav+'</nav></div>';
  const footer='<footer class="footer"><div class="wrap">'+esc(data.title)+' · Built with MIDCRUSH AI</div></footer>';
  let body="";
  if(page==="index.html"){
    const cards=data.sections.map((s,i)=>'<article class="card"><span class="eyebrow">0'+(i+1)+'</span><h2>'+esc(s.heading)+'</h2><p>'+esc(s.text)+'</p></article>').join("");
    body=header+'<div class="hero-inner"><span class="eyebrow">'+esc(data.eyebrow)+'</span><h1>'+esc(data.tagline)+'</h1><p>'+esc(data.intro)+'</p><a class="button" href="about.html">Explore the website</a></div></div></header><main class="wrap"><section class="section"><span class="eyebrow">DISCOVER</span><h1>'+esc(data.title)+'</h1><p>'+esc(data.intro)+'</p><div class="cards">'+cards+'</div></section><section class="cta"><div><span class="eyebrow">NEXT STEP</span><h2>'+esc(data.ctaHeading)+'</h2><p>'+esc(data.ctaText)+'</p></div><a class="button button-light" href="contact.html">'+esc(data.buttonText)+'</a></section></main>'+footer;
  }else{
    const index=page==="about.html"?0:page==="services.html"?1:2;
    const s=data.sections[index];
    const items=s.items.map(x=>"<li>"+esc(x)+"</li>").join("");
    body=header+'</div></header><main class="wrap"><section class="section"><span class="eyebrow">'+(page==="about.html"?"OUR STORY":page==="services.html"?"WHAT WE DO":"CONTACT")+'</span><h1>'+esc(s.heading)+'</h1><p>'+esc(s.text)+'</p><ul>'+items+'</ul></section><section class="cta"><div><span class="eyebrow">NEXT STEP</span><h2>'+esc(data.ctaHeading)+'</h2><p>'+esc(data.ctaText)+'</p></div><a class="button button-light" href="'+(page==="contact.html"?"mailto:":"contact.html")+'">'+esc(data.buttonText)+'</a></section></main>'+footer;
  }
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+esc(data.intro.slice(0,150))+'"><title>'+esc(data.title)+' | '+page.replace(".html","")+'</title><style>'+theme+css+'</style></head><body>'+body+'</body></html>';
}
const SYSTEM_PROMPT="Write concise copy for a multi-page website. Return ONLY valid JSON with fields title, eyebrow, tagline, intro, sections, ctaHeading, ctaText, buttonText. sections must contain exactly 3 objects: section 1 is About, section 2 is Services or main offering, section 3 is Contact or useful visitor information. Each object has heading, text, items (two short strings). Make details specific to the user's brief. Do not invent real addresses, phone numbers, prices, testimonials, awards, staff, or factual claims. Keep JSON compact, under 400 words. No Markdown or explanations.";
export async function onRequestPost({request,env}){
  let body;try{body=await request.json();}catch{return json({error:"Please enter a website description."},400);}
  const prompt=typeof body.prompt==="string"?body.prompt.trim():"";
  const siteType=typeof body.siteType==="string"?body.siteType.slice(0,60):"Website";
  const designStyle=typeof body.designStyle==="string"?body.designStyle.slice(0,60):"Modern";
  if(!prompt)return json({error:"Describe the website you want to build."},400);
  if(prompt.length>2800)return json({error:"Keep your website description under 2,800 characters."},400);
  if(!env.AI)return json({error:"Website generation is not connected. Check the Cloudflare Workers AI binding in your Pages settings."},503);
  try{
    const result=await env.AI.run("@cf/zai-org/glm-4.7-flash",{
      messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:"Website type: "+siteType+"\nDesign style: "+designStyle+"\nBrief: "+prompt}],
      max_completion_tokens:800,chat_template_kwargs:{enable_thinking:false},temperature:0.25
    });
    const raw=parseJson(readText(result));
    if(!raw)return json({error:"The AI did not return website content in the expected format. Try again."},502);
    const data=normalize(raw,prompt);
    const pages=["index.html","about.html","services.html","contact.html"];
    const files=pages.map(page=>({name:page,content:buildPage(data,designStyle,page)}));
    return json({html:files[0].content,files,model:"Cloudflare Workers AI · GLM 4.7 Flash + multi-page builder"});
  }catch(error){
    const message=String(error?.message||error||"Unknown error");
    console.error("MIDCRUSH website generation error:",message);
    if(/3036|10,000 neurons|daily free allocation/i.test(message))return json({error:"The free daily Cloudflare AI allowance has been used up. It resets at 00:00 UTC."},429);
    if(/3040|out of capacity|capacity/i.test(message))return json({error:"The AI service is busy right now. Try again shortly."},503);
    if(/3007|3008|timeout|timed out|deadline/i.test(message))return json({error:"Cloudflare timed out while generating the website. Try again with a brief description."},504);
    if(/5035|workers paid plan/i.test(message))return json({error:"Cloudflare says this AI model requires a paid Workers plan, so this free setup cannot run it."},403);
    if(/3042|no such model|model.*not found|invalid model/i.test(message))return json({error:"Cloudflare could not find the configured website AI model."},502);
    return json({error:"Website generation failed. Please try again."},502);
  }
}