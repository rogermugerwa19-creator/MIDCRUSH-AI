const toolInfo = {
  chat:{title:"AI Chat",kicker:"THINK & WRITE",description:"Your thinking partner for ideas, questions and everyday tasks.",icon:"message-circle",kind:"chat"},
  video:{title:"AI Video",kicker:"BRING IDEAS TO LIFE",description:"Explore creative video concepts and text-to-video workflows.",icon:"clapperboard"},
  image:{title:"AI Image",kicker:"IMAGINE & CREATE",description:"Turn your imagination into original visual concepts.",icon:"image",kind:"image"},
  voice:{title:"AI Voice",kicker:"SOUND & SPEAK",description:"Explore voice generation and audio experiences.",icon:"audio-lines"},
  coding:{title:"AI Coding",kicker:"BUILD & DEVELOP",description:"Get help understanding, writing and improving code.",icon:"code-2"},
  documents:{title:"Documents",kicker:"PLAN & ORGANISE",description:"Create and refine letters, reports, notes and more.",icon:"file-text"},
  music:{title:"AI Music",kicker:"CREATE YOUR SOUND",description:"Explore music ideas, styles and audio creation.",icon:"music-2"},
  website:{title:"Website Builder",kicker:"DESIGN & LAUNCH",description:"Plan and create modern website experiences.",icon:"panels-top-left"},
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
    target.innerHTML='<div class="workspace-card"><div class="chat-toolbar"><div class="workspace-label">Your conversations</div><div class="chat-actions"><button type="button" class="chat-action" id="newChatButton"><i data-lucide="plus"></i> New chat</button><button type="button" class="chat-action" id="copyReplyButton" disabled><i data-lucide="copy"></i> Copy reply</button></div></div><div class="recent-chats" id="recentChats" aria-label="Recent conversations"></div><div class="chat-box" id="chatBox"><div class="welcome-message">👋 Welcome to MIDCRUSH AI. Ask a question, explore an idea, or get help with a task. Your recent conversations are saved on this device.</div></div><div class="chat-tools-row"><select id="chatMode" aria-label="Chat mode"><option value="chat">Normal Chat</option><option value="generate">Generate Image</option><option value="edit">Edit Photo</option></select><label class="chat-upload-button" for="chatImageFile"><i data-lucide="image-plus"></i> Add photo</label><input id="chatImageFile" type="file" accept="image/jpeg,image/png,image/webp" hidden></div><div class="chat-image-preview" id="chatImagePreview" hidden></div><form class="chat-compose" id="chatForm"><input id="chatInput" autocomplete="off" placeholder="Message MIDCRUSH AI..." aria-label="Your message"><button class="send-button" aria-label="Send message"><i data-lucide="arrow-up"></i></button></form><div class="chat-footnote">Recent chats are saved in this browser on this device. AI responses can make mistakes; check important information.</div></div>';
    const chatForm=document.getElementById("chatForm");
    const chatInput=document.getElementById("chatInput");
    const chatMode=document.getElementById("chatMode");
    const chatImageFile=document.getElementById("chatImageFile");
    const chatImagePreview=document.getElementById("chatImagePreview");
    let attachedImageData="";
    const sendButton=chatForm.querySelector("button");
    const chatBox=document.getElementById("chatBox");
    const recentChats=document.getElementById("recentChats");
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
      const heading=document.createElement("div");
      heading.className="recent-chats-heading";
      heading.textContent=conversations.length?"RECENT CHATS":"NO SAVED CHATS YET";
      recentChats.appendChild(heading);
      conversations.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).forEach(conversation=>{
        const item=document.createElement("div");
        item.className="recent-chat-item"+(conversation.id===currentChatId?" active":"");
        const open=document.createElement("button");
        open.type="button";
        open.className="recent-chat-open";
        open.textContent=conversation.title||"New conversation";
        open.title=conversation.title||"New conversation";
        open.addEventListener("click",()=>loadConversation(conversation.id));
        const remove=document.createElement("button");
        remove.type="button";
        remove.className="recent-chat-delete";
        remove.setAttribute("aria-label","Delete "+(conversation.title||"conversation"));
        remove.textContent="×";
        remove.addEventListener("click",()=>{
          conversations=conversations.filter(c=>c.id!==conversation.id);
          if(currentChatId===conversation.id){currentChatId=null;history=[];latestReply="";currentImageData="";attachedImageData="";editSession=null;renderHistory();copyReplyButton.disabled=true;}
          saveConversations();
        });
        item.append(open,remove);
        recentChats.appendChild(item);
      });
    }
    function renderHistory(){
      chatBox.replaceChildren();
      if(!history.length){
        const welcome=document.createElement("div");
        welcome.className="welcome-message";
        welcome.textContent="👋 Welcome to MIDCRUSH AI. Ask a question, explore an idea, or get help with a task.";
        chatBox.appendChild(welcome);
      }else{
        history.forEach(message=>{
          const bubble=document.createElement("div");
          bubble.className=message.role==="user"?"message-bubble":"reply-bubble";
          bubble.textContent=message.content;
          chatBox.appendChild(bubble);
        });
      }
      chatBox.scrollTop=chatBox.scrollHeight;
      latestReply=[...history].reverse().find(m=>m.role==="assistant")?.content||"";
      copyReplyButton.disabled=!latestReply;
    }
    function loadConversation(id){
      const conversation=conversations.find(c=>c.id===id);
      if(!conversation)return;
      currentChatId=id;
      currentImageData=typeof conversation.imageData==="string"?conversation.imageData:"";
      attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();
      editSession=null;pendingEdit=null;pendingEditCard=null;
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
      pendingEdit=null;pendingEditCard=null;pendingGeneration=null;editSession=null;
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
    async function requestReply(value, continuation=false, imageData=""){
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
        const response=await fetch("/api/chat",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({messages:history.slice(-12),image:imageData||currentImageData||undefined})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"The AI service could not answer right now.");
        const answer=typeof data.response==="string"?data.response:"I couldn't generate a response. Please try again.";
        waiting.textContent=answer;
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
    chatMode.addEventListener("change",()=>{chatInput.placeholder=chatMode.value==="generate"?"Describe the image to generate...":chatMode.value==="edit"?"Describe how to edit your photo...":"Message MIDCRUSH AI...";});
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
    chatForm.addEventListener("submit",async e=>{
      e.preventDefault();
      const value=chatInput.value.trim();
      if(!value||sendButton.disabled)return;
      const mode=chatMode.value;
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
      requestReply(value,false,imageToAsk);
    });
    conversations=readConversations();
    if(conversations.length){
      conversations.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      loadConversation(conversations[0].id);
    }else{
      renderHistory();
      renderRecentChats();
    }
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
  }else{
    target.innerHTML='<div class="coming-panel"><div><div class="coming-icon"><i data-lucide="'+info.icon+'"></i></div><h2>Something exciting is coming.</h2><p>This workspace is part of the MIDCRUSH AI toolkit. We\'ll connect the right service and add its working features in a future development stage.</p><span class="coming-label">IN DEVELOPMENT</span></div></div>';
  }
}
document.addEventListener("click",e=>{const button=e.target.closest("[data-page]");if(button){e.preventDefault();navigate(button.dataset.page)}});
document.getElementById("menuToggle").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.addEventListener("click",e=>{if(window.innerWidth<=760&&sidebar.classList.contains("open")&&!sidebar.contains(e.target)&&!e.target.closest("#menuToggle"))sidebar.classList.remove("open")});
if(window.lucide)lucide.createIcons();