const HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:HEADERS});
}
function clean(value,max=240){
  return typeof value==="string"?value.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max):"";
}
function safeUrl(value){
  try{
    const url=new URL(value);
    return url.protocol==="https:"||url.protocol==="http:"?url.toString():"";
  }catch{return "";}
}
function blockedSearch(query){
  const text=query.toLowerCase();
  const restrictedService=/\b(bet|betting|sportsbook|casino|gambling|wager|lottery site|poker site)\b/i.test(text);
  const dangerousAcquisition=/\b(how to|where to|buy|purchase|get|obtain|make|build|use|download|find|access)\b/i.test(text)&&
    /\b(gun|firearm|ammunition|explosive|bomb|grenade|weapon|switchblade|taser|pepper spray|poison|toxin|illegal drug|cocaine|heroin|methamphetamine|fentanyl|steroid|self harm|suicide method)\b/i.test(text);
  const adultExplicit=/\b(find|search|access|download|watch|get)\b/i.test(text)&&/\b(porn|pornography|explicit videos?|nudes?)\b/i.test(text);
  return restrictedService||dangerousAcquisition||adultExplicit;
}

export async function onRequestPost({request,env}){
  let body;
  try{body=await request.json();}catch{return json({error:"Send a valid search request."},400);}
  const query=clean(body?.query,240);
  const type=["web","news","images"].includes(body?.type)?body.type:"web";
  const scope=clean(body?.scope,32).toLowerCase();
  if(query.length<2)return json({error:"Enter at least two characters to search."},400);
  if(blockedSearch(query))return json({error:"This search isn't available in MIDCRUSH AI. Try a general educational or safety-focused question instead."},400);
  const apiKey=env.TAVILY_API_KEY;
  if(!apiKey)return json({
    error:"Internet search is not configured yet. Add TAVILY_API_KEY as a Cloudflare Pages secret, then redeploy.",
    setupRequired:true
  },503);

  const includeDomains={
    youtube:["youtube.com"],
    github:["github.com"],
    reddit:["reddit.com"],
    stackoverflow:["stackoverflow.com"],
    docs:["developers.google.com","developer.mozilla.org","docs.github.com","learn.microsoft.com","developers.cloudflare.com"],
    tiktok:["tiktok.com"]
  };
  const kampalaDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Kampala",year:"numeric",month:"long",day:"numeric"}).format(new Date());
  const isUnebNews=type==="news"&&/\b(uneb|uganda national examinations board)\b/i.test(query);
  const baseRequest={
    search_depth:type==="news"?"advanced":"basic",
    chunks_per_source:3,
    max_results:type==="news"?10:8,
    topic:type==="news"?"news":"general",
    ...(type==="news"?{days:14,country:"uganda"}:{}),
    include_answer:false,
    include_raw_content:type==="news"?"text":false,
    include_images:type==="images",
    include_image_descriptions:type==="images",
    include_favicon:true,
    include_domains:scope&&includeDomains[scope]?includeDomains[scope]:[],
    exclude_domains:type==="news"?["tiktok.com"]:[],
    safe_search:true,
    include_usage:true
  };
  try{
    const searchQueries=isUnebNews?[
      query+" Uganda UNEB latest UACE examination news "+kampalaDate,
      "Uganda UNEB PLE examination malpractice arrests latest November 2026",
      "Uganda UNEB UACE examinations updates candidates latest November 2026"
    ]:[scope&&includeDomains[scope]?query+" site:"+includeDomains[scope][0]:query];
    const responses=await Promise.all(searchQueries.map(searchQuery=>fetch("https://api.tavily.com/search",{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({...baseRequest,query:searchQuery})
    })));
    const payloads=await Promise.all(responses.map(async response=>({ok:response.ok,status:response.status,data:await response.json().catch(()=>({}))})));
    const failed=payloads.find(item=>!item.ok);
    if(failed){
      const detail=clean(failed.data?.detail?.error||failed.data?.error,220);
      if(failed.status===401)return json({error:"The Tavily key was rejected. Check the TAVILY_API_KEY secret in Cloudflare."},502);
      if(failed.status===429||failed.status===432||failed.status===433)return json({error:"The search service has reached its current request or credit limit. Check your Tavily usage and try again later."},429);
      return json({error:detail||"The internet search provider could not complete this request."},502);
    }
    const data={
      results:payloads.flatMap(item=>Array.isArray(item.data.results)?item.data.results:[]),
      images:payloads.flatMap(item=>Array.isArray(item.data.images)?item.data.images:[]),
      usage:{credits:payloads.reduce((sum,item)=>sum+(Number(item.data?.usage?.credits)||0),0)}
    };
    const results=data.results.map(item=>{
      const raw=typeof item?.raw_content==="string"?item.raw_content:item?.content;
      return {
        title:clean(item?.title,180)||"Untitled result",
        url:safeUrl(item?.url),
        content:clean(raw,type==="news"?1800:900),
        score:Number.isFinite(item?.score)?item.score:null,
        publishedDate:clean(item?.published_date,40),
        favicon:safeUrl(item?.favicon)
      };
    }).filter(item=>item.url);
    if(type==="news"){
      results.sort((a,b)=>{
        const dateA=Date.parse(a.publishedDate)||0;
        const dateB=Date.parse(b.publishedDate)||0;
        if(dateA!==dateB)return dateB-dateA;
        return (b.score||0)-(a.score||0);
      });
      // Remove duplicate URLs and repeated headlines before the chat receives
      // the chat evidence limit. Keep different publishers as separate
      // sources when they report the same event so claims can be cross-checked.
      const seenUrls=new Set();
      const seenTitles=new Set();
      const unique=[];
      for(const item of results){
        let host="";
        try{host=new URL(item.url).hostname.toLowerCase();}catch{}
        if(/(^|\.)tiktok\.com$/.test(host)&&/\/discover\//i.test(item.url))continue;
        if(isUnebNews){
          const evidence=(item.title+" "+item.content).toLowerCase();
          if(!/\b(uneb|uganda national examinations board|uace|uce|ple)\b/.test(evidence))continue;
          const titleTerms=item.title.toLowerCase().match(/[a-z0-9]{4,}/g)||[];
          const stop=new Set(["uganda","national","examinations","examination","board","latest","news","today","2026","2025"]);
          const anchors=titleTerms.filter(word=>!stop.has(word));
          const matched=anchors.filter(word=>item.content.toLowerCase().includes(word)).length;
          if(anchors.length>=2&&matched===0)continue;
        }
        let canonical=item.url;
        try{
          const parsed=new URL(item.url);
          parsed.hash="";
          for(const key of [...parsed.searchParams.keys()]){
            if(/^utm_/i.test(key)||["fbclid","gclid","mc_cid","mc_eid"].includes(key.toLowerCase()))parsed.searchParams.delete(key);
          }
          parsed.searchParams.sort();
          canonical=parsed.toString().replace(/\/$/,"");
        }catch{}
        const titleKey=item.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
        if(seenUrls.has(canonical)||seenTitles.has(titleKey))continue;
        seenUrls.add(canonical);
        seenTitles.add(titleKey);
        unique.push(item);
      }
      results.splice(0,results.length,...unique.slice(0,isUnebNews?12:10));
    }else{
      results.splice(8);
    }
    const images=(Array.isArray(data.images)?data.images:[]).slice(0,12).map(item=>({
      url:safeUrl(typeof item==="string"?item:item?.url),
      description:clean(item?.description,180)
    })).filter(item=>item.url);
    return json({
      query,
      type,
      answer:clean(data.answer,2800),
      results,
      images,
      usage:{credits:Number.isFinite(data?.usage?.credits)?data.usage.credits:null},
      provider:"Tavily"
    });
  }catch{
    return json({error:"Could not reach the search provider. Check the connection and try again."},502);
  }
}
