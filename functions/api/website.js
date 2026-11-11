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
const CHAT_BUILDER_SYSTEM_PROMPT="You are MIDCRUSH AI's expert software architect and website-building partner inside AI Chat. Work conversationally: understand the request, ask only useful questions one at a time, recommend relevant improvements, explain choices and dependencies, then build. Return ONLY compact valid JSON. Allowed statuses: clarify, guide, ready. For clarify return {status:\"clarify\",message,question,choices}. Ask only if a missing decision materially changes the project; otherwise make sensible defaults and build. For guide return {status:\"guide\",message}; use when a capability requires external setup, credentials, hosting, or services not configured. Never pretend a service is connected. For ready, obey projectPreference (auto, single-html, multi-file). If single-html is requested, or a static content site is best, return {status:\"ready\",projectMode:\"single-html\",assistantMessage,title,designStyle,eyebrow,tagline,intro,navigation,recommendations}. Navigation contains 2 to 6 section objects with label, heading, intro and 2 to 4 cards with title and text. If multi-file is requested, or the task needs a backend, database, authentication, API, file uploads, payments, server-side processing, or a framework, return {status:\"ready\",projectMode:\"multi-file\",assistantMessage,project:{name,description,stack,setupInstructions},files:[{path,content}],recommendations}. Generate a coherent starter project with up to 16 essential files. Include dependency manifests, configuration, entry points, source code and README.md; include .env.example where secrets are required, with placeholders only. Choose suitable languages, frameworks and databases for the task: use simple HTML/CSS/JavaScript for static sites; choose suitable TypeScript/JavaScript frameworks for rich frontends; choose Node.js, Python, PHP, Java, Go or another suitable backend; use SQL or document databases only when needed; use Dart/Flutter, Kotlin or Swift for native/mobile requests. You can write and explain common programming languages, but use only what the project needs. Include secure defaults: validate inputs, handle errors, use parameterized queries, hash passwords and enforce server-side authorization where relevant. Do not invent credentials or hard-code secrets. Multi-file projects need practical local setup and run steps and a clear list of external services, environment variables, databases, deployment steps or accounts the user must configure. A standalone HTML file cannot provide server-side storage or real account/payment features. Full-stack projects cannot be executed in this website preview; return the source files and show a file viewer instead of a fake preview. For existing projects, preserve stack, files and features not requested to change. Return 2 or 3 useful recommendations. Each recommendation is {title,description,action,mode}; mode add only if you can implement it in the current response, mode guide if it needs external setup or a backend integration not yet configured. If a movie site requires direct uploads, explain that a real upload service and object storage need backend configuration; do not create a non-working upload button. Choose navigation for the actual site purpose; do not force About, Services, Contact or Pricing everywhere. Never invent contact details, prices, ratings, testimonials, provider accounts, quotas or facts. No lorem ipsum. designStyle must be Modern and polished, Minimal and clean, Bold and colourful, Elegant and premium, or Dark and cinematic. Keep output concise.";
function normalizeRecommendations(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,3).map((item,index)=>({
    title:clean(item?.title,"Suggested improvement "+(index+1),70),
    description:clean(item?.description,"An optional improvement for this website.",180),
    action:clean(item?.action,"Add this improvement to the website.",240),
    mode:item?.mode==="guide"?"guide":"add"
  }));
}
function normalizeProject(raw,prompt){
  const project=raw?.project&&typeof raw.project==="object"?raw.project:{};
  const source=Array.isArray(raw?.files)?raw.files:[];
  const files=[];const seen=new Set();let total=0;
  for(const item of source.slice(0,16)){
    if(!item||typeof item.path!=="string"||typeof item.content!=="string")continue;
    const path=item.path.trim().replace(/\\/g,"/").replace(/^\.\/+/, "");
    const parts=path.split("/");
    if(!path||path.startsWith("/")||parts.some(part=>!part||part==="."||part==="..")||/[\\u0000-\\u001f<>:"|?*]/.test(path)||parts[0]===".git"||seen.has(path))continue;
    if(item.content.length>50000||total+item.content.length>180000)continue;
    seen.add(path);total+=item.content.length;files.push({path,content:item.content});
  }
  if(!files.length)throw new Error("The AI did not return any valid project source files.");
  const setup=Array.isArray(project.setupInstructions)?project.setupInstructions.slice(0,12).map(x=>clean(x,"",240)).filter(Boolean):[];
  const stack=Array.isArray(project.stack)?project.stack.slice(0,8).map(x=>clean(x,"",60)).filter(Boolean):[];
  const name=clean(project.name,"midcrush-project",64).toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"")||"midcrush-project";
  const description=clean(project.description,prompt,360);
  if(!seen.has("README.md")){
    const readme="# "+clean(project.name,"Project",80)+"\\n\\n"+description+"\\n\\n## Technology stack\\n"+(stack.length?stack.map(x=>"- "+x).join("\\n"):"- See package and configuration files")+"\\n\\n## Setup\\n"+(setup.length?setup.map((x,i)=>(i+1)+". "+x).join("\\n"):"1. Review configuration and environment example files.\\n2. Install the dependencies listed by the project.\\n3. Configure required environment variables.\\n4. Run the development command shown in the project manifest.")+"\\n\\n## Important\\nReview external services and environment variables before deployment. No secrets or live service accounts are included.";
    files.push({path:"README.md",content:readme});
  }
  return {name,description,stack,setupInstructions:setup,files};
}
function normalize(raw,prompt,fallbackStyle){
  const x=raw&&typeof raw==="object"?raw:{};
  let source=Array.isArray(x.navigation)?x.navigation:Array.isArray(x.sections)?x.sections:Array.isArray(x.pages)?x.pages:[];
  source=source.slice(0,6);
  const sections=source.map((item,index)=>{
    const heading=clean(item?.heading||item?.title||item?.name,"Explore "+(index+1),90);
    const label=clean(item?.label||item?.navLabel||item?.title||item?.name,heading,28);
    const intro=clean(item?.intro||item?.text||item?.description,"Discover more about "+heading.toLowerCase()+".",420);
    let cards=Array.isArray(item?.cards)?item.cards:Array.isArray(item?.items)?item.items:[];
    cards=cards.slice(0,4).map((card,cardIndex)=>{
      if(typeof card==="string")return {title:clean(card,"Details "+(cardIndex+1),80),text:intro};
      return {title:clean(card?.title||card?.heading,"More information",80),text:clean(card?.text||card?.description||card?.detail,intro,300)};
    });
    return {id:"section-"+(index+1),label,heading,intro,cards};
  });
  if(sections.length<2){
    sections.push(
      {id:"section-"+(sections.length+1),label:"Explore",heading:"Explore more",intro:"Discover more information and useful details.",cards:[{title:"More to discover",text:"Add the details visitors need to know."}]},
      {id:"section-"+(sections.length+2),label:"Details",heading:"More information",intro:"Find additional information about this website.",cards:[{title:"Useful information",text:"Add relevant details for your visitors."}]}
    );
  }
  return {
    title:clean(x.title||x.siteName,"Your website",65),
    designStyle:clean(x.designStyle,fallbackStyle||"Modern and polished",60),
    eyebrow:clean(x.eyebrow,"WELCOME",45),
    tagline:clean(x.tagline||x.headline,clean(prompt,"Discover something new.",110),145),
    intro:clean(x.intro||x.description,"Explore the information and features on this website.",420),
    sections,
    recommendations:normalizeRecommendations(x.recommendations)
  };
}
function buildSinglePage(data,style){
  const dark=/dark|cinematic/i.test(style),premium=/premium|elegant/i.test(style),colourful=/colour|color|bold/i.test(style),minimal=/minimal|clean/i.test(style);
  const theme=dark
    ?":root{--bg:#090e1b;--surface:#131c30;--text:#f5f6ff;--muted:#aeb8ce;--accent:#9a83ff;--accent2:#39c6d2;--line:#28344b;--hero:#10182b}"
    :premium
    ?":root{--bg:#f6f1e8;--surface:#fffdf8;--text:#292116;--muted:#786e5e;--accent:#98703a;--accent2:#caa76b;--line:#e9dfce;--hero:#241e17}"
    :colourful
    ?":root{--bg:#fff8f2;--surface:#fff;--text:#261a35;--muted:#74677e;--accent:#ee603e;--accent2:#7657e8;--line:#f0dfd6;--hero:#2b194c}"
    :minimal
    ?":root{--bg:#f6f8f6;--surface:#fff;--text:#1c2b23;--muted:#68776e;--accent:#287c59;--accent2:#82b398;--line:#e1e9e3;--hero:#193a2e}"
    :":root{--bg:#f5f7fb;--surface:#fff;--text:#172033;--muted:#65718a;--accent:#315de8;--accent2:#7a55e8;--line:#e5eaf3;--hero:#101a35}";
  const css='*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}a{color:inherit;text-decoration:none}.wrap{width:min(1100px,calc(100% - 40px));margin:auto}.topbar{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{font-size:19px;font-weight:850;letter-spacing:-.04em}.nav{display:flex;gap:22px;flex-wrap:wrap}.nav a{font-size:13px;font-weight:750;color:var(--muted);padding:9px 0;border-bottom:2px solid transparent}.nav a:hover,.nav a:focus{color:var(--accent);border-color:var(--accent)}.hero{background:var(--hero);color:white;position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:480px;height:480px;right:-130px;top:-260px;border-radius:50%;background:radial-gradient(circle,var(--accent2),transparent 68%);opacity:.3}.hero-inner{position:relative;z-index:1;padding:75px 0 88px;max-width:790px}.eyebrow{font-size:11px;font-weight:850;letter-spacing:.17em;color:var(--accent2)}.hero .eyebrow{color:#c9c2ff}.hero h1{font-size:clamp(40px,7vw,72px);line-height:1.04;letter-spacing:-.055em;margin:16px 0 20px}.hero p{max-width:680px;color:#d3d9e8;font-size:17px;margin:0 0 28px}.button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:13px 21px;background:var(--accent);color:#fff;font-weight:800;font-size:13px}.section{padding:70px 0;border-bottom:1px solid var(--line);scroll-margin-top:18px}.section h2{font-size:clamp(30px,5vw,48px);line-height:1.1;letter-spacing:-.045em;margin:12px 0 18px}.section>p{color:var(--muted);max-width:820px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px;margin-top:28px}.card{background:var(--surface);border:1px solid var(--line);border-radius:17px;padding:24px;box-shadow:0 10px 26px #17203308}.card h3{font-size:19px;line-height:1.25;margin:0 0 10px}.card p{font-size:14px;color:var(--muted);margin:0}.footer{border-top:1px solid var(--line);padding:22px 0 32px;font-size:12px;color:var(--muted)}@media(max-width:720px){.topbar{align-items:flex-start;flex-direction:column;padding:17px 0}.nav{gap:15px}.hero-inner{padding:58px 0 68px}.cards{grid-template-columns:1fr}.section{padding:52px 0}}';
  const nav='<a href="#home">Home</a>'+data.sections.map(s=>'<a href="#'+s.id+'">'+esc(s.label)+'</a>').join("");
  const sectionsHtml=data.sections.map((s,index)=>{
    const cards=s.cards.map(card=>'<article class="card"><h3>'+esc(card.title)+'</h3><p>'+esc(card.text)+'</p></article>').join("");
    return '<section class="section wrap" id="'+s.id+'"><span class="eyebrow">'+esc(s.label.toUpperCase())+'</span><h2>'+esc(s.heading)+'</h2><p>'+esc(s.intro)+'</p><div class="cards">'+cards+'</div></section>';
  }).join("");
  const title=esc(data.title);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+esc(data.intro.slice(0,150))+'"><title>'+title+'</title><style>'+theme+css+'</style></head><body><header class="hero" id="home"><div class="wrap"><div class="topbar"><a class="brand" href="#home">'+title+'</a><nav class="nav" aria-label="Main navigation">'+nav+'</nav></div><div class="hero-inner"><span class="eyebrow">'+esc(data.eyebrow)+'</span><h1>'+esc(data.tagline)+'</h1><p>'+esc(data.intro)+'</p>'+(data.sections[0]?'<a class="button" href="#'+data.sections[0].id+'">Explore the website</a>':"")+'</div></div></header><main>'+sectionsHtml+'</main><footer class="footer"><div class="wrap">'+title+' · Built with MIDCRUSH AI</div></footer></body></html>';
}
const SYSTEM_PROMPT="You are a conversational AI website builder. Create or revise a complete website from the user's brief. Return ONLY valid compact JSON with fields title, designStyle, eyebrow, tagline, intro, navigation. navigation must be an array of 2 to 6 objects. Each object has label (short navigation tab text), heading, intro, cards. cards is an array of 2 to 4 objects, each with title and text. Choose every navigation tab and its content to fit the exact website type and the user's brief. The navigation sections are detailed areas within ONE website, not separate HTML files. Do not force About, Services, Contact, Pricing, or any standard business section into every website. Include Contact only when requested or genuinely appropriate. For a movie website, relevant tabs might be Movies, Categories, Series, VJs, Latest Uploads or similar. For a school, use areas such as Academics, Admissions, School Life. For a restaurant, use Menu, Story, Gallery or Location when appropriate. These are examples, not fixed templates. Give useful, specific details. Do not invent real contact details, prices, ratings, testimonials, awards, or factual claims. Do not use lorem ipsum. designStyle must be one of: Modern and polished, Minimal and clean, Bold and colourful, Elegant and premium, Dark and cinematic. No Markdown, code, or explanations. Keep the JSON concise and below 700 words.";;
export async function onRequestPost({request,env}){
  let body;try{body=await request.json();}catch{return json({error:"Please enter a website description."},400);}
  if(body.mode==="chat"){
    const messages=Array.isArray(body.messages)?body.messages:[];
    if(!messages.length||messages.length>12)return json({error:"Please send between 1 and 12 website chat messages."},400);
    let totalCharacters=0;const cleanMessages=[];
    for(const item of messages){
      if(!item||!["user","assistant"].includes(item.role)||typeof item.content!=="string")return json({error:"One of the website chat messages is invalid."},400);
      const content=item.content.trim();if(!content||content.length>3000)return json({error:"Each website chat message must contain 1 to 3,000 characters."},400);
      totalCharacters+=content.length;cleanMessages.push({role:item.role,content});
    }
    if(totalCharacters>10000||cleanMessages[cleanMessages.length-1].role!=="user")return json({error:"The website conversation is too long or the latest message is missing."},400);
    const current=body.currentSiteData&&typeof body.currentSiteData==="object"?body.currentSiteData:null;
    const currentProject=body.currentProject&&typeof body.currentProject==="object"?body.currentProject:null;
    const projectPreference=["single-html","multi-file"].includes(body.projectPreference)?body.projectPreference:"auto";
    if(!env.AI)return json({error:"Website generation is not connected. Check the Workers AI binding in your Cloudflare Pages settings."},503);
    try{
      let system=CHAT_BUILDER_SYSTEM_PROMPT+"\\n\\nRequested output preference: "+projectPreference+". Choose the appropriate architecture and obey an explicit preference.";
      if(current)system+="\\n\\nCURRENT SINGLE-PAGE SITE DATA (reference only): "+JSON.stringify(current);
      if(currentProject)system+="\\n\\nCURRENT MULTI-FILE PROJECT (preserve existing files and update only requested parts): "+JSON.stringify(currentProject);
      const result=await env.AI.run("@cf/zai-org/glm-4.7-flash",{
        messages:[{role:"system",content:system},...cleanMessages],
        max_completion_tokens:projectPreference==="multi-file"?9000:6500,
        chat_template_kwargs:{enable_thinking:false},temperature:0.25
      });
      const raw=parseJson(readText(result));if(!raw)return json({error:"The AI could not understand the website request. Please try again."},502);
      if(raw.status==="clarify")return json({status:"clarify",message:clean(raw.message,"I need one more detail before I build this.",240),question:clean(raw.question,"What is the main purpose of the website?",240),choices:Array.isArray(raw.choices)?raw.choices.slice(0,4).map(v=>clean(v,"",90)).filter(Boolean):[],model:"MIDCRUSH AI · project planning"});
      if(raw.status==="guide")return json({status:"guide",message:clean(raw.message,"This feature needs additional setup before it can work.",1600),model:"MIDCRUSH AI · project setup guide"});
      if(raw.status!=="ready")return json({error:"The AI returned an incomplete website or project response. Please try again."},502);
      const latestPrompt=cleanMessages[cleanMessages.length-1].content;
      const projectMode=raw.projectMode==="multi-file"||Array.isArray(raw.files)?"multi-file":"single-html";
      if(projectPreference==="multi-file"&&projectMode!=="multi-file")return json({error:"The AI did not return the requested multi-file project. Please try again or choose Auto choose."},502);
      if(projectPreference==="single-html"&&projectMode!=="single-html")return json({error:"The AI did not return the requested standalone HTML website. Please try again."},502);
      const assistantMessage=clean(raw.assistantMessage,current||currentProject?"I updated the requested parts and kept the rest of your project.":"The project is ready. Here are a few optional improvements.",500);
      if(projectMode==="multi-file"){
        const project=normalizeProject(raw,latestPrompt);
        return json({status:"ready",projectMode,assistantMessage,project,recommendations:normalizeRecommendations(raw.recommendations),files:project.files,model:"MIDCRUSH AI · multi-file project builder"});
      }
      const data=normalize(raw,latestPrompt,current?.designStyle||"Modern and polished");
      return json({status:"ready",projectMode,assistantMessage,recommendations:data.recommendations,html:buildSinglePage(data,data.designStyle),siteData:data,model:"MIDCRUSH AI · standalone HTML website builder"});
    }catch(error){
      const message=String(error?.message||error||"Unknown error");console.error("MIDCRUSH website chat error:",message);
      if(/3036|10,000 neurons|daily free allocation/i.test(message))return json({error:"The free daily Cloudflare AI allowance has been used up. It resets at 00:00 UTC."},429);
      if(/3040|out of capacity|capacity/i.test(message))return json({error:"The AI service is busy right now. Please try again shortly."},503);
      if(/3007|3008|timeout|timed out|deadline/i.test(message))return json({error:"Cloudflare timed out while planning the website. Try again with a shorter message."},504);
      if(/5035|workers paid plan/i.test(message))return json({error:"Cloudflare says this AI model requires a paid Workers plan."},403);
      if(/3042|no such model|model.*not found|invalid model/i.test(message))return json({error:"Cloudflare could not find the configured website AI model."},502);
      return json({error:"Website planning failed. Please try again."},502);
    }
  }
  const prompt=typeof body.prompt==="string"?body.prompt.trim():"";
  const siteType=typeof body.siteType==="string"?body.siteType.slice(0,60):"Website";
  const requestedStyle=typeof body.designStyle==="string"?body.designStyle.slice(0,60):"Modern and polished";
  const isRevision=body.mode==="revise";
  const currentSiteData=isRevision&&body.currentSiteData&&typeof body.currentSiteData==="object"?body.currentSiteData:null;
  if(!prompt)return json({error:"Describe the website you want to build."},400);
  if(prompt.length>2800)return json({error:"Keep your website description under 2,800 characters."},400);
  if(isRevision&&!currentSiteData)return json({error:"The current website data is missing. Build the website again before requesting changes."},400);
  if(!env.AI)return json({error:"Website generation is not connected. Check the Workers AI binding in your Cloudflare Pages settings."},503);
  try{
    const userBrief=isRevision
      ? "Revise the current website according to the user's message.\nCurrent website data: "+JSON.stringify(currentSiteData)+"\nUser's requested change: "+prompt+"\nPreserve the existing title, sections, navigation and content that the user did not ask to change. Add or remove sections only when requested or clearly necessary. Keep the website type and purpose unchanged."
      : "Website type: "+siteType+"\nDesign style: "+requestedStyle+"\nWebsite brief: "+prompt;
    const result=await env.AI.run("@cf/zai-org/glm-4.7-flash",{
      messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:userBrief}],
      max_completion_tokens:1800,chat_template_kwargs:{enable_thinking:false},temperature:0.25
    });
    const raw=parseJson(readText(result));
    if(!raw)return json({error:"The AI could not update the website structure. Please try again."},502);
    const data=normalize(raw,prompt,requestedStyle);
    const html=buildSinglePage(data,data.designStyle);
    return json({html,siteData:data,model:isRevision?"Website updated":"Cloudflare Workers AI · conversational single-file website builder"});
  }catch(error){
    const message=String(error?.message||error||"Unknown error");
    console.error("MIDCRUSH website generation error:",message);
    if(/3036|10,000 neurons|daily free allocation/i.test(message))return json({error:"The free daily Cloudflare AI allowance has been used up. It resets at 00:00 UTC."},429);
    if(/3040|out of capacity|capacity/i.test(message))return json({error:"The AI service is busy right now. Try again shortly."},503);
    if(/3007|3008|timeout|timed out|deadline/i.test(message))return json({error:"Cloudflare timed out while generating the website. Try again with a shorter brief."},504);
    if(/5035|workers paid plan/i.test(message))return json({error:"Cloudflare says this AI model requires a paid Workers plan."},403);
    if(/3042|no such model|model.*not found|invalid model/i.test(message))return json({error:"Cloudflare could not find the configured website AI model."},502);
    return json({error:"Website generation failed. Please try again."},502);
  }
}