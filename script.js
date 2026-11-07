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
    let editSession=null;
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
          if(currentChatId===conversation.id){currentChatId=null;history=[];latestReply="";renderHistory();copyReplyButton.disabled=true;}
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
          body:JSON.stringify({messages:history.slice(-12),image:imageData||undefined})
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
      reader.onload=()=>{const source=new Image();source.onload=()=>{const scale=Math.min(1,511/Math.max(source.width,source.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));canvas.getContext("2d").drawImage(source,0,0,canvas.width,canvas.height);attachedImageData=canvas.toDataURL("image/jpeg",0.88);chatImagePreview.hidden=false;chatImagePreview.replaceChildren();const img=document.createElement("img");img.src=attachedImageData;img.alt="Photo ready to edit";const remove=document.createElement("button");remove.type="button";remove.textContent="Remove photo";remove.addEventListener("click",()=>{attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();});chatImagePreview.append(img,remove);};source.onerror=()=>showToast("Could not read that image. Try another photo.");source.src=String(reader.result||"");};
      reader.readAsDataURL(file);
    });
    chatMode.addEventListener("change",()=>{chatInput.placeholder=chatMode.value==="generate"?"Describe the image to generate...":chatMode.value==="edit"?"Describe how to edit your photo...":"Message MIDCRUSH AI...";});
    function isImageRequest(value){
      return /\b(generate|create|make|draw|design|produce)\b/i.test(value) && /\b(image|picture|photo|portrait|wallpaper|poster|illustration|artwork|logo|thumbnail)\b/i.test(value);
    }
    function isPhotoEditRequest(value){
      const text=String(value||"").toLowerCase();
      const editAction=/\b(edit|modify|change|transform|retouch|enhance|brighten|darken|remove|replace|erase|recolor|recolour|restore|clean up|convert|turn)\b/i.test(text);
      const makeOrTurn=/\b(make|turn|change)\s+(this|that|the|my|it|photo|picture|image|background|sky)\b/i.test(text);
      const visualEdit=/\b(background|sky|lighting|weather|rain|daytime|nighttime|sunny|cloudy|colour|color|brightness|road|clothes|shirt|hair)\b/i.test(text);
      return editAction || (makeOrTurn && visualEdit) || /\b(make it|make this|make the photo|make the picture|make the image|turn it into|turn this into|replace the background|change the background|remove the background)\b/i.test(text);
    }
    async function generateFromChat(prompt,style,ratio,imageData,waiting,mode){
      const button=waiting.querySelector(".chat-image-create");
      if(button){button.disabled=true;button.textContent="Creating...";}
      const fullPrompt=mode==="edit"
        ? prompt+". Edit the supplied image itself. Preserve the original subject, identity, key objects and composition wherever possible. Do not create an unrelated replacement."
        : (style==="You decide"?prompt:prompt+", "+style);
      try{
        const response=await fetch("/api/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:fullPrompt,aspectRatio:ratio,image:imageData||undefined})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"Image request failed.");
        if(typeof data.image!=="string"||!data.image.startsWith("data:image/"))throw new Error("The image service returned an invalid image.");
        waiting.replaceChildren();
        if(mode==="edit"){
          editSession.currentImage=data.image;
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
          waiting.append(document.createTextNode("Your image is ready."));
          const img=document.createElement("img");img.src=data.image;img.alt="AI generated image";img.className="chat-generated-image";waiting.appendChild(img);
          const download=document.createElement("a");download.href=data.image;download.download="midcrush-ai-image.jpg";download.textContent="Save image";download.className="chat-image-download";waiting.appendChild(download);
          history.push({role:"assistant",content:"Generated an image for: "+prompt+" ("+ratio+")"});
        }
        persistCurrentConversation();latestReply=history[history.length-1].content;copyReplyButton.disabled=false;
      }catch(error){
        const message=document.createElement("p");message.className="chat-image-error";message.textContent=error.message||"Could not complete the image request.";
        waiting.appendChild(message);
        if(button){button.disabled=false;button.textContent="Try again";}
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
          editSession={originalImage:imageData,currentImage:imageData,prompt,ratio:best};
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
      const create=document.createElement("button");create.type="button";create.className="chat-action chat-image-create";create.textContent="Create image";
      create.addEventListener("click",()=>generateFromChat(prompt,style.value,ratio.value,imageData,waiting,mode));
      waiting.append(heading,styleLabel,style,ratioLabel,ratio,create);chatBox.appendChild(waiting);chatBox.scrollTop=chatBox.scrollHeight;
    }
    function showEditConfirmation(){
      const card=document.createElement("div");card.className="reply-bubble chat-edit-confirmation";
      const heading=document.createElement("strong");heading.textContent="Review your edit";
      const preview=document.createElement("img");preview.src=editSession.currentImage;preview.alt="Photo to edit";preview.className="chat-generated-image";
      const summary=document.createElement("p");summary.textContent="I’ll apply this change: "+editSession.prompt+". I’ll choose the visual style automatically and preserve the main subject and important details. Output shape: "+editSession.ratio+" (matched to your original photo).";
      const actions=document.createElement("div");actions.className="chat-actions";
      const confirm=document.createElement("button");confirm.type="button";confirm.className="chat-action chat-image-create";confirm.textContent="Confirm and edit";
      const change=document.createElement("button");change.type="button";change.className="chat-action";change.textContent="Change details";
      confirm.addEventListener("click",()=>{confirm.disabled=true;change.disabled=true;confirm.textContent="Editing...";generateFromChat(editSession.prompt,"You decide",editSession.ratio,editSession.currentImage,card,"edit");});
      change.addEventListener("click",()=>{pendingEdit="details";chatInput.placeholder="Describe what you want changed...";chatInput.focus();});
      actions.append(confirm,change);card.append(heading,preview,summary,actions);chatBox.appendChild(card);chatBox.scrollTop=chatBox.scrollHeight;
    }
    chatForm.addEventListener("submit",async e=>{
      e.preventDefault();
      const value=chatInput.value.trim();
      if(!value||sendButton.disabled)return;
      const mode=chatMode.value;
      if(pendingEdit){
        const action=pendingEdit;pendingEdit=null;
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        chatInput.value="";
        if(action==="details"){editSession.prompt=value;showEditConfirmation();}
        else if(action==="revise"){
          editSession.prompt=value;
          const waiting=document.createElement("div");waiting.className="reply-bubble";waiting.textContent="Applying your next change...";
          chatBox.appendChild(waiting);
          generateFromChat(value,"You decide",editSession.ratio,editSession.currentImage,waiting,"edit");
        }
        return;
      }
      if(mode==="edit"&&!attachedImageData){showToast("Add a photo first.");return;}
      if(mode==="generate"||(mode==="chat"&&!attachedImageData&&isImageRequest(value))){
        ensureConversation();
        history.push({role:"user",content:"[Image request] "+value});persistCurrentConversation();
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        chatInput.value="";showImageChoices(value,"generate","");return;
      }
      if(mode==="edit"||(mode==="chat"&&attachedImageData&&isPhotoEditRequest(value))){
        ensureConversation();history.push({role:"user",content:"[Photo edit] "+value});persistCurrentConversation();
        const bubble=document.createElement("div");bubble.className="message-bubble";bubble.textContent=value;chatBox.appendChild(bubble);
        const imageToEdit=attachedImageData;
        chatInput.value="";attachedImageData="";chatImageFile.value="";chatImagePreview.hidden=true;chatImagePreview.replaceChildren();
        showImageChoices(value,"edit",imageToEdit);return;
      }
      const imageToAsk=attachedImageData;
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
    target.innerHTML='<div class="workspace-card image-workspace"><div class="workspace-label">Create an image from your imagination</div><p class="image-intro">Describe what you want to see. Choose a style, then generate your image.</p><form id="imageForm" class="image-form"><label for="imagePrompt">Image description</label><textarea id="imagePrompt" maxlength="1800" rows="4" placeholder="Example: A small African village at sunset, warm golden light, green hills, detailed scenery..." required></textarea><div class="image-form-bottom"><div class="image-style-field"><label for="imageStyle">Art style</label><select id="imageStyle"><option value="photorealistic, realistic photography">Photorealistic</option><option value="high-quality 3D animated render">3D animation</option><option value="anime illustration">Anime</option><option value="detailed digital artwork">Digital art</option><option value="cinematic concept art">Cinematic</option><option value="soft watercolor painting">Watercolor</option><option value="high-detail fantasy concept art">Fantasy</option><option value="retro futuristic synthwave artwork">Synthwave</option><option value="minimalist vector illustration">Minimalist</option><option value="comic book illustration with bold ink lines">Comic book</option><option value="traditional oil painting with rich brushstrokes">Oil painting</option><option value="pixel art with crisp pixel detail">Pixel art</option><option value="architectural visualization, realistic materials">Architectural render</option><option value="surreal dreamlike fine art">Surreal</option></select></div><div class="image-style-field"><label for="imageRatio">Aspect ratio</label><select id="imageRatio"><option value="1:1">Square post — 1:1</option><option value="16:9">YouTube / Landscape — 16:9</option><option value="9:16">Phone / TikTok / Status — 9:16</option><option value="4:3">Classic photo — 4:3</option><option value="3:2">Photo landscape — 3:2</option><option value="2:3">Photo portrait — 2:3</option></select></div><button type="submit" class="image-generate-button" id="imageGenerateButton"><i data-lucide="sparkles"></i> Generate image</button></div></form><div class="image-status" id="imageStatus" role="status" aria-live="polite">Your generated image will appear here.</div><div class="image-result" id="imageResult" hidden><img id="generatedImage" alt="AI-generated image"><div class="image-result-actions"><a id="downloadImageButton" class="image-download-button" download="midcrush-ai-image.jpg"><i data-lucide="download"></i> Save image</a><button type="button" id="regenerateImageButton" class="image-regenerate-button"><i data-lucide="refresh-cw"></i> Generate again</button><span class="image-model-label">Generated with FLUX.2 klein 4B</span></div></div><div class="image-note">Free usage is limited by Cloudflare&#39;s daily AI allowance. Image generation may stop when the shared daily allowance is used up.</div></div>';
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
      imageStatus.textContent="Creating your image. This may take a little while...";
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