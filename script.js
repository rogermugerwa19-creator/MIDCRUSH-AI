const toolInfo = {
  chat:{title:"AI Chat",kicker:"THINK & WRITE",description:"Your thinking partner for ideas, questions and everyday tasks.",icon:"message-circle",kind:"chat"},
  video:{title:"AI Video",kicker:"BRING IDEAS TO LIFE",description:"Explore creative video concepts and text-to-video workflows.",icon:"clapperboard"},
  image:{title:"AI Image",kicker:"IMAGINE & CREATE",description:"Turn your imagination into original visual concepts.",icon:"image",kind:"image"},
  voice:{title:"AI Voice",kicker:"SOUND & SPEAK",description:"Explore voice generation and audio experiences.",icon:"audio-lines"},
  coding:{title:"AI Coding",kicker:"BUILD & DEVELOP",description:"Get help understanding, writing and improving code.",icon:"code-2"},
  learn:{title:"Learn Programming",kicker:"LEARN & PRACTISE",description:"Learn programming languages step by step with lessons, exercises and code feedback.",icon:"graduation-cap",kind:"learn"},
  documents:{title:"Documents",kicker:"PLAN & ORGANISE",description:"Create and refine letters, reports, notes and more.",icon:"file-text"},
  music:{title:"AI Music",kicker:"CREATE YOUR SOUND",description:"Explore music ideas, styles and audio creation.",icon:"music-2"},
  website:{title:"Website Builder",kicker:"DESIGN & LAUNCH",description:"Generate, preview and download complete websites from a description.",icon:"panels-top-left",kind:"website"},
  internet:{title:"Internet & Connections",kicker:"EXPLORE & CONNECT",description:"Search public websites and explore secure platform integrations.",icon:"globe",kind:"internet"},
  editing:{title:"Photo Editing",kicker:"REFINE & REMIX",description:"Explore creative edits and image improvements.",icon:"wand-sparkles"}
};
const sidebar=document.getElementById("sidebar");
const homePage=document.getElementById("homePage");
const toolPage=document.getElementById("toolPage");
const toast=document.getElementById("toast");
let toastTimer;
function showToast(message){toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2600)}
function navigate(page){
  const info=toolInfo[page];
  document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===page));
  sidebar.classList.remove("open");
  if(page==="home"||!info){homePage.classList.add("active-page");toolPage.classList.remove("active-page");document.getElementById("crumbCurrent").textContent="Overview";return}
  homePage.classList.remove("active-page");toolPage.classList.add("active-page");
  document.getElementById("crumbCurrent").textContent=info.title;
  document.getElementById("pageTitle").textContent=info.title;
  document.getElementById("pageKicker").textContent=info.kicker;
  document.getElementById("pageDescription").textContent=info.description;
  document.getElementById("pageIcon").innerHTML='<i data-lucide="'+info.icon+'"></i>';
  renderWorkspace(info);
  if(window.lucide)lucide.createIcons();
}
function renderWorkspace(info){
  const target=document.getElementById("toolWorkspace");
  if(info.kind==="chat"){
    target.innerHTML='<div class="workspace-card"><div class="chat-toolbar"><div class="workspace-label">Your conversations</div><div class="chat-actions"><button type="button" class="chat-action" id="newChatButton"><i data-lucide="plus"></i> New chat</button><button type="button" class="chat-action" id="copyReplyButton" disabled><i data-lucide="copy"></i> Copy reply</button></div></div><div class="chat-box" id="chatBox"><div class="welcome-message">👋 Welcome to MIDCRUSH AI. Ask a question, explore an idea, or describe a website. I can ask a few questions, then build it here in the chat.</div></div><div class="chat-tools-row"><select id="chatMode" aria-label="Chat mode"><option value="chat">Normal Chat</option><option value="chat-web">AI Chat + Web Search</option><option value="website">Build Website · Auto choose</option><option value="website-single">Standalone HTML</option><option value="website-fullstack">Full-stack Project</option><option value="generate">Generate Image</option><option value="edit">Edit Photo</option></select><label class="chat-upload-button" for="chatImageFile"><i data-lucide="image-plus"></i> Add photo</label><input id="chatImageFile" type="file" accept="image/jpeg,image/png,image/webp" hidden></div><div class="chat-image-preview" id="chatImagePreview" hidden></div><form class="chat-compose" id="chatForm"><input id="chatInput" autocomplete="off" placeholder="Message MIDCRUSH AI..." aria-label="Your message"><button class="send-button" aria-label="Send message"><i data-lucide="arrow-up"></i></button></form><div class="chat-footnote">Recent chats are saved in this browser on this device. AI responses can make mistakes; check important information.</div></div>';
    const chatForm=document.getElementById("chatForm");
    const chatInput=document.getElementById("chatInput");
    const chatMode=document.getElementById("chatMode");
    const chatImageFile=document.getElementById("chatImageFile");
    const chatImagePreview=document.getElementById("chatImagePreview");
    let attachedImageData="";
    const sendButton=chatForm.querySelector("button");
    const chatBox=document.getElementById("chatBox");
    const recentChats=document.getElementById("sidebarRecents");
    const copyReplyButton=document.getElementById("copyReplyButton");
    const STORAGE_KEY="midcrush_ai_recent_chats_v1";
    let conversations=[];
    let currentChatId=null;
    let history=[];
    let latestReply="";
    let pendingEdit=null;
    let pendingEditCard=null;
    let pendingGeneration=null;
    let editSession=null;
    let currentImageData="";
    let websiteSessionActive=false;
    let websiteMessages=[];
    let websiteSiteData=null;
    let websiteHtml="";
    let websitePreviewUrl="";
    let websiteProjectMode="single-html";
    let websiteFiles=[];
    let websiteProjectInfo=null;
    let websiteActiveFilePath="";
    let websitePreference="auto";
    function readConversations(){
      try{
        const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
        return Array.isArray(saved)?saved.filter(c=>c&&typeof c.id==="string"&&Array.isArray(c.messages)): [];
      }catch{return [];}
    }
    function saveConversations(){
      try{
        conversations=conversations.slice(0,30);
        localStorage.setItem(STORAGE_KEY,JSON.stringify(conversations));
      }catch{showToast("Could not save chats. Your browser storage may be full.");}
      renderRecentChats();
    }
    function renderRecentChats(){
      recentChats.replaceChildren();
      if(!conversations.length){
        const empty=document.createElement("div");
        empty.className="sidebar-recents-empty";
        empty.textContent="No conversations yet";
        recentChats.appendChild(empty);
        return;
      }
      conversations.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).forEach(conversation=>{
        const item=document.createElement("div");
        item.className="sidebar-recent-item"+(conversation.id===currentChatId?" active":"");
        const open=document.createElement("button");
        open.type="button";
        open.className="sidebar-recent-open";
        open.textContent=conversation.title||"New conversation";
        open.title=conversation.title||"New conversation";
        open.addEventListener("click",()=>loadConversation(conversation.id));
        const remove=document.createElement("button");
        remove.type="button";
        remove.className="sidebar-recent-delete";
        remove.setAttribute("aria-label","Delete "+(conversation.title||"conversation"));
        remove.textContent="×";
        remove.addEventListener("click",()=>{
          conversations=conversations.filter(c=>c.id!==conversation.id);
          if(currentChatId===conversation.id){currentChatId=null;history=[];latestReply="";currentImageData="";attachedImageData="";editSession=null;websiteSessionActive=false;websiteMessages=[];websiteSiteData=null;websiteHtml="";websiteProjectMode="single-html";websiteFiles=[];websiteProjectInfo=null;websiteActiveFilePath="";websitePreference="auto";if(websitePreviewUrl){URL.revokeObjectURL(websitePreviewUrl);websitePreviewUrl="";}chatMode.value="chat";chatInput.placeholder="Message MIDCRUSH AI...";renderHistory();copyReplyButton.disabled=true;}
          saveConversations();
        });
        item.append(open,remove);
        recentChats.appendChild(item);
      });
    }
    function createWebsiteProjectZip(files){
      const encoder=new TextEncoder();
      const localChunks=[];
      const centralChunks=[];
      let offset=0;
      const crc32=data=>{
        let crc=0xffffffff;
        for(let i=0;i<data.length;i++){
          crc^=data[i];
          for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
        }
        return (crc^0xffffffff)>>>0;
      };
      for(const file of files){
        const name=encoder.encode(file.path);
        const data=encoder.encode(file.content);
        const crc=crc32(data);
        const local=new Uint8Array(30+name.length+data.length);
        const lv=new DataView(local.buffer);
        lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);
        lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);
        lv.setUint16(10,0,true);lv.setUint16(12,0x21,true);
        lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);
        lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);
        lv.setUint16(28,0,true);local.set(name,30);local.set(data,30+name.length);
        localChunks.push(local);
        const central=new Uint8Array(46+name.length);
        const cv=new DataView(central.buffer);
        cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);
        cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
        cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0x21,true);
        cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);
        cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);
        cv.setUint16(30,0,true);cv.setUint16(32,0,true);
        cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);
        cv.setUint32(42,offset,true);central.set(name,46);centralChunks.push(central);
        offset+=local.length;
      }
      const centralSize=centralChunks.reduce((sum,part)=>sum+part.length,0);
      const end=new Uint8Array(22);
      const ev=new DataView(end.buffer);
      ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);
      ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
      ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);ev.setUint16(20,0,true);
      return new Blob([...localChunks,...centralChunks,end],{type:"application/zip"});
    }
    function downloadWebsiteProject(){
      if(!websiteFiles.length)return;
      const blob=createWebsiteProjectZip(websiteFiles);
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;
      link.download=(websiteProjectInfo?.name||"midcrush-project")+".zip";
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    }
    function renderWebsiteArtifact(){
      chatBox.querySelector("#chatWebsiteArtifact")?.remove();
      if(websiteProjectMode==="multi-file"&&websiteFiles.length){
        const card=document.createElement("section");card.id="chatWebsiteArtifact";card.className="chat-website-artifact multi-file-project";
        const heading=document.createElement("div");heading.className="chat-website-artifact-heading";
        const title=document.createElement("strong");title.textContent=websiteProjectInfo?.name||"Your project";
        const detail=document.createElement("span");detail.textContent=websiteFiles.length+" files · "+(websiteProjectInfo?.stack||[]).join(" · ");
        heading.append(title,detail);
        const description=document.createElement("p");description.className="project-description";
        description.textContent=websiteProjectInfo?.description||"A multi-file project generated by MIDCRUSH AI.";
        const actions=document.createElement("div");actions.className="chat-website-artifact-actions";
        const download=document.createElement("button");download.type="button";download.textContent="Download project ZIP";download.addEventListener("click",downloadWebsiteProject);
        const copy=document.createElement("button");copy.type="button";copy.textContent="Copy current file";
        actions.append(download,copy);
        const workspace=document.createElement("div");workspace.className="project-file-workspace";
        const list=document.createElement("nav");list.className="project-file-list";list.setAttribute("aria-label","Project files");
        const editor=document.createElement("div");editor.className="project-file-editor";
        const fileName=document.createElement("div");fileName.className="project-file-name";
        const code=document.createElement("textarea");code.className="project-file-code";code.readOnly=true;code.spellcheck=false;code.setAttribute("aria-label","Selected project source code");
        const active=websiteFiles.find(file=>file.path===websiteActiveFilePath)||websiteFiles[0];
        websiteActiveFilePath=active.path;
        const showFile=file=>{
          websiteActiveFilePath=file.path;fileName.textContent=file.path;code.value=file.content;
          list.querySelectorAll("button").forEach(button=>button.classList.toggle("active",button.dataset.path===file.path));
          copy.disabled=false;
        };
        websiteFiles.forEach(file=>{
          const button=document.createElement("button");button.type="button";button.textContent=file.path;button.dataset.path=file.path;
          button.title=file.path;button.addEventListener("click",()=>showFile(file));list.appendChild(button);
        });
        copy.addEventListener("click",async()=>{
          try{await navigator.clipboard.writeText(code.value);showToast("File copied.");}
          catch{code.focus();code.select();showToast("Select the code and copy it.");}
        });
        editor.append(fileName,code);workspace.append(list,editor);showFile(active);
        const instructions=document.createElement("div");instructions.className="project-setup-notes";
        const setupTitle=document.createElement("strong");setupTitle.textContent="Setup guide";
        instructions.appendChild(setupTitle);
        const setup=websiteProjectInfo?.setupInstructions||[];
        if(setup.length){
          const steps=document.createElement("ol");
          setup.forEach(step=>{const li=document.createElement("li");li.textContent=step;steps.appendChild(li);});
          instructions.appendChild(steps);
        }else{
          const note=document.createElement("p");note.textContent="Open README.md in the file list for installation and run instructions.";instructions.appendChild(note);
        }
        const note=document.createElement("p");note.className="project-preview-note";
        note.textContent="This project contains multiple files and may include frontend and backend code. The source is shown here; run it using the instructions in README.md. Backend services, databases and secret keys must be configured separately.";
        card.append(heading,description,actions,workspace,instructions,note);chatBox.appendChild(card);
        return;
      }
      if(!websiteHtml)return;
      if(websitePreviewUrl)URL.revokeObjectURL(websitePreviewUrl);
      websitePreviewUrl=URL.createObjectURL(new Blob([websiteHtml],{type:"text/html;charset=utf-8"}));
      const card=document.createElement("section");card.id="chatWebsiteArtifact";card.className="chat-website-artifact";
      const heading=document.createElement("div");heading.className="chat-website-artifact-heading";
      const title=document.createElement("strong");title.textContent="Your website";
      const detail=document.createElement("span");detail.textContent="Live preview · One HTML file";heading.append(title,detail);
      const actions=document.createElement("div");actions.className="chat-website-artifact-actions";
      const download=document.createElement("button");download.type="button";download.textContent="Download HTML";
      download.addEventListener("click",()=>{const url=URL.createObjectURL(new Blob([websiteHtml],{type:"text/html;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="midcrush-website.html";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);});
      const refresh=document.createElement("button");refresh.type="button";refresh.textContent="Refresh preview";refresh.addEventListener("click",()=>renderWebsiteArtifact());
      actions.append(download,refresh);
      const frame=document.createElement("iframe");frame.className="chat-website-preview";frame.title="Website generated in MIDCRUSH AI chat";frame.setAttribute("sandbox","");frame.setAttribute("referrerpolicy","no-referrer");frame.src=websitePreviewUrl;
      const note=document.createElement("p");note.textContent="Ask for changes in this same chat. MIDCRUSH AI will update this website without replacing parts you did not ask to change.";
      card.append(heading,actions,frame,note);chatBox.appendChild(card);
    }
    function renderHistory(){
      chatBox.replaceChildren();
      if(!history.length){
        const welcome=document.createElement("div");
        welcome.className="welcome-message";
        welcome.textContent="👋 Welcome to MIDCRUSH AI. Ask a question, explore an idea, or describe a website. I can clarify your idea and build the site here.";
        chatBox.appendChild(welcome);
      }else{
        history.forEach(message=>{
          const bubble=document.createElement("div");
          bubble.className=message.role==="user"?"message-bubble":"reply-bubble";
          bubble.textContent=message.content;
          chatBox.appendChild(bubble);
        });
      }
      if(websiteHtml||websiteFiles.length)renderWebsiteArtifact();
      chatBox.scrollTop=chatBox.scrollHeight;
      latestReply=[...history].reverse().find(m=>m.role==="assistant")?.content||"";
      copyReplyButton.disabled=!latestReply;
    }
    function loadConversation(id){
      const conversation=conversations.find(c=>c.id===id);
      if(!conversation)return;
      currentChatId=id;
      if(websitePreviewUrl){URL.revokeObjectURL(websitePreviewUrl);websitePreviewUrl="";}
      currentImageData=typeof conversation.imageData==="string"?conversation.imageData:"";
      attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();
      editSession=null;pendingEdit=null;pendingEditCard=null;
      websiteSessionActive=conversation.websiteSessionActive===true;
      websiteMessages=Array.isArray(conversation.websiteMessages)?conversation.websiteMessages.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-12):[];
      websiteSiteData=conversation.websiteSiteData&&typeof conversation.websiteSiteData==="object"?conversation.websiteSiteData:null;
      websiteHtml=typeof conversation.websiteHtml==="string"?conversation.websiteHtml:"";
      websiteProjectMode=conversation.websiteProjectMode==="multi-file"?"multi-file":"single-html";
      websiteFiles=Array.isArray(conversation.websiteFiles)?conversation.websiteFiles.filter(f=>f&&typeof f.path==="string"&&typeof f.content==="string").slice(0,16):[];
      websiteProjectInfo=conversation.websiteProjectInfo&&typeof conversation.websiteProjectInfo==="object"?conversation.websiteProjectInfo:null;
      websiteActiveFilePath=websiteFiles.some(f=>f.path===conversation.websiteActiveFilePath)?conversation.websiteActiveFilePath:(websiteFiles[0]?.path||"");
      websitePreference=["single-html","multi-file"].includes(conversation.websitePreference)?conversation.websitePreference:"auto";
      chatMode.value=websiteSessionActive?(websitePreference==="single-html"?"website-single":websitePreference==="multi-file"?"website-fullstack":"website"):"chat";
      history=conversation.messages.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string");
      renderHistory();
      renderRecentChats();
      chatInput.focus();
    }
    function persistCurrentConversation(){
      if(!currentChatId)return;
      const conversation=conversations.find(c=>c.id===currentChatId);
      if(!conversation)return;
      conversation.messages=history.slice(-80);
      conversation.imageData=currentImageData||"";
      conversation.websiteSessionActive=websiteSessionActive;
      conversation.websiteMessages=websiteMessages.slice(-12);
      conversation.websiteSiteData=websiteSiteData;
      conversation.websiteHtml=websiteHtml;
      conversation.websiteProjectMode=websiteProjectMode;
      conversation.websiteFiles=websiteFiles;
      conversation.websiteProjectInfo=websiteProjectInfo;
      conversation.websiteActiveFilePath=websiteActiveFilePath;
      conversation.websitePreference=websitePreference;
      const firstUser=history.find(m=>m.role==="user");
      conversation.title=firstUser?firstUser.content.slice(0,55)+(firstUser.content.length>55?"…":""):"New conversation";
      conversation.updatedAt=Date.now();
      conversations.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      saveConversations();
    }
    function startNewChat(){
      currentChatId=null;
      history=[];
      latestReply="";
      currentImageData="";attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();
      websiteSessionActive=false;websiteMessages=[];websiteSiteData=null;websiteHtml="";
      websiteProjectMode="single-html";websiteFiles=[];websiteProjectInfo=null;websiteActiveFilePath="";websitePreference="auto";
      if(websitePreviewUrl){URL.revokeObjectURL(websitePreviewUrl);websitePreviewUrl="";}
      chatMode.value="chat";chatInput.placeholder="Message MIDCRUSH AI...";
      pendingEdit=null;pendingEditCard=null;pendingGeneration=null;editSession=null;
      ensureConversation();
      renderHistory();
      renderRecentChats();
      chatInput.focus();
    }
    function ensureConversation(){
      if(currentChatId)return;
      currentChatId="chat_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8);
      conversations.unshift({id:currentChatId,title:"New conversation",messages:[],updatedAt:Date.now()});
    }
    document.getElementById("newChatButton").addEventListener("click",startNewChat);
    copyReplyButton.addEventListener("click",async()=>{if(!latestReply)return;try{await navigator.clipboard.writeText(latestReply);showToast("Reply copied.");}catch{showToast("Could not copy this reply.");}});
    async function requestReply(value, continuation=false, imageData="", useWebSearch=false){
      if(!value||sendButton.disabled)return;
      ensureConversation();
      history.push({role:"user",content:value});
      persistCurrentConversation();
      const bubble=document.createElement("div");
      bubble.className="message-bubble";
      bubble.textContent=value;
      chatBox.appendChild(bubble);
      const waiting=document.createElement("div");
      waiting.className="reply-bubble";
      waiting.textContent="MIDCRUSH AI is thinking...";
      chatBox.appendChild(waiting);
      chatBox.scrollTop=chatBox.scrollHeight;
      sendButton.disabled=true;
      chatInput.disabled=true;
      try{
        let webContext="";
        let webSources=[];
        let webNotice="";
        if(useWebSearch&&!imageData){
          waiting.textContent="Searching the web…";
          try{
            const researchResponse=await fetch("/api/research",{
              method:"POST",
              headers:{"Content-Type":"application/json"},
              body:JSON.stringify({query:value,type:"web"})
            });
            const researchData=await researchResponse.json().catch(()=>({}));
            if(!researchResponse.ok)webNotice=researchData.error||"Web search is not available right now.";
            else{
              webSources=(Array.isArray(researchData.results)?researchData.results:[]).slice(0,6).map(item=>({
                title:String(item.title||"Web source").slice(0,180),
                url:String(item.url||""),
                content:String(item.content||"").slice(0,800)
              })).filter(item=>/^https?:\/\//i.test(item.url));
              webContext=[
                researchData.answer?"Search provider summary: "+String(researchData.answer).slice(0,1800):"",
                ...webSources.map((item,index)=>"Source ["+(index+1)+"]: "+item.title+"\nURL: "+item.url+"\nExtract: "+item.content)
              ].filter(Boolean).join("\n\n").slice(0,8000);
              if(!webSources.length)webNotice="The search provider did not return usable sources.";
            }
          }catch{webNotice="Could not reach the web search service.";}
        }
        waiting.textContent=useWebSearch?"Preparing an answer…":"MIDCRUSH AI is thinking…";
        const response=await fetch("/api/chat",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({messages:history.slice(-12),image:imageData||currentImageData||undefined,webContext:webContext||undefined,webSources:webSources.length?webSources:undefined})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"The AI service could not answer right now.");
        const answer=typeof data.response==="string"?data.response:"I couldn't generate a response. Please try again.";
        waiting.textContent=answer;
        if(Array.isArray(data.sources)&&data.sources.length){
          const sourceBox=document.createElement("div");sourceBox.className="chat-web-sources";
          const sourceTitle=document.createElement("strong");sourceTitle.textContent="Web sources";sourceBox.appendChild(sourceTitle);
          data.sources.slice(0,6).forEach((source,index)=>{
            try{
              const url=new URL(source.url);
              if(url.protocol!=="https:"&&url.protocol!=="http:")return;
              const link=document.createElement("a");link.href=url.toString();link.target="_blank";link.rel="noopener noreferrer";
              link.textContent="["+(index+1)+"] "+String(source.title||url.hostname).slice(0,120);sourceBox.appendChild(link);
            }catch{}
          });
          waiting.appendChild(sourceBox);
        }else if(useWebSearch){
          const note=document.createElement("small");note.className="chat-web-note";
          note.textContent=webNotice?"Web search was unavailable: "+webNotice:"No web sources were attached to this answer.";
          waiting.appendChild(note);
        }
        latestReply=continuation&&latestReply?latestReply+"\n\n"+answer:answer;
        copyReplyButton.disabled=false;
        history.push({role:"assistant",content:answer});
        persistCurrentConversation();
        if(data.truncated){
          const continueButton=document.createElement("button");
          continueButton.type="button";
          continueButton.className="chat-action chat-continue";
          continueButton.textContent="Continue answer";
          continueButton.addEventListener("click",()=>{continueButton.remove();requestReply("Continue exactly where you stopped. Do not repeat the previous text; finish the remaining answer.",true);});
          waiting.appendChild(document.createElement("br"));
          waiting.appendChild(continueButton);
        }
      }catch(error){
        waiting.textContent=error.message||"Connection error. Please try again.";
        history.pop();
        persistCurrentConversation();
      }finally{
        sendButton.disabled=false;
        chatInput.disabled=false;
        chatBox.scrollTop=chatBox.scrollHeight;
        chatInput.focus();
      }
    }
    chatImageFile.addEventListener("change",()=>{
      const file=chatImageFile.files?.[0];
      if(!file){attachedImageData="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();return;}
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)){showToast("Choose a JPG, PNG or WebP photo.");chatImageFile.value="";return;}
      if(file.size>4*1024*1024){showToast("Choose a photo smaller than 4 MB.");chatImageFile.value="";return;}
      const reader=new FileReader();
      reader.onload=()=>{const source=new Image();source.onload=()=>{const scale=Math.min(1,511/Math.max(source.width,source.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));canvas.getContext("2d").drawImage(source,0,0,canvas.width,canvas.height);attachedImageData=canvas.toDataURL("image/jpeg",0.88);currentImageData=attachedImageData;persistCurrentConversation();chatImagePreview.hidden=false;chatImagePreview.replaceChildren();const img=document.createElement("img");img.src=attachedImageData;img.alt="Photo ready to edit";const remove=document.createElement("button");remove.type="button";remove.textContent="Remove photo";remove.addEventListener("click",()=>{attachedImageData="";currentImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();persistCurrentConversation();});chatImagePreview.append(img,remove);};source.onerror=()=>showToast("Could not read that image. Try another photo.");source.src=String(reader.result||"");};
      reader.readAsDataURL(file);
    });
    chatMode.addEventListener("change",()=>{
      const websiteMode=chatMode.value.startsWith("website");
      chatInput.placeholder=websiteMode?"Describe the website or application you want to build...":chatMode.value==="generate"?"Describe the image to generate...":chatMode.value==="edit"?"Describe how to edit your photo...":chatMode.value==="chat-web"?"Ask a question and search the web...":"Message MIDCRUSH AI...";
      if(chatMode.value==="chat"||chatMode.value==="chat-web"){
        cancelPendingVisualAction();
        if(websiteSessionActive){websiteSessionActive=false;persistCurrentConversation();}
      }
    });
    function isImageRequest(value){
      return /\b(generate|create|make|draw|design|produce)\b/i.test(value) && /\b(image|picture|photo|portrait|wallpaper|poster|illustration|artwork|logo|thumbnail)\b/i.test(value);
    }
    function getRequestedAspectRatio(value,fallback){
      const match=String(value||"").match(/\b(16\s*:\s*9|9\s*:\s*16|1\s*:\s*1|4\s*:\s*3|3\s*:\s*2|2\s*:\s*3)\b/);
      return match?match[1].replace(/\s/g,""):fallback;
    }
    function isPhotoEditRequest(value){
      const text=String(value||"").toLowerCase();
      const action=/\b(edit\w*|modify|change|transform|retouch|enhance|brighten|darken|remove|replace|erase|recolor|recolour|restore|clean\s*up|convert|turn|make|add|swap)\b/i.test(text);
      const visualDirection=/\b(sunny|sunlight|daylight|daytime|nighttime|sunset|sunrise|golden hour|brighter|brightness|darker|lighting|cinematic|warm tones|cool tones|vibrant colours|vibrant colors|blurry|sharper|portrait look|landscape look|background|aspect ratio)\b/i.test(text)||/\b(16\s*:\s*9|9\s*:\s*16|1\s*:\s*1|4\s*:\s*3|3\s*:\s*2|2\s*:\s*3)\b/i.test(text);
      const imageQuestion=/^(what|who|where|when|why|how|is|are|read|describe|identify|explain|translate|solve|answer|recognize|recognise|count|compare)\b/i.test(text.trim());
      return action || (visualDirection && !imageQuestion);
    }
    function isImageQuestion(value){
      const text=String(value||"").trim();
      return /^(what|who|where|when|why|how|is|are|read|describe|identify|explain|translate|solve|answer|recognize|recognise|count|compare|summarize|summarise|transcribe|extract)\b/i.test(text)
        || /\b(read the text|what is shown|what's shown|identify this|describe this|what does .* say|translate the text)\b/i.test(text);
    }
    function shouldSearchWeb(value){
      const text=String(value||"").trim();
      return /\b(search (the )?(web|internet)|look (this|it|that) up|find online|browse (the )?web|on the internet|on the web|latest|most recent|current|today|yesterday|this week|news|price|prices|release date|new version|official documentation|source for|fact.?check)\b/i.test(text);
    }
    function isGeneralTopicMessage(value){
      const text=String(value||"").trim();
      if(!text)return false;
      const topicChange=/^(new topic|change (the )?topic|switch (the )?topic|change subject|switch subject|switch to normal chat|back to normal chat|normal chat|talk about something else|another question|a different question|forget that|never mind|nevermind|cancel that|lets talk about|lets discuss|can we talk about|can we discuss|by the way|anyway|on another note|unrelated question|random question|quick question|changing (the )?(subject|topic)|i have another question|can i ask something else|i was wondering about|i want to discuss|i want to talk about)\b/i.test(text);
      if(topicChange)return true;
      const explicitWebsiteWork=/\b(website|web site|webpage|web page|web app|web application|project|site|header|footer|navigation|navbar|section|layout|theme|button|menu)\b/i.test(text)&&/\b(add|build|create|make|design|develop|edit|change|fix|update|improve|remove|replace|include|modify)\b/i.test(text);
      if(explicitWebsiteWork)return false;
      const generalQuestion=/^(what|who|why|when|where|which|how|is|are|explain|teach|tell me|tell me about|help me with|can you explain|can you help me with|can we learn|i want to learn|i want to know|solve|calculate|write|draft|compose|summarize|summarise|translate|compare|define|describe|give me|tell a joke|tell me a joke|do you know|have you heard|what happened|who won|what about|how about)\b/i.test(text);
      const explicitImageCreation=isImageRequest(text)&&!generalQuestion;
      const explicitPhotoEdit=isPhotoEditRequest(text)&&!generalQuestion;
      if(explicitImageCreation||explicitPhotoEdit)return false;
      const arithmetic=/^\s*[-+]?\d+(?:\.\d+)?\s*[+*/×÷=-]\s*[-+]?\d+(?:\.\d+)?\s*(?:[=?])?\s*$/i.test(text);
      const conversational=/\?\s*$/.test(text)||/^(hello|hi|hey|good morning|good afternoon|good evening|i think|i feel|i am bored|im bored|what do you think|any thoughts on|tell me something about|talk to me about|discuss)\b/i.test(text);
      const unrelatedSubjects=/\b(algebra|mathematics|maths?|stoichiometry|chemistry|physics|biology|photosynthesis|geography|history|literature|grammar|english homework|homework|schoolwork|programming|javascript|python|database|computer science|essay|poem|letter|email|recipe|weather|football|soccer|arsenal|sports?|gaming|video games?|free fire|music|movies?|cartoons?|anime|entertainment|economics|imports|exports|business studies|accounting|civics|politics|religion|science|technology|uganda|world news|travel|cooking|food|animals?|space|astronomy)\b/i.test(text);
      return generalQuestion||arithmetic||conversational||unrelatedSubjects;
    }
    function cancelPendingVisualAction(){
      if(pendingGeneration){pendingGeneration.waiting?.remove();pendingGeneration=null;}
      if(pendingEditCard){pendingEditCard.remove();pendingEditCard=null;}
      pendingEdit=null;
    }
    function isAffirmative(value){
      const text=String(value||"").toLowerCase().replace(/[’']/g,"").replace(/[.,!?]/g," ").replace(/\s+/g," ").trim();
      if(/^(ok|okay|yes|y|yeah|yep|sure|alright|all right|go ahead|do it|do that|proceed|continue|confirm|confirmed|yes please|okay please|sounds good|looks good|that works|thats fine|thats right|that is right|correct|start|start editing|edit it|create it|generate it|make it|apply it|go for it)$/.test(text))return true;
      return /^(ok|okay|yes|yeah|yep|sure|alright|all right) (please )?(go ahead|do it|do that|proceed|continue|create it|generate it|make it|apply it|start|start editing|edit it|go for it)$/.test(text);
    }
    function confirmPhotoEdit(){
      if(!editSession||!pendingEditCard)return;
      const card=pendingEditCard;
      const confirm=card.querySelector(".chat-image-create");
      const change=card.querySelector(".chat-actions .chat-action:not(.chat-image-create)");
      pendingEdit=null;
      pendingEditCard=null;
      if(confirm){confirm.disabled=true;confirm.textContent="Editing...";}
      if(change)change.disabled=true;
      generateFromChat(editSession.prompt,"You decide",editSession.ratio,editSession.currentImage,card,"edit");
    }
    async function runPendingGeneration(){
      if(!pendingGeneration)return;
      const job=pendingGeneration;
      pendingGeneration=null;
      const style=job.styleControl?.value||"You decide";
      const ratio=job.ratioControl?.value||"1:1";
      await generateFromChat(job.prompt,style,ratio,job.imageData,job.waiting,job.mode);
    }
    function hasSpecificPhotoEditDetails(value){
      const text=String(value||"").toLowerCase();
      const action=/\b(transform|change|replace|remove|erase|recolor|recolour|brighten|darken|enhance|restore|convert|turn|make|add|swap|edit\w*)\b/i.test(text);
      const target=/\b(background|sky|lighting|light|weather|rain|daytime|daylight|nighttime|sunny|sunlight|cloudy|road|clothes|shirt|hair|person|people|object|building|car|colour|color|brightness|contrast|blur|sharpness|style|cartoon|anime|3d|cinematic|sunset|sunrise)\b/i.test(text);
      const transformation=/\b(into|to|with|without|instead of|look like|more|less|look|effect)\b/i.test(text);
      const hasRatio=/\b(16\s*:\s*9|9\s*:\s*16|1\s*:\s*1|4\s*:\s*3|3\s*:\s*2|2\s*:\s*3)\b|\baspect ratio\b/i.test(text);
      const hasVisualDirection=/\b(sunny|sunlight|daylight|daytime|nighttime|sunset|sunrise|golden hour|cinematic|warm tones|cool tones|vibrant colours|vibrant colors)\b/i.test(text);
      return (action && target && transformation) || (hasVisualDirection && (target||hasRatio)) || hasRatio || /\b(remove|erase|replace)\s+(the|a|an|this|that|my)\s+\w+/i.test(text) || /\b(make|turn)\s+(this|that|it|the photo|the picture|the image)\s+(look|appear|into|more|less)\b/i.test(text);
    }
    function showEditQuestion(imageData,initialPrompt=""){
      const image=new Image();
      image.onload=()=>{
        const ratio=image.naturalWidth/image.naturalHeight;
        const choices=[["1:1",1],["16:9",16/9],["9:16",9/16],["4:3",4/3],["3:2",3/2],["2:3",2/3]];
        const best=choices.sort((a,b)=>Math.abs(a[1]-ratio)-Math.abs(b[1]-ratio))[0][0];
        editSession={originalImage:imageData,currentImage:imageData,prompt:initialPrompt,ratio:getRequestedAspectRatio(initialPrompt,best)};
        if(initialPrompt.trim()){
          showEditConfirmation();
          return;
        }
        pendingEdit="details";
        const question=document.createElement("div");question.className="reply-bubble";
        question.textContent="What would you like me to change in this photo? For example, the background, lighting, colours, or an object.";
        chatBox.appendChild(question);chatBox.scrollTop=chatBox.scrollHeight;
        chatInput.placeholder="Describe the changes you want...";
        chatInput.focus();
      };
      image.onerror=()=>showToast("Could not read the uploaded photo.");
      image.src=imageData;
    }
    function showGenerationProgress(container,mode){
      container.querySelector(".generation-progress")?.remove();
      const panel=document.createElement("div");
      panel.className="generation-progress";
      panel.setAttribute("role","status");
      panel.setAttribute("aria-live","polite");
      const heading=document.createElement("strong");
      heading.textContent=mode==="edit"?"Editing your photo":"Creating your image";
      const detail=document.createElement("span");
      detail.className="generation-progress-detail";
      detail.textContent="Your request has been sent to the AI model. The result will appear here when it is ready.";
      const track=document.createElement("div");
      track.className="generation-progress-track";
      track.setAttribute("role","progressbar");
      track.setAttribute("aria-label","Image generation in progress");
      track.setAttribute("aria-valuemin","0");
      track.setAttribute("aria-valuemax","100");
      track.setAttribute("aria-valuetext","In progress; live percentage is not available");
      const bar=document.createElement("span");
      track.appendChild(bar);
      const note=document.createElement("small");
      note.textContent="Generating… Please keep this page open.";
      panel.append(heading,detail,track,note);
      container.appendChild(panel);
      chatBox.scrollTop=chatBox.scrollHeight;
      return {panel,detail,note};
    }
    async function generateFromChat(prompt,style,ratio,imageData,waiting,mode){
      const button=waiting.querySelector(".chat-image-create");
      if(button){button.disabled=true;button.textContent="Creating...";}
      const progress=showGenerationProgress(waiting,mode);
      const hasOriginalReference=mode==="edit"&&editSession?.originalImage&&editSession.originalImage!==imageData;
      const fullPrompt=mode==="edit"
        ? "PRIORITY: Make the exact requested change clearly and visibly: "+prompt+". Interpret named clothing items as complete, recognizable garments, not merely a colour change or a logo pasted onto the existing clothing. For a request to wear an Arsenal football jersey, replace the existing shirt with a realistic, recognizable Arsenal FC home football kit top: proper football-shirt cut and fabric, Arsenal's traditional red body, contrasting white sleeves, authentic-looking collar and sleeve trim, Adidas-style shoulder stripes, and a correctly placed Arsenal club crest. It must look like a real Arsenal team jersey, not a plain red shirt with an Arsenal badge. Do not invent extra sponsor text or random badges; keep kit details coherent and legible. Use the supplied photo as the source and edit it, rather than returning an unchanged copy or creating an unrelated new image. IDENTITY PRESERVATION: Preserve the person's original identity and face as closely as the model allows, including face shape, eyes, nose, lips, ears, jawline, facial proportions, skin tone, natural skin texture, hairstyle, hairline, facial hair, expression and apparent age. Do not add eyewear or invent, remove, beautify, reconstruct or reinterpret facial features. Make the requested clothing change; keep the face and other unrequested details intact. Blend the new garment naturally with the person's pose, body shape, lighting and shadows. "+(hasOriginalReference?"Use reference image 0 as the current photo to edit and reference image 1 as the original identity reference. Match the person's face and identity to reference image 1 while completing the requested clothing change.":"Use reference image 0 as the source photo. Preserve the person's identity while completing the requested clothing change.")
        : (style==="You decide"?prompt:prompt+", "+style);
      try{
        const response=await fetch("/api/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:fullPrompt,aspectRatio:ratio,image:imageData||undefined,originalImage:mode==="edit"&&editSession?.originalImage!==imageData?editSession.originalImage:undefined,isEdit:mode==="edit"})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"Image request failed.");
        if(typeof data.image!=="string"||!data.image.startsWith("data:image/"))throw new Error("The image service returned an invalid image.");
        waiting.replaceChildren();
        if(mode==="edit"){
          editSession.currentImage=data.image;
          currentImageData=data.image;
          const title=document.createElement("strong");title.textContent="Your edited photo";
          const comparison=document.createElement("div");comparison.className="chat-edit-comparison";
          const left=document.createElement("div");const ll=document.createElement("small");ll.textContent="Original";
          const oi=document.createElement("img");oi.src=editSession.originalImage;oi.alt="Original uploaded photo";oi.className="chat-generated-image";left.append(ll,oi);
          const right=document.createElement("div");const rl=document.createElement("small");rl.textContent="Edited";
          const ei=document.createElement("img");ei.src=data.image;ei.alt="Edited photo";ei.className="chat-generated-image";right.append(rl,ei);
          comparison.append(left,right);waiting.append(title,comparison);
          const actions=document.createElement("div");actions.className="chat-actions";
          const revise=document.createElement("button");revise.type="button";revise.className="chat-action";revise.textContent="Make another change";
          const save=document.createElement("a");save.href=data.image;save.download="midcrush-ai-edited.jpg";save.textContent="Save edited photo";save.className="chat-image-download";
          revise.addEventListener("click",()=>{pendingEdit="revise";chatInput.placeholder="Describe the next change...";chatInput.focus();});
          actions.append(revise,save);waiting.appendChild(actions);
          history.push({role:"assistant",content:"Suggested photo edit: "+prompt});
        }else{
          currentImageData=data.image;
          waiting.append(document.createTextNode("Your image is ready."));
          const img=document.createElement("img");img.src=data.image;img.alt="AI generated image";img.className="chat-generated-image";waiting.appendChild(img);
          const download=document.createElement("a");download.href=data.image;download.download="midcrush-ai-image.jpg";download.textContent="Save image";download.className="chat-image-download";waiting.appendChild(download);
          history.push({role:"assistant",content:"Generated an image for: "+prompt+" ("+ratio+")"});
        }
        persistCurrentConversation();latestReply=history[history.length-1].content;copyReplyButton.disabled=false;
      }catch(error){
        progress.detail.textContent="The image could not be completed.";
        progress.note.textContent=error.message||"Please try again.";
        progress.panel.classList.add("generation-progress-error");
        if(button){
          button.disabled=false;
          button.textContent="Try again";
          button.addEventListener("click",()=>generateFromChat(prompt,style,ratio,imageData,waiting,mode),{once:true});
        }
      }
      chatBox.scrollTop=chatBox.scrollHeight;
    }
    function showImageChoices(prompt,mode,imageData){
      if(mode==="edit"){
        const image=new Image();
        image.onload=()=>{
          const ratio=image.naturalWidth/image.naturalHeight;
          const choices=[["1:1",1],["16:9",16/9],["9:16",9/16],["4:3",4/3],["3:2",3/2],["2:3",2/3]];
          const best=choices.sort((a,b)=>Math.abs(a[1]-ratio)-Math.abs(b[1]-ratio))[0][0];
          editSession={originalImage:imageData,currentImage:imageData,prompt,ratio:getRequestedAspectRatio(prompt,best)};
          showEditConfirmation();
        };
        image.onerror=()=>showToast("Could not read the uploaded photo.");
        image.src=imageData;
        return;
      }
      const waiting=document.createElement("div");waiting.className="reply-bubble chat-image-choices";
      const heading=document.createElement("strong");heading.textContent="Before I create it, what style would you like?";
      const styleLabel=document.createElement("label");styleLabel.textContent="Image style";
      const style=document.createElement("select");style.className="chat-image-choice";
      [["You decide","You decide"],["Photorealistic","Photorealistic"],["3D animation","high-quality 3D animated render"],["Anime","anime illustration"],["Digital art","detailed digital artwork"],["Cinematic","cinematic concept art"],["Watercolor","soft watercolor painting"]].forEach(([label,value])=>{const option=document.createElement("option");option.textContent=label;option.value=value;style.appendChild(option);});
      const ratioLabel=document.createElement("label");ratioLabel.textContent="Aspect ratio";
      const ratio=document.createElement("select");ratio.className="chat-image-choice";
      [["Phone / TikTok / Status — 9:16","9:16"],["YouTube / Landscape — 16:9","16:9"],["Square post — 1:1","1:1"],["Classic photo — 4:3","4:3"],["Photo landscape — 3:2","3:2"],["Photo portrait — 2:3","2:3"]].forEach(([label,value])=>{const option=document.createElement("option");option.textContent=label;option.value=value;ratio.appendChild(option);});
      ratio.value=getRequestedAspectRatio(prompt,"1:1");
      const create=document.createElement("button");create.type="button";create.className="chat-action chat-image-create";create.textContent="Create image";
      const approve=document.createElement("button");approve.type="button";approve.className="chat-action chat-image-approve";approve.textContent="Okay, generate";
      pendingGeneration={prompt,styleControl:style,ratioControl:ratio,imageData,waiting,mode};
      create.addEventListener("click",()=>runPendingGeneration());
      approve.addEventListener("click",()=>runPendingGeneration());
      const hint=document.createElement("small");hint.className="generation-approval-hint";hint.textContent="You can also type “Okay”, “Yes” or “Go ahead” to start with these settings.";
      const actions=document.createElement("div");actions.className="chat-actions";actions.append(create,approve);
      waiting.append(heading,styleLabel,style,ratioLabel,ratio,actions,hint);chatBox.appendChild(waiting);chatBox.scrollTop=chatBox.scrollHeight;
    }
    function showEditConfirmation(){
      pendingEditCard?.remove();
      pendingEdit="confirm";
      const card=document.createElement("div");card.className="reply-bubble chat-edit-confirmation";
      pendingEditCard=card;
      const heading=document.createElement("strong");heading.textContent="Confirm your photo edit";
      const preview=document.createElement("img");preview.src=editSession.currentImage;preview.alt="Photo to edit";preview.className="chat-generated-image";
      const summary=document.createElement("p");summary.textContent="I haven’t changed the photo yet. I’m planning to: "+editSession.prompt+". I’ll choose the visual style automatically and preserve the main subject and important details. The result will use "+editSession.ratio+" proportions. Is this what you’d like me to do?";
      const actions=document.createElement("div");actions.className="chat-actions";
      const confirm=document.createElement("button");confirm.type="button";confirm.className="chat-action chat-image-create";confirm.textContent="Yes, edit my photo";
      const change=document.createElement("button");change.type="button";change.className="chat-action";change.textContent="No, change details";
      confirm.addEventListener("click",confirmPhotoEdit);
      change.addEventListener("click",()=>{pendingEdit="details";pendingEditCard=null;chatInput.placeholder="Describe what you want changed...";chatInput.focus();});
      const hint=document.createElement("small");hint.className="generation-approval-hint";hint.textContent="You can also type “Okay”, “Yes” or “Go ahead” to begin editing.";
      actions.append(confirm,change);card.append(heading,preview,summary,actions,hint);chatBox.appendChild(card);chatBox.scrollTop=chatBox.scrollHeight;
    }
    function isWebsiteRequest(value){
      const text=String(value||"").trim();
      if(/^(how|what|why|when|where|which)\b/i.test(text)||/^(can you explain|tell me how)\b/i.test(text))return false;
      const action=/\b(build|create|make|design|generate|develop|code|i need|i want|help me|add|update|improve|edit|change|fix|remove|replace|include)\b/i.test(text);
      const target=/\b(website|web site|webpage|web page|web app|web application|application|landing page|online store|e-?commerce site|header|footer|navigation|navbar|section|layout|theme|button|menu|movie card|project file)\b/i.test(text);
      return action&&target;
    }
    async function handOffToNormalChat(waiting){
      websiteMessages.pop();
      websiteSessionActive=false;
      chatMode.value="chat";
      chatInput.placeholder="Message MIDCRUSH AI...";
      waiting.textContent="Switching to normal chat…";
      const response=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:history.slice(-12)})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Normal Chat could not answer right now.");
      const answer=typeof data.response==="string"&&data.response.trim()?data.response:"I could not generate a response. Please try again.";
      waiting.textContent=answer;
      return answer;
    }
    async function requestWebsiteChat(value,requestedPreference){
      if(sendButton.disabled)return;
      if(requestedPreference)websitePreference=requestedPreference;
      if(!websitePreference)websitePreference="auto";
      ensureConversation();
      if(!websiteSessionActive){
        const hasSavedProject=!!(websiteSiteData||websiteHtml||websiteFiles.length);
        websiteSessionActive=true;
        if(!hasSavedProject){websiteMessages=[];websiteSiteData=null;websiteHtml="";websiteProjectMode="single-html";websiteFiles=[];websiteProjectInfo=null;websiteActiveFilePath="";}
      }
      websiteMessages.push({role:"user",content:value});history.push({role:"user",content:value});persistCurrentConversation();
      const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
      const waiting=document.createElement("div");waiting.className="reply-bubble";waiting.textContent=websiteSiteData?"Reviewing your requested website change…":"Let's plan your website…";chatBox.appendChild(waiting);chatBox.scrollTop=chatBox.scrollHeight;
      sendButton.disabled=true;chatInput.disabled=true;chatMode.disabled=true;
      try{
        const response=await fetch("/api/website",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"chat",messages:websiteMessages.slice(-12),projectPreference:websitePreference,currentSiteData:websiteSiteData||undefined,currentProject:websiteProjectMode==="multi-file"?{...websiteProjectInfo,files:websiteFiles}:undefined})});
        const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"The website builder could not respond. Please try again.");
        let answer="";
        if(data.status==="chat"){
          answer=await handOffToNormalChat(waiting);
        }else if(data.status==="clarify"&&typeof data.question==="string"&&data.question.trim()){
          answer=[data.message,data.question].filter(Boolean).join("\n\n");
          waiting.textContent=answer;
          renderWebsiteChatOptions(waiting,data.choices,"choices");
        }else if(data.status==="guide"&&typeof data.message==="string"&&data.message.trim()){
          answer=data.message.trim();
          waiting.textContent=answer;
        }else if(data.status==="ready"&&data.projectMode==="multi-file"&&Array.isArray(data.files)&&data.files.length){
          websiteProjectMode="multi-file";
          websiteFiles=data.files.filter(file=>file&&typeof file.path==="string"&&typeof file.content==="string").slice(0,16);
          if(!websiteFiles.length)throw new Error("The AI returned a project without readable source files.");
          websiteProjectInfo=data.project&&typeof data.project==="object"?data.project:{};
          websiteSiteData=null;websiteHtml="";
          websiteActiveFilePath=websiteFiles[0].path;
          answer=typeof data.assistantMessage==="string"&&data.assistantMessage.trim()?data.assistantMessage.trim():"Your multi-file project is ready. Review the files and setup instructions below.";
          waiting.textContent=answer;
          if(Array.isArray(data.recommendations)&&data.recommendations.length){
            const summary="Suggested improvements: "+data.recommendations.map(item=>item.title).join("; ");
            answer+="\n\n"+summary;waiting.textContent=answer;
            renderWebsiteChatOptions(waiting,data.recommendations,"recommendations");
          }
          renderWebsiteArtifact();
        }else if(data.status==="ready"&&typeof data.html==="string"&&data.html.includes("</html>")&&data.siteData){
          websiteProjectMode="single-html";websiteFiles=[];websiteProjectInfo=null;websiteActiveFilePath="";
          websiteSiteData=data.siteData;websiteHtml=data.html;
          answer=typeof data.assistantMessage==="string"&&data.assistantMessage.trim()?data.assistantMessage.trim():"The website is ready. You can ask for changes or choose an improvement below.";
          waiting.textContent=answer;
          if(Array.isArray(data.recommendations)&&data.recommendations.length){
            const summary="Suggested improvements: "+data.recommendations.map(item=>item.title).join("; ");
            answer+="\n\n"+summary;waiting.textContent=answer;
            renderWebsiteChatOptions(waiting,data.recommendations,"recommendations");
          }
          renderWebsiteArtifact();
        }else throw new Error("The AI returned an incomplete website response. Please try again.");
        history.push({role:"assistant",content:answer});
        if(data.status!=="chat")websiteMessages.push({role:"assistant",content:answer});
        latestReply=answer;copyReplyButton.disabled=false;persistCurrentConversation();
      }catch(error){waiting.textContent=error.message||"The website could not be created. Please try again.";chatBox.scrollTop=chatBox.scrollHeight;}
      finally{sendButton.disabled=false;chatInput.disabled=false;chatMode.disabled=false;chatBox.scrollTop=chatBox.scrollHeight;chatInput.focus();}
    }
    chatForm.addEventListener("submit",async e=>{
      e.preventDefault();
      const value=chatInput.value.trim();
      if(!value||sendButton.disabled)return;
      let mode=chatMode.value;
      if(isGeneralTopicMessage(value)){
        cancelPendingVisualAction();
        const keepWebMode=mode==="chat-web";
        if(mode!=="chat"&&!keepWebMode){
          chatMode.value="chat";
          mode="chat";
          chatInput.placeholder="Message MIDCRUSH AI...";
        }
        const imageToAsk=attachedImageData||(currentImageData&&isImageQuestion(value)?currentImageData:"");
        if(attachedImageData){attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();}
        chatInput.value="";
        requestReply(value,false,imageToAsk,keepWebMode||shouldSearchWeb(value));
        return;
      }
      if(pendingEdit==="confirm"){
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        chatInput.value="";
        if(isAffirmative(value)){confirmPhotoEdit();return;}
        if(/^(no|nope|not quite|change|change it|edit details|different)[.! ]*$/i.test(value)){
          pendingEdit="details";
          pendingEditCard=null;
          const question=document.createElement("div");question.className="reply-bubble";question.textContent="What would you like me to change in the plan?";
          chatBox.appendChild(question);chatBox.scrollTop=chatBox.scrollHeight;chatInput.placeholder="Describe the change...";chatInput.focus();return;
        }
        if(editSession){
          editSession.prompt=[editSession.prompt,value].filter(Boolean).join(". ");
          editSession.ratio=getRequestedAspectRatio(value,editSession.ratio);
          showEditConfirmation();return;
        }
      }
      if(pendingGeneration&&isAffirmative(value)){
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        chatInput.value="";
        await runPendingGeneration();return;
      }
      if(pendingEdit){
        const action=pendingEdit;pendingEdit=null;
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        chatInput.value="";
        if(action==="details"){
          if(isAffirmative(value)&&editSession?.prompt){
            const waiting=document.createElement("div");
            waiting.className="reply-bubble";
            waiting.textContent="Starting your photo edit...";
            chatBox.appendChild(waiting);
            chatBox.scrollTop=chatBox.scrollHeight;
            chatInput.placeholder="Describe another change if needed...";
            generateFromChat(editSession.prompt,"You decide",editSession.ratio,editSession.currentImage,waiting,"edit");
          }else if(isAffirmative(value)){
            const question=document.createElement("div");
            question.className="reply-bubble";
            question.textContent="Tell me the change you want, and I’ll apply it to the uploaded photo.";
            chatBox.appendChild(question);
            chatBox.scrollTop=chatBox.scrollHeight;
            chatInput.placeholder="Describe the change...";
            chatInput.focus();
          }else{
            editSession.prompt=[editSession.prompt,value].filter(Boolean).join(". ");
            editSession.ratio=getRequestedAspectRatio(value,editSession.ratio);
            showEditConfirmation();
          }
        }
        else if(action==="revise"){
          editSession.prompt=value;
          const waiting=document.createElement("div");waiting.className="reply-bubble";waiting.textContent="Applying your next change...";
          chatBox.appendChild(waiting);
          generateFromChat(value,"You decide",editSession.ratio,editSession.currentImage,waiting,"edit");
        }
        return;
      }
      if(mode==="website"||mode==="website-single"||mode==="website-fullstack"||(mode==="chat"&&isWebsiteRequest(value))){const preference=mode==="website-single"?"single-html":mode==="website-fullstack"?"multi-file":"auto";if(mode==="chat")chatMode.value="website";await requestWebsiteChat(value,preference);return;}
      if(mode==="edit"&&!attachedImageData&&!currentImageData){showToast("Add a photo first.");return;}
      if(mode==="generate"||(mode==="chat"&&!attachedImageData&&isImageRequest(value))){
        ensureConversation();
        history.push({role:"user",content:"[Image request] "+value});persistCurrentConversation();
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        chatInput.value="";showImageChoices(value,"generate","");return;
      }
      if(mode==="edit"||(mode==="chat"&&(attachedImageData||currentImageData&&isPhotoEditRequest(value))&&!isImageQuestion(value))){
        ensureConversation();history.push({role:"user",content:"[Photo edit] "+value});persistCurrentConversation();
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        const imageToEdit=attachedImageData||currentImageData;
        chatInput.value="";
        if(imageToEdit){attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();}
        if(!hasSpecificPhotoEditDetails(value)){
          if(editSession&&editSession.currentImage&&pendingEdit==="revise"){
            editSession.prompt=value;showEditConfirmation();
          }else{
            showEditQuestion(imageToEdit||editSession?.currentImage||"",value);
          }
          return;
        }
        showImageChoices(value,"edit",imageToEdit||editSession?.currentImage||"");return;
      }
      const imageToAsk=attachedImageData||(currentImageData&&isImageQuestion(value)?currentImageData:"");
      chatInput.value="";
      if(imageToAsk){attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();}
      requestReply(value,false,imageToAsk,mode==="chat-web"||shouldSearchWeb(value));
    });
    conversations=readConversations();
    conversations.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    startNewChat();
  }else if(info.kind==="learn"){
    target.innerHTML = `
      <div class="workspace-card learn-workspace">
        <div class="learn-intro">
          <div><span class="learn-kicker">YOUR PERSONAL PROGRAMMING TUTOR</span><h2>Learn to code, one step at a time.</h2><p>Choose a language and level. Your tutor will teach concepts, show examples, give exercises, review your code and help you build projects.</p></div>
          <div class="learn-hero-icon"><i data-lucide="graduation-cap"></i></div>
        </div>
        <div class="learn-course-settings">
          <label>Programming language
            <select id="learnLanguage">
              <option>Python</option><option>JavaScript</option><option>HTML & CSS</option><option>Java</option><option>C</option><option>C++</option><option>C#</option><option>PHP</option><option>TypeScript</option><option>Go</option><option>Ruby</option><option>SQL</option><option>Dart</option><option>Kotlin</option><option>Swift</option><option>Rust</option>
            </select>
          </label>
          <label>Your level
            <select id="learnLevel"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
          </label>
        </div>
        <label class="learn-goal-label" for="learnGoal">What would you like to make or learn? <span>Optional</span></label>
        <input id="learnGoal" class="learn-goal-input" maxlength="240" placeholder="Example: I want to build websites or create Android apps">
        <div class="learn-progress-card">
          <div class="learn-progress-top"><div><strong>Your learning progress</strong><span id="learnProgressText">0 lessons completed</span></div><button type="button" id="learnMarkComplete" disabled>Mark lesson complete</button></div>
          <div class="learn-progress-track"><span id="learnProgressBar"></span></div>
        </div>
        <div class="learn-actions">
          <button type="button" class="learn-primary-action" id="learnStart"><i data-lucide="play"></i> Start learning</button>
          <button type="button" data-learn-action="practice"><i data-lucide="pencil-ruler"></i> Practice</button>
          <button type="button" data-learn-action="next"><i data-lucide="arrow-right"></i> Next lesson</button>
          <button type="button" data-learn-action="project"><i data-lucide="blocks"></i> Build a project</button>
        </div>
        <div class="learn-chat-box" id="learnChatBox" aria-live="polite"></div>
        <form class="learn-compose" id="learnForm">
          <select id="learnInputAction" aria-label="How should the tutor help?"><option value="chat">Ask the tutor</option><option value="check">Check my code or answer</option><option value="explain">Explain a concept</option></select>
          <textarea id="learnInput" rows="3" maxlength="2600" placeholder="Ask a question, paste your code, or describe what you find difficult..." required></textarea>
          <button type="submit" id="learnSend">Send</button>
        </form>
        <div class="learn-footnote">Lessons and progress are saved in this browser on this device. Code is reviewed by AI and is not executed here.</div>
      </div>`;
    const learnLanguage=document.getElementById("learnLanguage");
    const learnLevel=document.getElementById("learnLevel");
    const learnGoal=document.getElementById("learnGoal");
    const learnChatBox=document.getElementById("learnChatBox");
    const learnForm=document.getElementById("learnForm");
    const learnInput=document.getElementById("learnInput");
    const learnInputAction=document.getElementById("learnInputAction");
    const learnSend=document.getElementById("learnSend");
    const learnProgressText=document.getElementById("learnProgressText");
    const learnProgressBar=document.getElementById("learnProgressBar");
    const learnMarkComplete=document.getElementById("learnMarkComplete");
    const learnSessionKey="midcrush_programming_sessions_v1";
    const learnProgressKey="midcrush_programming_progress_v1";
    let learnSessions={};
    let learnProgress={};
    let learnMessages=[];
    let currentLessonTitle="";
    let currentNextTopic="";
    try{learnSessions=JSON.parse(localStorage.getItem(learnSessionKey)||"{}")||{};}catch{learnSessions={};}
    try{learnProgress=JSON.parse(localStorage.getItem(learnProgressKey)||"{}")||{};}catch{learnProgress={};}
    function learnKey(){return learnLanguage.value+"::"+learnLevel.value;}
    function saveLearnState(){
      try{
        learnSessions[learnKey()]={messages:learnMessages.slice(-40),goal:learnGoal.value.trim(),lessonTitle:currentLessonTitle,nextTopic:currentNextTopic};
        const keys=Object.keys(learnSessions);
        if(keys.length>24)delete learnSessions[keys[0]];
        localStorage.setItem(learnSessionKey,JSON.stringify(learnSessions));
        localStorage.setItem(learnProgressKey,JSON.stringify(learnProgress));
      }catch{showToast("Could not save learning progress. Browser storage may be full.");}
      updateLearnProgress();
    }
    function updateLearnProgress(){
      const key=learnKey();
      const completed=Array.isArray(learnProgress[key])?learnProgress[key]:[];
      learnProgressText.textContent=completed.length+" lessons completed";
      learnProgressBar.style.width=Math.min(100,completed.length/12*100)+"%";
      learnMarkComplete.disabled=!currentLessonTitle||completed.includes(currentLessonTitle);
      learnMarkComplete.textContent=completed.includes(currentLessonTitle)?"Lesson completed":"Mark lesson complete";
    }
    function renderLearnHistory(){
      learnChatBox.replaceChildren();
      if(!learnMessages.length){
        const welcome=document.createElement("div");welcome.className="learn-welcome";
        welcome.innerHTML="<strong>Welcome to Learn Programming.</strong><p>Start with a guided lesson, ask a question, paste code for feedback, or choose a small project. You do not need previous programming experience.</p>";
        learnChatBox.appendChild(welcome);
      }else{
        learnMessages.forEach(message=>{
          const bubble=document.createElement("div");
          bubble.className=message.role==="user"?"learn-user-message":"learn-tutor-message";
          bubble.textContent=message.content;
          learnChatBox.appendChild(bubble);
        });
      }
      learnChatBox.scrollTop=learnChatBox.scrollHeight;
    }
    function loadLearnSession(){
      const session=learnSessions[learnKey()]||{};
      learnMessages=Array.isArray(session.messages)?session.messages.slice(-40):[];
      learnGoal.value=typeof session.goal==="string"?session.goal:"";
      currentLessonTitle=typeof session.lessonTitle==="string"?session.lessonTitle:"";
      currentNextTopic=typeof session.nextTopic==="string"?session.nextTopic:"";
      renderLearnHistory();updateLearnProgress();
    }
    function addTutorContent(container,data){
      const reply=document.createElement("div");reply.className="learn-tutor-reply";reply.textContent=data.reply||"Let's work through that together.";
      container.appendChild(reply);
      if(data.codeExample&&data.codeExample.code){
        const card=document.createElement("div");card.className="learn-code-card";
        const top=document.createElement("div");top.className="learn-code-heading";
        const lang=document.createElement("strong");lang.textContent=data.codeExample.language||learnLanguage.value;
        const copy=document.createElement("button");copy.type="button";copy.textContent="Copy code";
        copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(data.codeExample.code);showToast("Code copied.");}catch{showToast("Could not copy code.");}});
        top.append(lang,copy);
        const pre=document.createElement("pre");const code=document.createElement("code");code.textContent=data.codeExample.code;pre.appendChild(code);
        card.append(top,pre);
        if(data.codeExample.explanation){const explanation=document.createElement("p");explanation.textContent=data.codeExample.explanation;card.appendChild(explanation);}
        container.appendChild(card);
      }
      if(data.exercise&&data.exercise.prompt){
        const exercise=document.createElement("div");exercise.className="learn-exercise-card";
        const title=document.createElement("strong");title.textContent="Your practice exercise";
        const prompt=document.createElement("p");prompt.textContent=data.exercise.prompt;exercise.append(title,prompt);
        if(data.exercise.starterCode){
          const pre=document.createElement("pre");const code=document.createElement("code");code.textContent=data.exercise.starterCode;pre.appendChild(code);exercise.appendChild(pre);
        }
        const hint=document.createElement("button");hint.type="button";hint.textContent="Get a hint";hint.addEventListener("click",()=>sendLearnAction("hint","Give me a hint for the current exercise without revealing the full answer."));
        exercise.appendChild(hint);container.appendChild(exercise);
      }
      if(data.feedback){
        const feedback=document.createElement("div");feedback.className="learn-feedback";feedback.textContent=data.feedback;container.appendChild(feedback);
      }
      const suggested=document.createElement("div");suggested.className="learn-suggested-actions";
      [["practice","Try another exercise"],["check","Check my code"],["project","Build a small project"]].forEach(([action,label])=>{
        const button=document.createElement("button");button.type="button";button.textContent=label;
        button.addEventListener("click",()=>{
          if(action==="check"){learnInputAction.value="check";learnInput.focus();}
          else sendLearnAction(action,action==="practice"?"Give me another exercise for this topic.":"Give me a small project using what I have learned.");
        });
        suggested.appendChild(button);
      });
      container.appendChild(suggested);
    }
    async function sendLearnAction(action,message){
      if(learnSend.disabled)return;
      const value=String(message||"").trim();
      if(!value){learnInput.focus();return;}
      const userBubble=document.createElement("div");userBubble.className="learn-user-message";userBubble.textContent=value;learnChatBox.appendChild(userBubble);
      learnMessages.push({role:"user",content:value});
      const waiting=document.createElement("div");waiting.className="learn-tutor-message learn-thinking";waiting.textContent="Preparing your lesson…";learnChatBox.appendChild(waiting);
      learnSend.disabled=true;learnSend.textContent="Thinking…";
      learnChatBox.scrollTop=learnChatBox.scrollHeight;saveLearnState();
      try{
        const response=await fetch("/api/learn",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          language:learnLanguage.value,level:learnLevel.value,goal:learnGoal.value.trim(),action,
          currentLesson:currentLessonTitle,
          completedLessons:learnProgress[learnKey()]||[],
          messages:learnMessages.slice(-12)
        })});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"The programming tutor could not respond.");
        waiting.classList.remove("learn-thinking");waiting.replaceChildren();addTutorContent(waiting,data);
        if(data.lessonTitle)currentLessonTitle=data.lessonTitle;
        if(data.nextTopic)currentNextTopic=data.nextTopic;
        const assistantContext=[data.reply,data.codeExample?.code?"Code example:\n"+data.codeExample.code:"",data.exercise?.prompt?"Exercise: "+data.exercise.prompt:"",data.exercise?.starterCode?"Starter code:\n"+data.exercise.starterCode:"",data.feedback?"Feedback: "+data.feedback:""].filter(Boolean).join("\n\n").slice(0,2500);
        learnMessages.push({role:"assistant",content:assistantContext});
        saveLearnState();
      }catch(error){
        waiting.classList.remove("learn-thinking");waiting.textContent=error.message||"The programming tutor is temporarily unavailable.";
        learnMessages.pop();saveLearnState();
      }finally{
        learnSend.disabled=false;learnSend.textContent="Send";learnChatBox.scrollTop=learnChatBox.scrollHeight;learnInput.focus();
      }
    }
    learnForm.addEventListener("submit",event=>{
      event.preventDefault();
      const message=learnInput.value.trim();if(!message)return;
      const action=learnInputAction.value;
      learnInput.value="";
      sendLearnAction(action,message);
    });
    document.getElementById("learnStart").addEventListener("click",()=>sendLearnAction("start","Start my learning path. Teach me the first lesson for my selected language and level."));
    document.querySelectorAll("[data-learn-action]").forEach(button=>button.addEventListener("click",()=>{
      const action=button.dataset.learnAction;
      const prompts={practice:"Give me a practice exercise based on my current learning level and lesson.",next:"Teach me the next lesson in the learning path. Avoid repeating completed lessons.",project:"Give me a small project suitable for my current level and selected language, with clear milestones."};
      sendLearnAction(action,prompts[action]||"Help me continue learning.");
    }));
    learnMarkComplete.addEventListener("click",()=>{
      if(!currentLessonTitle)return;
      const key=learnKey();const completed=Array.isArray(learnProgress[key])?learnProgress[key]:[];
      if(!completed.includes(currentLessonTitle)){completed.push(currentLessonTitle);learnProgress[key]=completed;saveLearnState();showToast("Lesson marked complete.");}
    });
    learnLanguage.addEventListener("change",loadLearnSession);
    learnLevel.addEventListener("change",loadLearnSession);
    learnGoal.addEventListener("change",saveLearnState);
    loadLearnSession();
  }else if(info.kind==="internet"){
    renderInternetWorkspace(target);
  }else if(info.kind==="image"){
    target.innerHTML='<div class="workspace-card image-workspace"><div class="workspace-label">Create an image from your imagination</div><p class="image-intro">Describe what you want to see. Choose a style, then generate your image.</p><form id="imageForm" class="image-form"><label for="imagePrompt">Image description</label><textarea id="imagePrompt" maxlength="1800" rows="4" placeholder="Example: A small African village at sunset, warm golden light, green hills, detailed scenery..." required></textarea><div class="image-form-bottom"><div class="image-style-field"><label for="imageStyle">Art style</label><select id="imageStyle"><option value="photorealistic, realistic photography">Photorealistic</option><option value="high-quality 3D animated render">3D animation</option><option value="anime illustration">Anime</option><option value="detailed digital artwork">Digital art</option><option value="cinematic concept art">Cinematic</option><option value="soft watercolor painting">Watercolor</option><option value="high-detail fantasy concept art">Fantasy</option><option value="retro futuristic synthwave artwork">Synthwave</option><option value="minimalist vector illustration">Minimalist</option><option value="comic book illustration with bold ink lines">Comic book</option><option value="traditional oil painting with rich brushstrokes">Oil painting</option><option value="pixel art with crisp pixel detail">Pixel art</option><option value="architectural visualization, realistic materials">Architectural render</option><option value="surreal dreamlike fine art">Surreal</option></select></div><div class="image-style-field"><label for="imageRatio">Aspect ratio</label><select id="imageRatio"><option value="1:1">Square post — 1:1</option><option value="16:9">YouTube / Landscape — 16:9</option><option value="9:16">Phone / TikTok / Status — 9:16</option><option value="4:3">Classic photo — 4:3</option><option value="3:2">Photo landscape — 3:2</option><option value="2:3">Photo portrait — 2:3</option></select></div><button type="submit" class="image-generate-button" id="imageGenerateButton"><i data-lucide="sparkles"></i> Generate image</button></div></form><div class="image-status" id="imageStatus" role="status" aria-live="polite">Your generated image will appear here.</div><div class="image-result" id="imageResult" hidden><img id="generatedImage" alt="AI-generated image"><div class="image-result-actions"><a id="downloadImageButton" class="image-download-button" download="midcrush-ai-image.jpg"><i data-lucide="download"></i> Save image</a><button type="button" id="regenerateImageButton" class="image-regenerate-button"><i data-lucide="refresh-cw"></i> Generate again</button><span class="image-model-label">Generated with FLUX.2 Klein 9B</span></div></div><div class="image-note">Cloudflare Workers AI includes a limited free daily allowance. Image generation may stop when the daily allowance is used up.</div></div>';
    const imageForm=document.getElementById("imageForm");
    const imagePrompt=document.getElementById("imagePrompt");
    const imageStyle=document.getElementById("imageStyle");
    const imageRatio=document.getElementById("imageRatio");
    const imageButton=document.getElementById("imageGenerateButton");
    const imageStatus=document.getElementById("imageStatus");
    const imageResult=document.getElementById("imageResult");
    const generatedImage=document.getElementById("generatedImage");
    const downloadImageButton=document.getElementById("downloadImageButton");
    const regenerateImageButton=document.getElementById("regenerateImageButton");
    async function generateImage(){
      const prompt=imagePrompt.value.trim();
      if(!prompt)return;
      imageButton.disabled=true;
      imageButton.innerHTML='<i data-lucide="loader-circle"></i> Generating...';
      if(window.lucide)lucide.createIcons();
      imageStatus.replaceChildren();
      const statusText=document.createElement("div");statusText.textContent="MIDCRUSH AI is creating your image. The image will appear here when it is ready.";
      const progressTrack=document.createElement("div");progressTrack.className="generation-progress-track image-generation-track";progressTrack.setAttribute("role","progressbar");progressTrack.setAttribute("aria-label","Image generation in progress");progressTrack.setAttribute("aria-valuemin","0");progressTrack.setAttribute("aria-valuemax","100");progressTrack.setAttribute("aria-valuetext","In progress; live percentage is not available");
      const progressBar=document.createElement("span");progressTrack.appendChild(progressBar);
      const progressNote=document.createElement("small");progressNote.className="image-progress-note";progressNote.textContent="Generating… Please keep this page open.";
      imageStatus.append(statusText,progressTrack,progressNote);
      imageResult.hidden=true;
      try{
        const response=await fetch("/api/image",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({prompt:prompt+", "+imageStyle.value,aspectRatio:imageRatio.value})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"Image generation failed. Please try again.");
        if(typeof data.image!=="string"||!data.image.startsWith("data:image/"))throw new Error("The image service returned an invalid image.");
        generatedImage.src=data.image;
        downloadImageButton.href=data.image;
        imageResult.hidden=false;
        imageStatus.textContent="Your image is ready.";
      }catch(error){
        imageStatus.textContent=error.message||"Could not generate the image. Please try again.";
      }finally{
        imageButton.disabled=false;
        imageButton.innerHTML='<i data-lucide="sparkles"></i> Generate image';
        if(window.lucide)lucide.createIcons();
      }
    }
    imageForm.addEventListener("submit",event=>{event.preventDefault();generateImage();});
    regenerateImageButton.addEventListener("click",generateImage);
  }else if(info.kind==="website"){
    target.innerHTML = "<div class=\"workspace-card website-builder-workspace\">\
      <div class=\"website-builder-intro\"><div class=\"workspace-label\">Build a complete website with AI</div><p>Create your whole website in one HTML file with several detailed sections and navigation tabs. MIDCRUSH AI chooses the tabs to fit your description instead of automatically adding standard sections.</p></div>\
      <form class=\"website-builder-form\" id=\"websiteBuilderForm\">\
        <label for=\"websitePrompt\">What kind of website should I build?</label>\
        <textarea id=\"websitePrompt\" maxlength=\"2800\" rows=\"5\" required placeholder=\"Example: Create a movie website with movie collections, categories, VJ collections, series and latest uploads. Give each area useful details and its own navigation tab.\"></textarea>\
        <div class=\"website-builder-options\">\
          <div class=\"website-builder-field\"><label for=\"websiteType\">Website type</label><select id=\"websiteType\"><option>General website</option><option>Business website</option><option>Personal portfolio</option><option>Restaurant or café</option><option>School website</option><option>Product catalogue</option><option>Blog or magazine</option><option>Event website</option></select></div>\
          <div class=\"website-builder-field\"><label for=\"websiteStyle\">Design style</label><select id=\"websiteStyle\"><option>Modern and polished</option><option>Minimal and clean</option><option>Bold and colourful</option><option>Elegant and premium</option><option>Dark and cinematic</option></select></div>\
        </div>\
        <div class=\"website-builder-examples\"><span>Quick starts</span><button type=\"button\" data-website-preset=\"portfolio\">Portfolio</button><button type=\"button\" data-website-preset=\"restaurant\">Restaurant</button><button type=\"button\" data-website-preset=\"school\">School</button><button type=\"button\" data-website-preset=\"business\">Business</button></div>\
        <div class=\"website-builder-submit-row\"><button type=\"submit\" class=\"image-generate-button\" id=\"websiteBuildButton\">Build website</button><span>One HTML file · in-page navigation</span></div>\
      </form>\
      <div class=\"website-builder-status\" id=\"websiteBuilderStatus\" role=\"status\" aria-live=\"polite\">Your website preview will appear here after generation.</div>\
      <section class=\"website-builder-result\" id=\"websiteBuilderResult\" hidden>\
        <div class=\"website-result-toolbar\"><div class=\"website-result-title\"><strong>Your website</strong><span id=\"websiteResultLabel\">Preview ready</span></div><div class=\"website-result-actions\"><button type=\"button\" class=\"chat-action\" id=\"websitePreviewTab\" aria-pressed=\"true\">Preview</button><button type=\"button\" class=\"chat-action\" id=\"websiteCodeTab\" aria-pressed=\"false\">Code</button><button type=\"button\" class=\"chat-action\" id=\"websiteDownload\">Download HTML</button></div></div>\
        <div class=\"website-preview-tools\" id=\"websitePreviewTools\"><span>Preview</span><div><button type=\"button\" id=\"websiteDesktopView\" class=\"website-device-button active\">Desktop</button><button type=\"button\" id=\"websiteMobileView\" class=\"website-device-button\">Mobile</button><button type=\"button\" id=\"websiteRefreshPreview\" class=\"website-device-button\">Refresh</button></div></div>\
        <div class=\"website-preview-panel\" id=\"websitePreviewPanel\"><iframe id=\"websitePreview\" title=\"Generated website preview\" sandbox=\"\" referrerpolicy=\"no-referrer\"></iframe></div>\
        <div class=\"website-code-panel\" id=\"websiteCodePanel\" hidden><textarea id=\"websiteCode\" spellcheck=\"false\" aria-label=\"Generated website HTML code\"></textarea><div class=\"website-code-actions\"><button type=\"button\" class=\"chat-action\" id=\"websiteCopyCode\">Copy code</button><button type=\"button\" class=\"chat-action chat-image-create\" id=\"websiteUpdatePreview\">Update preview</button></div></div>\
        <div class=\"website-chat-panel\">\
          <div class=\"website-chat-heading\"><strong>Keep building with AI</strong><span>Describe a change and MIDCRUSH AI will update this website.</span></div>\
          <div class=\"website-chat-messages\" id=\"websiteChatMessages\" aria-live=\"polite\"><div class=\"website-chat-message assistant\">Your website is ready. You can ask me to add sections, change the design, improve content or adjust the navigation.</div></div>\
          <form class=\"website-chat-form\" id=\"websiteChatForm\"><textarea id=\"websiteChatInput\" rows=\"2\" maxlength=\"1200\" required placeholder=\"E.g. Add a Latest Uploads section and make the movie cards wider...\"></textarea><button type=\"submit\" id=\"websiteChatSend\">Send change</button></form>\
          <div class=\"website-chat-suggestions\"><button type=\"button\" data-website-suggestion=\"Add more useful details to each section.\">Add more details</button><button type=\"button\" data-website-suggestion=\"Improve the navigation and make it easier to use.\">Improve navigation</button><button type=\"button\" data-website-suggestion=\"Make the design more polished and visually interesting.\">Improve design</button></div>\
        </div>\
        <div class=\"website-result-footer\"><span>All website sections and navigation are contained in this one HTML file.</span><button type=\"button\" id=\"websiteBuildAnother\">Build another website</button></div>\
      </section>\
      <p class=\"website-builder-note\">Download gives you one standalone HTML file. Navigation links move between sections in that file. Online hosting, databases and user accounts are not included automatically.</p>\
    </div>";
    const websiteForm=document.getElementById("websiteBuilderForm");
    const websitePrompt=document.getElementById("websitePrompt");
    const websiteType=document.getElementById("websiteType");
    const websiteStyle=document.getElementById("websiteStyle");
    const websiteBuildButton=document.getElementById("websiteBuildButton");
    const websiteStatus=document.getElementById("websiteBuilderStatus");
    const websiteResult=document.getElementById("websiteBuilderResult");
    const websitePreview=document.getElementById("websitePreview");
    const websiteCode=document.getElementById("websiteCode");
    const websitePreviewPanel=document.getElementById("websitePreviewPanel");
    const websiteCodePanel=document.getElementById("websiteCodePanel");
    const websitePreviewTools=document.getElementById("websitePreviewTools");
    const websitePreviewTab=document.getElementById("websitePreviewTab");
    const websiteCodeTab=document.getElementById("websiteCodeTab");
    const websiteResultLabel=document.getElementById("websiteResultLabel");
    const websiteChatForm=document.getElementById("websiteChatForm");
    const websiteChatInput=document.getElementById("websiteChatInput");
    const websiteChatMessages=document.getElementById("websiteChatMessages");
    const websiteChatSend=document.getElementById("websiteChatSend");
    let currentWebsiteHtml="";
    let currentPreviewUrl="";
    let currentSiteData=null;
    function addWebsiteChatMessage(message,role){
      const bubble=document.createElement("div");
      bubble.className="website-chat-message "+role;
      bubble.textContent=message;
      websiteChatMessages.appendChild(bubble);
      websiteChatMessages.scrollTop=websiteChatMessages.scrollHeight;
      return bubble;
    }
    function setWebsiteView(view){
      const isCode=view==="code";
      websitePreviewPanel.hidden=isCode;
      websiteCodePanel.hidden=!isCode;
      websitePreviewTools.hidden=isCode;
      websitePreviewTab.setAttribute("aria-pressed",String(!isCode));
      websiteCodeTab.setAttribute("aria-pressed",String(isCode));
    }
    function loadWebsitePreview(html,label){
      currentWebsiteHtml=String(html||"");
      setWebsiteView("preview");
      websiteResultLabel.textContent=label||"Loading website preview…";
      if(currentPreviewUrl){URL.revokeObjectURL(currentPreviewUrl);currentPreviewUrl="";}
      const blob=new Blob([currentWebsiteHtml],{type:"text/html;charset=utf-8"});
      currentPreviewUrl=URL.createObjectURL(blob);
      websitePreview.onload=()=>{websiteResultLabel.textContent=label||"Preview loaded";};
      websitePreview.onerror=()=>{websiteResultLabel.textContent="Preview failed to load";setWebsiteError("The HTML was generated, but the browser could not load it in the preview frame.");};
      websitePreview.src=currentPreviewUrl;
    }
    function showWebsiteProgress(){
      websiteStatus.replaceChildren();
      const title=document.createElement("strong");title.textContent="Building your website";
      const detail=document.createElement("span");detail.className="generation-progress-detail";detail.textContent="Creating the content and arranging all sections in one HTML file.";
      const track=document.createElement("div");track.className="generation-progress-track";track.setAttribute("role","progressbar");track.setAttribute("aria-label","Website generation in progress");track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax","100");track.setAttribute("aria-valuetext","In progress; live percentage is not available");
      const bar=document.createElement("span");track.appendChild(bar);
      const note=document.createElement("small");note.textContent="Generating your website… Keep this page open.";
      websiteStatus.append(title,detail,track,note);
    }
    function setWebsiteError(message){
      websiteStatus.replaceChildren();
      const error=document.createElement("span");error.className="website-error";error.textContent=message;websiteStatus.appendChild(error);
    }
    const presets={
      portfolio:{type:"Personal portfolio",prompt:"Create a detailed personal portfolio website. Choose navigation tabs that suit a portfolio, such as selected work, skills, experience, process or achievements. Make each area useful and detailed. Include a contact area only if it suits the brief."},
      restaurant:{type:"Restaurant or café",prompt:"Create a detailed restaurant website. Choose relevant navigation tabs such as menu, dishes, food gallery, our story, ordering information or location. Do not add unrelated business sections."},
      school:{type:"School website",prompt:"Create a detailed school website. Choose useful navigation tabs such as academics, departments, admissions, school life, news, facilities or achievements. Include only areas that make sense for a school."},
      business:{type:"Business website",prompt:"Create a detailed business website. Choose navigation tabs based on the actual business, such as products, services, projects, process, catalogue, FAQs or locations. Add contact information only when appropriate."}
    };
    websiteForm.addEventListener("click",event=>{
      const button=event.target.closest("[data-website-preset]");
      if(!button)return;
      const preset=presets[button.dataset.websitePreset];
      if(preset){websiteType.value=preset.type;websitePrompt.value=preset.prompt;websitePrompt.focus();}
    });
    websiteForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const prompt=websitePrompt.value.trim();if(!prompt)return;
      websiteBuildButton.disabled=true;websiteBuildButton.textContent="Building…";showWebsiteProgress();websiteResult.hidden=true;
      try{
        const response=await fetch("/api/website",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,siteType:websiteType.value,designStyle:websiteStyle.value})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"The website could not be generated.");
        if(typeof data.html!=="string"||!data.html.includes("</html>"))throw new Error("The builder did not return a complete HTML file. Please try again.");
        if(!data.html.toLowerCase().includes("<section")||!data.siteData||!Array.isArray(data.siteData.sections)||data.siteData.sections.length<2){
          throw new Error("The generated website is missing its content sections. Please build it again.");
        }
        currentSiteData=data.siteData;
        websiteCode.value=data.html;
        websiteChatMessages.replaceChildren();
        addWebsiteChatMessage("Your website is ready. Tell me what you would like to add, remove or improve, and I will update this same website.","assistant");
        websiteResult.hidden=false;
        websiteStatus.textContent="Your complete one-file website is ready. Continue refining it in the conversation below.";
        loadWebsitePreview(data.html,"Single HTML website");
      }catch(error){setWebsiteError(error.message||"Website generation failed. Please try again.");}
      finally{websiteBuildButton.disabled=false;websiteBuildButton.textContent="Build website";}
    });
    websiteChatForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const instruction=websiteChatInput.value.trim();
      if(!instruction||!currentSiteData||websiteChatSend.disabled)return;
      addWebsiteChatMessage(instruction,"user");
      websiteChatInput.value="";
      websiteChatSend.disabled=true;
      websiteChatSend.textContent="Updating…";
      const thinking=addWebsiteChatMessage("Updating your website…","assistant thinking");
      try{
        const response=await fetch("/api/website",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({mode:"revise",prompt:instruction,siteType:websiteType.value,designStyle:currentSiteData.designStyle||websiteStyle.value,currentSiteData})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"I couldn't update the website. Please try again.");
        if(typeof data.html!=="string"||!data.html.includes("</html>")||!data.siteData)throw new Error("The AI returned an incomplete website update. Please try again.");
        currentSiteData=data.siteData;
        websiteCode.value=data.html;
        loadWebsitePreview(data.html,"Website updated");
        thinking.textContent="Done. I've updated the website preview. You can ask for another change.";
        websiteStatus.textContent="Website updated. Existing sections were kept unless your change asked to alter them.";
      }catch(error){thinking.textContent=error.message||"The website could not be updated.";}
      finally{websiteChatSend.disabled=false;websiteChatSend.textContent="Send change";websiteChatInput.focus();}
    });
    document.querySelectorAll("[data-website-suggestion]").forEach(button=>button.addEventListener("click",()=>{
      websiteChatInput.value=button.dataset.websiteSuggestion||"";
      websiteChatInput.focus();
    }));
    websitePreviewTab.addEventListener("click",()=>setWebsiteView("preview"));
    websiteCodeTab.addEventListener("click",()=>setWebsiteView("code"));
    document.getElementById("websiteDesktopView").addEventListener("click",()=>{
      websitePreview.classList.remove("website-mobile-frame");
      document.getElementById("websiteDesktopView").classList.add("active");
      document.getElementById("websiteMobileView").classList.remove("active");
    });
    document.getElementById("websiteMobileView").addEventListener("click",()=>{
      websitePreview.classList.add("website-mobile-frame");
      document.getElementById("websiteMobileView").classList.add("active");
      document.getElementById("websiteDesktopView").classList.remove("active");
    });
    document.getElementById("websiteRefreshPreview").addEventListener("click",()=>loadWebsitePreview(websiteCode.value,"Preview refreshed"));
    document.getElementById("websiteUpdatePreview").addEventListener("click",()=>loadWebsitePreview(websiteCode.value,"Preview updated"));
    document.getElementById("websiteCopyCode").addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(websiteCode.value);showToast("HTML code copied.");}
      catch{websiteCode.focus();websiteCode.select();showToast("Select the code and copy it.");}
    });
    document.getElementById("websiteDownload").addEventListener("click",()=>{
      const blob=new Blob([websiteCode.value],{type:"text/html;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download="midcrush-website.html";
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    });
    document.getElementById("websiteBuildAnother").addEventListener("click",()=>{
      websiteResult.hidden=true;websiteStatus.textContent="Describe another website to start a new project.";websitePrompt.focus();
    });
    websitePreview.src="about:blank";
  }else{
    target.innerHTML='<div class="coming-panel"><div><div class="coming-icon"><i data-lucide="'+info.icon+'"></i></div><h2>Something exciting is coming.</h2><p>This workspace is part of the MIDCRUSH AI toolkit. We\'ll connect the right service and add its working features in a future development stage.</p><span class="coming-label">IN DEVELOPMENT</span></div></div>';
  }
}

function renderInternetWorkspace(target){
  const providers=[
    {name:"Google Workspace",detail:"Gmail, Drive, Calendar, Docs and Sheets",group:"Work & storage",url:"https://developers.google.com/identity/protocols/oauth2/"},
    {name:"YouTube",detail:"Public channel data and authorised account tools",group:"Media",url:"https://developers.google.com/youtube/v3"},
    {name:"Microsoft 365",detail:"Outlook, OneDrive, Calendar and Teams",group:"Work & storage",url:"https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow"},
    {name:"GitHub",detail:"Repositories, issues, pull requests and account data",group:"Developer tools",url:"https://docs.github.com/en/apps/oauth-apps/building-oauth-apps"},
    {name:"Facebook & Instagram",detail:"Pages and professional accounts where approved",group:"Social platforms",url:"https://developers.facebook.com/docs/"},
    {name:"TikTok",detail:"Authorised profile and content integrations where approved",group:"Social platforms",url:"https://developers.tiktok.com/"},
    {name:"Discord",detail:"Authorised servers, bots and account permissions",group:"Community",url:"https://discord.com/developers/docs/topics/oauth2"},
    {name:"Slack",detail:"Workspace apps and approved permission scopes",group:"Work & community",url:"https://api.slack.com/authentication/oauth-v2"},
    {name:"Notion",detail:"Pages, databases and workspace content",group:"Work & storage",url:"https://developers.notion.com/docs/authorization"},
    {name:"Dropbox",detail:"Files and folders you authorise",group:"Work & storage",url:"https://developers.dropbox.com/oauth-guide"},
    {name:"Spotify",detail:"Public music data and permitted playlist features",group:"Media",url:"https://developer.spotify.com/documentation/web-api/concepts/authorization"},
    {name:"Telegram",detail:"Bots and channels through the official Bot API",group:"Community",url:"https://core.telegram.org/bots/api"},
    {name:"Canva",detail:"Design workflows through approved developer products",group:"Creative tools",url:"https://www.canva.dev/docs/"},
    {name:"Trello",detail:"Boards, cards and project workflows",group:"Work & planning",url:"https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/"},
    {name:"Figma",detail:"Design files, comments and authorised team data",group:"Creative tools",url:"https://developers.figma.com/docs/"},
    {name:"Shopify",detail:"Store data through approved admin permissions",group:"Business tools",url:"https://shopify.dev/docs/apps/build/authentication-authorization"},
    {name:"GitLab",detail:"Projects, issues and merge requests",group:"Developer tools",url:"https://docs.gitlab.com/"},
    {name:"WordPress",detail:"Posts, pages and site management through REST API",group:"Publishing",url:"https://developer.wordpress.org/rest-api/"},
    {name:"Composio integration gateway",detail:"One developer integration layer for 1,000+ app toolkits and managed OAuth",group:"Integration gateways",url:"https://docs.composio.dev/docs"}
  ];
  target.innerHTML =
    "<div class='workspace-card internet-workspace'>"+
    "<div class='internet-hero'><div><span class='internet-kicker'>WEB RESEARCH &amp; PLATFORM HUB</span><h2>Explore beyond MIDCRUSH AI.</h2><p>Search public information across the web, look for news and images, and prepare secure connections to the services you use.</p></div><div class='internet-hero-icon'><i data-lucide='globe'></i></div></div>"+
    "<section class='internet-search-panel'><div class='internet-section-heading'><div><strong>Search the internet</strong><span>Public websites and indexed pages. Private account data needs a separate authorised connection.</span></div><span class='internet-provider-tag'>TAVILY SEARCH</span></div>"+
    "<form id='internetSearchForm' class='internet-search-form'><input id='internetQuery' maxlength='240' placeholder='Search websites, topics, tutorials, public pages...' autocomplete='off' required><button type='submit' id='internetSearchButton'><i data-lucide='search'></i> Search</button></form>"+
    "<div class='internet-search-controls'><div class='internet-search-tabs' role='group' aria-label='Search type'><button type='button' class='active' data-search-type='web'>Web</button><button type='button' data-search-type='news'>News</button><button type='button' data-search-type='images'>Images</button></div>"+
    "<label>Search within<select id='internetScope'><option value=''>The whole indexed web</option><option value='youtube'>YouTube</option><option value='github'>GitHub</option><option value='reddit'>Reddit</option><option value='stackoverflow'>Stack Overflow</option><option value='docs'>Official documentation</option><option value='tiktok'>Public TikTok pages</option></select></label></div>"+
    "<div id='internetSearchStatus' class='internet-search-status' role='status' aria-live='polite'>Search results will appear here. Safe Search is enabled.</div><div id='internetSearchAnswer' class='internet-search-answer' hidden></div><div id='internetImageResults' class='internet-image-results' hidden></div><div id='internetSearchResults' class='internet-search-results'></div>"+
    "<div class='internet-search-footnote'>Search uses a server-side Tavily key. To enable it, add the secret <strong>TAVILY_API_KEY</strong> in Cloudflare Pages → Settings → Variables and Secrets, then redeploy. Tavily currently lists a free 1,000-credit monthly tier with no card required. Never paste passwords or private messages into search. <a href='https://www.tavily.com/pricing' target='_blank' rel='noopener noreferrer'>View Tavily plans</a>.</div></section>"+
    "<section class='internet-connections-panel'><div class='internet-section-heading'><div><strong>Platform integrations</strong><span>Explore official developer setup for platforms you may want to connect.</span></div><span class='internet-count'>"+providers.length+" PLATFORMS</span></div>"+
    "<div class='internet-connection-notice'><i data-lucide='shield-check'></i><div><strong>Private connections need secure setup</strong><p>Each service requires its own developer app, approved permissions and OAuth sign-in. MIDCRUSH AI also needs secure server-side token storage before account connections can be enabled. Passwords and access tokens must never be stored in browser storage.</p></div></div>"+
    "<div class='internet-provider-filters'><button type='button' class='active' data-provider-filter='All'>All</button><button type='button' data-provider-filter='Work & storage'>Work &amp; storage</button><button type='button' data-provider-filter='Developer tools'>Developer tools</button><button type='button' data-provider-filter='Social platforms'>Social platforms</button><button type='button' data-provider-filter='Media'>Media</button><button type='button' data-provider-filter='Community'>Community</button><button type='button' data-provider-filter='Creative tools'>Creative tools</button><button type='button' data-provider-filter='Work & planning'>Work &amp; planning</button><button type='button' data-provider-filter='Publishing'>Publishing</button><button type='button' data-provider-filter='Business tools'>Business tools</button><button type='button' data-provider-filter='Integration gateways'>Integration gateways</button></div>"+
    "<div class='internet-provider-grid' id='internetProviderGrid'></div></section>"+
    "<div class='internet-footer-note'>A platform appearing here does not mean its API is open to every feature or account. Some providers review apps, restrict permissions or require account eligibility. Use only permissions you understand and are allowed to grant.</div></div>";

  const searchForm=document.getElementById("internetSearchForm");
  const searchInput=document.getElementById("internetQuery");
  const searchButton=document.getElementById("internetSearchButton");
  const searchStatus=document.getElementById("internetSearchStatus");
  const answerBox=document.getElementById("internetSearchAnswer");
  const resultsBox=document.getElementById("internetSearchResults");
  const imagesBox=document.getElementById("internetImageResults");
  const scopeSelect=document.getElementById("internetScope");
  let searchType="web",providerFilter="All";
  function safeLink(parent,url,label,className){
    const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=label;
    if(className)link.className=className;parent.appendChild(link);return link;
  }
  function renderProviderCards(){
    const grid=document.getElementById("internetProviderGrid");grid.replaceChildren();
    providers.filter(p=>providerFilter==="All"||p.group===providerFilter).forEach(provider=>{
      const card=document.createElement("article");card.className="internet-provider-card";
      const top=document.createElement("div");top.className="internet-provider-top";
      const icon=document.createElement("span");icon.className="internet-provider-icon";icon.textContent=provider.name.slice(0,1);
      const status=document.createElement("span");status.className="internet-provider-status";status.textContent="Setup required";top.append(icon,status);
      const title=document.createElement("strong");title.textContent=provider.name;
      const detail=document.createElement("p");detail.textContent=provider.detail;
      const group=document.createElement("small");group.textContent=provider.group;
      const link=safeLink(card,provider.url,"Open developer docs","internet-provider-link");
      card.append(top,title,detail,group,link);grid.appendChild(card);
    });
  }
  document.querySelectorAll("[data-provider-filter]").forEach(button=>button.addEventListener("click",()=>{
    providerFilter=button.dataset.providerFilter||"All";
    document.querySelectorAll("[data-provider-filter]").forEach(item=>item.classList.toggle("active",item===button));
    renderProviderCards();
  }));
  document.querySelectorAll("[data-search-type]").forEach(button=>button.addEventListener("click",()=>{
    searchType=button.dataset.searchType||"web";
    document.querySelectorAll("[data-search-type]").forEach(item=>item.classList.toggle("active",item===button));
    searchStatus.textContent=searchType==="news"?"Search recent news sources.":searchType==="images"?"Search web pages and related images.":"Search public pages across the web.";
  }));
  function renderSearchData(data){
    answerBox.hidden=!data.answer;answerBox.replaceChildren();
    if(data.answer){const label=document.createElement("strong");label.textContent="Search summary";const paragraph=document.createElement("p");paragraph.textContent=data.answer;answerBox.append(label,paragraph);}
    imagesBox.replaceChildren();
    const images=Array.isArray(data.images)?data.images:[];
    if(images.length){
      imagesBox.hidden=false;
      images.forEach(item=>{
        const card=document.createElement("article");card.className="internet-image-card";
        const img=document.createElement("img");img.src=item.url;img.alt=item.description||"Search result image";img.loading="lazy";img.referrerPolicy="no-referrer";card.appendChild(img);
        if(item.description){const desc=document.createElement("p");desc.textContent=item.description;card.appendChild(desc);}
        safeLink(card,item.url,"Open image");imagesBox.appendChild(card);
      });
    }else imagesBox.hidden=true;
    resultsBox.replaceChildren();
    const results=Array.isArray(data.results)?data.results:[];
    if(!results.length){const empty=document.createElement("p");empty.className="internet-empty-results";empty.textContent="No public results were returned for this search.";resultsBox.appendChild(empty);return;}
    results.forEach((item,index)=>{
      const card=document.createElement("article");card.className="internet-result-card";
      const meta=document.createElement("div");meta.className="internet-result-meta";
      if(item.favicon){const icon=document.createElement("img");icon.src=item.favicon;icon.alt="";icon.loading="lazy";meta.appendChild(icon);}
      const host=document.createElement("span");try{host.textContent=new URL(item.url).hostname;}catch{host.textContent="Web result";}
      if(item.publishedDate){const date=document.createElement("span");date.textContent=item.publishedDate;meta.appendChild(date);}meta.appendChild(host);
      safeLink(card,item.url,item.title,"internet-result-title");
      const content=document.createElement("p");content.textContent=item.content||"Open the source to read more.";
      const bottom=document.createElement("div");bottom.className="internet-result-bottom";bottom.textContent="Source "+(index+1);
      card.append(meta,content,bottom);resultsBox.appendChild(card);
    });
  }
  searchForm.addEventListener("submit",async event=>{
    event.preventDefault();const query=searchInput.value.trim();if(!query)return;
    searchButton.disabled=true;searchButton.textContent="Searching…";searchStatus.textContent="Searching public websites…";
    answerBox.hidden=true;imagesBox.hidden=true;resultsBox.replaceChildren();
    try{
      const response=await fetch("/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,type:searchType,scope:scopeSelect.value})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Search could not be completed.");
      renderSearchData(data);
      const credits=data.usage?.credits;
      searchStatus.textContent="Found "+(data.results?.length||0)+" sources"+(Number.isFinite(credits)?" · "+credits+" search credit(s) used":"")+" · Safe Search on";
    }catch(error){searchStatus.textContent=error.message||"Search is temporarily unavailable.";}
    finally{searchButton.disabled=false;searchButton.innerHTML="<i data-lucide='search'></i> Search";if(window.lucide)lucide.createIcons();}
  });
  renderProviderCards();
}

document.addEventListener("click",e=>{const button=e.target.closest("[data-page]");if(button){e.preventDefault();navigate(button.dataset.page);if(button.classList.contains("new-chat"))document.getElementById("newChatButton")?.click();}});
document.getElementById("menuToggle").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.addEventListener("click",e=>{if(window.innerWidth<=760&&sidebar.classList.contains("open")&&!sidebar.contains(e.target)&&!e.target.closest("#menuToggle"))sidebar.classList.remove("open")});
if(window.lucide)lucide.createIcons();