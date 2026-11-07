const toolInfo = {
  chat:{title:"AI Chat",kicker:"THINK & WRITE",description:"Your thinking partner for ideas, questions and everyday tasks.",icon:"message-circle",kind:"chat"},
  video:{title:"AI Video",kicker:"BRING IDEAS TO LIFE",description:"Explore creative video concepts and text-to-video workflows.",icon:"clapperboard"},
  image:{title:"AI Image",kicker:"IMAGINE & CREATE",description:"Turn your imagination into original visual concepts.",icon:"image"},
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
    target.innerHTML='<div class="workspace-card"><div class="chat-toolbar"><div class="workspace-label">Your conversations</div><div class="chat-actions"><button type="button" class="chat-action" id="newChatButton"><i data-lucide="plus"></i> New chat</button><button type="button" class="chat-action" id="copyReplyButton" disabled><i data-lucide="copy"></i> Copy reply</button></div></div><div class="recent-chats" id="recentChats" aria-label="Recent conversations"></div><div class="chat-box" id="chatBox"><div class="welcome-message">👋 Welcome to MIDCRUSH AI. Ask a question, explore an idea, or get help with a task. Your recent conversations are saved on this device.</div></div><form class="chat-compose" id="chatForm"><input id="chatInput" autocomplete="off" placeholder="Message MIDCRUSH AI..." aria-label="Your message"><button class="send-button" aria-label="Send message"><i data-lucide="arrow-up"></i></button></form><div class="chat-footnote">Recent chats are saved in this browser on this device. AI responses can make mistakes; check important information.</div></div>';
    const chatForm=document.getElementById("chatForm");
    const chatInput=document.getElementById("chatInput");
    const sendButton=chatForm.querySelector("button");
    const chatBox=document.getElementById("chatBox");
    const recentChats=document.getElementById("recentChats");
    const copyReplyButton=document.getElementById("copyReplyButton");
    const STORAGE_KEY="midcrush_ai_recent_chats_v1";
    let conversations=[];
    let currentChatId=null;
    let history=[];
    let latestReply="";
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
    async function requestReply(value, continuation=false){
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
          body:JSON.stringify({messages:history.slice(-12)})
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
    chatForm.addEventListener("submit",e=>{
      e.preventDefault();
      const value=chatInput.value.trim();
      if(!value||sendButton.disabled)return;
      chatInput.value="";
      requestReply(value);
    });
    conversations=readConversations();
    if(conversations.length){
      conversations.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      loadConversation(conversations[0].id);
    }else{
      renderHistory();
      renderRecentChats();
    }
  }else{
    target.innerHTML='<div class="coming-panel"><div><div class="coming-icon"><i data-lucide="'+info.icon+'"></i></div><h2>Something exciting is coming.</h2><p>This workspace is part of the MIDCRUSH AI toolkit. We\'ll connect the right service and add its working features in a future development stage.</p><span class="coming-label">IN DEVELOPMENT</span></div></div>';
  }
}
document.addEventListener("click",e=>{const button=e.target.closest("[data-page]");if(button){e.preventDefault();navigate(button.dataset.page)}});
document.getElementById("menuToggle").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.addEventListener("click",e=>{if(window.innerWidth<=760&&sidebar.classList.contains("open")&&!sidebar.contains(e.target)&&!e.target.closest("#menuToggle"))sidebar.classList.remove("open")});
if(window.lucide)lucide.createIcons();