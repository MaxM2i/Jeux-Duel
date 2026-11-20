/**
 * API Drôle de Quizz — les clés privées ne sont utilisées que côté serveur.
 * Les routes sont limitées en débit. Ajouter l'auth JWT Supabase et les quotas
 * par joueur avant toute ouverture publique.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import OpenAI from "openai";

const app=express();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:12*1024*1024}});
const openai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
app.use(helmet({crossOriginResourcePolicy:{policy:"cross-origin"}}));
app.use(cors({origin:(process.env.FRONTEND_ORIGIN||"").split(",").map(s=>s.trim()),methods:["GET","POST"]}));
app.use(express.json({limit:"1mb"}));
app.use("/api",rateLimit({windowMs:60_000,limit:30,standardHeaders:true,legacyHeaders:false}));
const env=k=>{if(!process.env[k])throw Error(`Variable serveur manquante : ${k}`);return process.env[k]};
app.get("/api/health",(_req,res)=>res.json({ok:true,service:"drole-de-quizz-api"}));

/** Génère un paquet JSON validé avant de l'envoyer au client. */
app.post("/api/ai/questions",async(req,res)=>{
 try{
  if(!openai)return res.status(503).json({error:"OPENAI_API_KEY non configurée."});
  const prompt=String(req.body.prompt||"").trim().slice(0,1200);
  const count=Math.max(5,Math.min(Number(process.env.MAX_AI_QUESTIONS||30),Number(req.body.count)||15));
  if(prompt.length<5)return res.status(400).json({error:"Décris un thème plus précisément."});
  const result=await openai.chat.completions.create({
   model:process.env.OPENAI_MODEL||"gpt-4o-mini",response_format:{type:"json_object"},temperature:.8,
   messages:[
    {role:"system",content:"Tu écris des quiz en français, amusants et factuellement fiables. Réponds en JSON avec une propriété questions. Chaque question doit avoir q (énoncé), opts (exactement 4 réponses distinctes), a (index entier 0 à 3), ex (explication courte). Pas de faits incertains."},
    {role:"user",content:`Crée ${count} questions sur : ${prompt}`}
   ]
  });
  const parsed=JSON.parse(result.choices[0]?.message?.content||"{}");
  const questions=(parsed.questions||[]).filter(q=>typeof q.q==="string"&&Array.isArray(q.opts)&&q.opts.length===4&&Number.isInteger(q.a)&&q.a>=0&&q.a<4).slice(0,count);
  if(questions.length<5)return res.status(502).json({error:"Pas assez de questions valides reçues du modèle."});
  res.json({questions});
 }catch(e){console.error("AI:",e);res.status(500).json({error:"La génération IA a échoué."})}
});

/** Clonage réservé à la voix du propriétaire ou à une voix expressément autorisée. */
app.post("/api/voice/clone",upload.single("audio"),async(req,res)=>{
 try{
  if(!req.file)return res.status(400).json({error:"Échantillon audio manquant."});
  const form=new FormData();
  form.append("name",`DroleDeQuizz-${Date.now()}`);
  form.append("files",new Blob([req.file.buffer],{type:req.file.mimetype}),req.file.originalname||"voice-sample.webm");
  form.append("description","Voix fournie avec consentement pour Drôle de Quizz.");
  const upstream=await fetch("https://api.elevenlabs.io/v1/voices/add",{method:"POST",headers:{"xi-api-key":env("ELEVENLABS_API_KEY")},body:form});
  const data=await upstream.json();
  if(!upstream.ok)return res.status(upstream.status).json({error:data.detail?.message||"Le fournisseur vocal a refusé l'échantillon."});
  res.json({voiceId:data.voice_id});
 }catch(e){console.error("Voice clone:",e);res.status(500).json({error:"Création de voix impossible. Vérifie le compte fournisseur et sa configuration."})}
});

/** Synthèse de l'énoncé avec l'identifiant vocal de l'hôte. */
app.post("/api/voice/speech",async(req,res)=>{
 try{
  const voiceId=String(req.body.voiceId||"").trim(),text=String(req.body.text||"").trim().slice(0,1500);
  if(!voiceId||!text)return res.status(400).json({error:"Texte ou identifiant vocal manquant."});
  const upstream=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,{
   method:"POST",headers:{"xi-api-key":env("ELEVENLABS_API_KEY"),"Content-Type":"application/json","Accept":"audio/mpeg"},
   body:JSON.stringify({text,model_id:process.env.ELEVENLABS_MODEL_ID||"eleven_multilingual_v2",voice_settings:{stability:.5,similarity_boost:.75}})
  });
  if(!upstream.ok)return res.status(upstream.status).json({error:"Synthèse vocale indisponible."});
  res.setHeader("Content-Type","audio/mpeg");res.setHeader("Cache-Control","no-store");
  res.send(Buffer.from(await upstream.arrayBuffer()));
 }catch(e){console.error("Voice speech:",e);res.status(500).json({error:"Lecture vocale impossible."})}
});
app.listen(Number(process.env.PORT||3000),()=>console.log("Drôle de Quizz API listening"));
