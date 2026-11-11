const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:HEADERS});
}

function readText(result) {
  const content=result?.choices?.[0]?.message?.content;
  if(typeof content==="string") return content.trim();
  if(Array.isArray(content)) return content.map(part=>typeof part?.text==="string"?part.text:"").join("").trim();
  if(typeof result?.response==="string") return result.response.trim();
  return "";
}

function parseJson(value) {
  const source=String(value||"").trim().replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"");
  try { return JSON.parse(source); } catch {}
  const first=source.indexOf("{"), last=source.lastIndexOf("}");
  if(first>=0&&last>first) { try { return JSON.parse(source.slice(first,last+1)); } catch {} }
  return null;
}

function clean(value, fallback="", max=1600) {
  if(typeof value!=="string") return fallback;
  const text=value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").trim();
  return text ? text.slice(0,max) : fallback;
}

const LANGUAGES = [
  "Python","JavaScript","HTML & CSS","Java","C","C++","C#","PHP",
  "TypeScript","Go","Ruby","SQL","Dart","Kotlin","Swift","Rust"
];
const LEVELS = ["Beginner","Intermediate","Advanced"];
const ACTIONS = ["start","lesson","practice","hint","check","next","project","explain","chat"];

const TUTOR_PROMPT = [
  "You are MIDCRUSH AI Programming Tutor, a patient programming teacher. Your job is to teach the learner to understand and write code, not merely to do all work for them.",
  "Adapt every explanation to the learner's selected programming language, experience level and learning goal. Begin with plain language, explain new terms, and build from simple examples toward more difficult ideas.",
  "Teach one main concept at a time. Use accurate, runnable examples for the selected language. Explain what each important line does. Avoid using another language unless comparing concepts is genuinely useful.",
  "For a lesson, structure the reply as: lesson title, what the concept means, why it is useful, a small example, explanation of the example, and a short exercise. Include a codeExample object with language, code and explanation when useful.",
  "For practice, give one focused exercise and optionally starter code. Do not include the full answer in the same response. The learner should attempt it first.",
  "For a hint, give a graduated hint that helps them think. Do not reveal the full solution unless the learner explicitly asks.",
  "For code review, inspect the learner's submitted code carefully. Explain what works, identify errors, explain why they happen, and show a corrected version only where it helps learning. Never claim code was executed unless a tool actually executed it.",
  "For the next lesson, continue in a sensible learning sequence and avoid repeating material already covered in the conversation.",
  "For projects, propose a small project appropriate to the learner's level and selected language, split into clear milestones. Do not overwhelm a beginner.",
  "Be encouraging but honest. Correct misunderstandings clearly and kindly. Do not pretend an incorrect answer is correct.",
  "If the learner asks for something unrelated to programming, answer briefly and guide them back to the learning goal where appropriate.",
  "Do not ask unnecessary questions. If the goal is blank, choose a sensible beginner learning path for the selected language.",
  "Return ONLY valid compact JSON with these fields: reply (string), lessonTitle (optional string), topic (optional string), codeExample (optional object with language, code, explanation), exercise (optional object with prompt and starterCode), feedback (optional string), nextTopic (optional string), lessonReady (optional boolean). Do not wrap JSON in Markdown fences."
].join(" ");

export async function onRequestPost({request,env}) {
  let body;
  try { body=await request.json(); } catch { return json({error:"Send a valid learning request."},400); }

  const language=typeof body.language==="string"?body.language:"Python";
  const level=typeof body.level==="string"?body.level:"Beginner";
  const goal=clean(body.goal,"Build programming skills from the fundamentals.",240);
  const action=ACTIONS.includes(body.action)?body.action:"chat";
  const currentLesson=clean(body.currentLesson,"",120);
  const progress=Array.isArray(body.completedLessons)?body.completedLessons.slice(-60).map(v=>clean(v,"",120)).filter(Boolean):[];
  if(!LANGUAGES.includes(language)) return json({error:"Choose a supported programming language."},400);
  if(!LEVELS.includes(level)) return json({error:"Choose Beginner, Intermediate or Advanced."},400);

  const inputMessages=Array.isArray(body.messages)?body.messages:[];
  if(inputMessages.length>12) return json({error:"Keep the recent tutor conversation to 12 messages or fewer."},400);
  const messages=[];
  let total=0;
  for(const item of inputMessages) {
    if(!item||!["user","assistant"].includes(item.role)||typeof item.content!=="string") return json({error:"One of the learning messages is invalid."},400);
    const value=item.content.trim();
    if(!value||value.length>2600) return json({error:"Each learning message must contain 1 to 2,600 characters."},400);
    total+=value.length;
    messages.push({role:item.role,content:value});
  }
  if(total>9000) return json({error:"This learning conversation is getting long. Start a new lesson to continue."},400);
  if(!messages.length||messages[messages.length-1].role!=="user") return json({error:"Send a question, code sample or learning action."},400);
  if(!env.AI) return json({error:"The programming tutor is not connected. Check the Cloudflare Workers AI binding."},503);

  const courseContext=[
    "Selected language: "+language,
    "Learner level: "+level,
    "Learning goal: "+goal,
    "Requested teaching action: "+action,
    currentLesson?"Current lesson: "+currentLesson:"",
    "Completed lesson titles: "+(progress.length?progress.join("; "):"None recorded yet"),
    "Remember: the learner is a student. Keep lessons age-appropriate and beginner-friendly unless their selected level says otherwise."
  ].filter(Boolean).join("\n");

  try {
    const result=await env.AI.run("@cf/zai-org/glm-4.7-flash",{
      messages:[
        {role:"system",content:TUTOR_PROMPT+"\n\nCOURSE CONTEXT:\n"+courseContext},
        ...messages
      ],
      max_completion_tokens:2600,
      chat_template_kwargs:{enable_thinking:false},
      temperature:0.3
    });
    const raw=parseJson(readText(result));
    if(!raw||typeof raw.reply!=="string"||!raw.reply.trim()) return json({error:"The tutor returned an incomplete lesson. Please try again."},502);

    const code=raw.codeExample&&typeof raw.codeExample==="object"?{
      language:clean(raw.codeExample.language,language,40),
      code:clean(raw.codeExample.code,"",5000),
      explanation:clean(raw.codeExample.explanation,"",800)
    }:null;
    const exercise=raw.exercise&&typeof raw.exercise==="object"?{
      prompt:clean(raw.exercise.prompt,"",900),
      starterCode:clean(raw.exercise.starterCode,"",2600)
    }:null;
    const fallbackLessonTitle=action==="start" ? language+" fundamentals" : action==="next" ? (currentLesson?"Next lesson after "+currentLesson:language+" next lesson") : action==="lesson" ? (currentLesson||language+" lesson") : "";
    return json({
      reply:clean(raw.reply,"",5200),
      lessonTitle:clean(raw.lessonTitle,fallbackLessonTitle,120),
      topic:clean(raw.topic,"",120),
      codeExample:code&&code.code?code:null,
      exercise:exercise&&exercise.prompt?exercise:null,
      feedback:clean(raw.feedback,"",1000),
      nextTopic:clean(raw.nextTopic,"",120),
      lessonReady:raw.lessonReady===true,
      language,
      level,
      model:"Cloudflare Workers AI · MIDCRUSH AI Programming Tutor"
    });
  } catch(error) {
    const message=String(error?.message||error||"Unknown error");
    console.error("MIDCRUSH programming tutor error:",message);
    if(/3036|10,000 neurons|daily free allocation/i.test(message)) return json({error:"The free daily Cloudflare AI allowance has been used up. It resets at 00:00 UTC."},429);
    if(/3040|out of capacity|capacity/i.test(message)) return json({error:"The AI service is busy right now. Try again shortly."},503);
    if(/3007|3008|timeout|timed out|deadline/i.test(message)) return json({error:"The tutor timed out. Try again with a shorter question or code sample."},504);
    if(/5035|workers paid plan/i.test(message)) return json({error:"Cloudflare says this AI model requires a paid Workers plan."},403);
    if(/3042|no such model|model.*not found|invalid model/i.test(message)) return json({error:"Cloudflare could not find the configured tutor AI model."},502);
    return json({error:"The programming tutor is temporarily unavailable. Please try again."},502);
  }
}
