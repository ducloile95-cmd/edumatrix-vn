import { afterEach, describe, expect, test, vi } from "vitest";
import worker, { assertStudentScope, buildFeedPayload, buildMessengerPayload, corsHeaders, extractBearer, extractInboundMessages, extractReferralLinks, firebaseCertificates, isMessengerTagShape, markWebhookMessageProcessed, metaErrorCode, parseMessengerProfile, postGraph, publicErrorCode, referralClaimUid, referralTargetAllowed, resetFirebaseCachesForTest, sendGraph, serviceAccessToken, validPostImages, verifyMetaSignature, webhookMessageProcessed, type Env } from "../src/index";
const env={FIREBASE_PROJECT_ID:"project",FIREBASE_CLIENT_EMAIL:"email",FIREBASE_PRIVATE_KEY:"key",META_PAGE_ACCESS_TOKEN:"token",META_APP_SECRET:"app-secret",META_WEBHOOK_VERIFY_TOKEN:"verify-me",META_GRAPH_VERSION:"v22.0",ALLOWED_ORIGIN:"http://localhost:5173"}satisfies Env;
describe("messenger worker",()=>{
afterEach(()=>{vi.restoreAllMocks();resetFirebaseCachesForTest()});
test("extracts bearer",()=>expect(extractBearer("Bearer abc.def")).toBe("abc.def"));test("rejects malformed bearer",()=>expect(extractBearer("Basic abc")).toBeNull());
test("accepts valid HMAC",async()=>{const raw="{\"object\":\"page\"}";const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.META_APP_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const bytes=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));const signature="sha256="+[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,"0")).join("");expect(await verifyMetaSignature(raw,signature,env.META_APP_SECRET)).toBe(true)});
test("rejects invalid HMAC",async()=>expect(await verifyMetaSignature("{}","sha256=bad",env.META_APP_SECRET)).toBe(false));
test("extracts a referral nonce",()=>expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"},recipient:{id:"page"},referral:{ref:"abcdefghijklmnopqrstuv"}}]}]})).toEqual([{nonce:"abcdefghijklmnopqrstuv",psid:"psid",pageId:"page"}]));test("ignores missing or UID-shaped referral",()=>{expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"}}]}]})).toEqual([]);expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"},recipient:{id:"page"},referral:{ref:"uid"}}]}]})).toEqual([])});
test("claims only an active unused referral nonce without overwriting links",()=>{
  const future=new Date(Date.now()+60_000).toISOString();
  const past=new Date(Date.now()-60_000).toISOString();
  const nonce=(overrides:Record<string,unknown>={})=>({fields:{uid:{stringValue:"parent-1"},status:{stringValue:"active"},expiresAt:{timestampValue:future},usedAt:{nullValue:null},...overrides}});
  const connection=(psid:string)=>({fields:{facebookPsid:{stringValue:psid}}});
  const psidLink=(uid:string)=>({fields:{uid:{stringValue:uid}}});
  expect(referralClaimUid(nonce(),null,null,"psid-1")).toBe("parent-1");
  expect(referralClaimUid(null,null,null,"psid-1")).toBeNull();
  expect(referralClaimUid(nonce({expiresAt:{timestampValue:past}}),null,null,"psid-1")).toBeNull();
  expect(referralClaimUid(nonce({status:{stringValue:"used"}}),null,null,"psid-1")).toBeNull();
  expect(referralClaimUid(nonce({usedAt:{timestampValue:new Date().toISOString()}}),null,null,"psid-1")).toBeNull();
  expect(referralClaimUid(nonce(),connection("another-psid"),null,"psid-1")).toBeNull();
  expect(referralClaimUid(nonce(),null,psidLink("another-parent"),"psid-1")).toBeNull();
});
test("limits referral creation to the parent-student relation and teacher assignment",()=>{
  const context={studentId:"student-1",studentName:"Student",classId:"class-1",className:"Class",assignedTeacherIds:["teacher-1"]};
  expect(referralTargetAllowed({role:"admin"},"admin-1",["student-1"],"student-1",context)).toBe(true);
  expect(referralTargetAllowed({role:"teacher"},"teacher-1",["student-1"],"student-1",context)).toBe(true);
  expect(referralTargetAllowed({role:"teacher"},"teacher-other",["student-1"],"student-1",context)).toBe(false);
  expect(referralTargetAllowed({role:"admin"},"admin-1",["student-other"],"student-1",context)).toBe(false);
  expect(referralTargetAllowed({role:"admin"},"admin-1",["student-1"],"student-1",null)).toBe(false);
});
test("extracts inbound text messages",()=>expect(extractInboundMessages({entry:[{messaging:[{sender:{id:"psid"},recipient:{id:"page"},timestamp:123,message:{mid:"mid-1",text:" Xin chao "}}]}]})).toEqual([{psid:"psid",pageId:"page",timestamp:123,messageId:"mid-1",text:"Xin chao"}]));
test("parses Messenger account name and secure avatar",()=>{expect(parseMessengerProfile({first_name:"Le",last_name:"Loi",profile_pic:"https://cdn.example/avatar.jpg"})).toEqual({name:"Le Loi",avatarUrl:"https://cdn.example/avatar.jpg"});expect(parseMessengerProfile({first_name:"Le",profile_pic:"http://unsafe.example/avatar.jpg"})).toEqual({name:"Le",avatarUrl:null})});
test("ignores message echoes",()=>expect(extractInboundMessages({entry:[{messaging:[{sender:{id:"page"},recipient:{id:"psid"},message:{mid:"mid-2",text:"echo",is_echo:true}}]}]})).toEqual([]));
test("builds response payload by default",()=>expect(buildMessengerPayload({recipientPsid:"psid",text:"Xin chao"})).toEqual({recipient:{id:"psid"},messaging_type:"RESPONSE",message:{text:"Xin chao"}}));
test("builds tagged payload for outside-window sends",()=>expect(buildMessengerPayload({recipientPsid:"psid",text:"Cap nhat tai khoan",tag:"ACCOUNT_UPDATE"})).toEqual({recipient:{id:"psid"},messaging_type:"MESSAGE_TAG",tag:"ACCOUNT_UPDATE",message:{text:"Cap nhat tai khoan"}}));
test("allows only supported Messenger tags",()=>{expect(isMessengerTagShape("ACCOUNT_UPDATE")).toBe(true);expect(isMessengerTagShape("CONFIRMED_EVENT_UPDATE")).toBe(true);expect(isMessengerTagShape("POST_PURCHASE_UPDATE")).toBe(true);expect(isMessengerTagShape("HUMAN_AGENT")).toBe(false);expect(isMessengerTagShape("ARBITRARY_VALID_SHAPE")).toBe(false);expect(isMessengerTagShape("bad tag")).toBe(false)});
test("sends Messenger token in Authorization header, never the URL",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({message_id:"mid"}),{status:200,headers:{"content-type":"application/json"}}));
  await sendGraph({recipientPsid:"psid",text:"Xin chao"},env);
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).not.toContain("access_token");
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer token");
});
test("sends Page post token in Authorization header, never the URL",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>new Response(JSON.stringify({id:"post"}),{status:200,headers:{"content-type":"application/json"}}));
  await postGraph({message:"Thong bao",imageUrls:["https://cdn.example/photo.jpg"]},env);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  for (const [url,init] of fetchMock.mock.calls) {
    expect(String(url)).not.toContain("access_token");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer token");
  }
});
test("caches Firebase public certificates",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({kid:"certificate"}),{status:200,headers:{"cache-control":"public, max-age=3600","content-type":"application/json"}}));
  expect(await firebaseCertificates()).toEqual({kid:"certificate"});
  expect(await firebaseCertificates()).toEqual({kid:"certificate"});
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("caches Firebase service access token",async()=>{
  const keyPair=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
  const pkcs8=await crypto.subtle.exportKey("pkcs8",keyPair.privateKey);
  const base64=btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const privateKey=`-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;
  const tokenEnv={...env,FIREBASE_PRIVATE_KEY:privateKey};
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({access_token:"service-token",expires_in:3600}),{status:200,headers:{"content-type":"application/json"}}));
  expect(await serviceAccessToken(tokenEnv)).toBe("service-token");
  expect(await serviceAccessToken(tokenEnv)).toBe("service-token");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("marks a processed webhook message so retries are skipped",async()=>{
  let processed=false;
  vi.spyOn(globalThis,"fetch").mockImplementation(async(_url,init)=>{
    if (init?.method==="PATCH") { processed=true; return new Response("{}",{status:200}); }
    return processed
      ? new Response(JSON.stringify({fields:{messageId:{stringValue:"mid-1"}}}),{status:200,headers:{"content-type":"application/json"}})
      : new Response("{}",{status:404});
  });
  const message={psid:"psid",pageId:"page",text:"Xin chao",messageId:"mid-1",timestamp:123};
  expect(await webhookMessageProcessed(message.messageId,"service-token",env)).toBe(false);
  await markWebhookMessageProcessed(message,"service-token",env);
  expect(await webhookMessageProcessed(message.messageId,"service-token",env)).toBe(true);
});
test("allows admins and assigned teachers but rejects teachers outside student scope",async()=>{
  const context={studentId:"student-1",studentName:"Student",classId:"class-1",className:"Class",assignedTeacherIds:["teacher-1"]};
  await expect(assertStudentScope({role:"admin"},"admin-1",context)).resolves.toBeUndefined();
  await expect(assertStudentScope({role:"teacher"},"teacher-1",context)).resolves.toBeUndefined();
  await expect(assertStudentScope({role:"teacher"},"teacher-2",context)).rejects.toThrow("student_scope_denied");
  await expect(assertStudentScope({role:"teacher"},"teacher-1",null)).rejects.toThrow("student_not_found");
});
test("returns CORS only for the configured origin",()=>{
  expect(corsHeaders(env,new Request("https://worker/health",{headers:{origin:"http://localhost:5173"}}))["access-control-allow-origin"]).toBe("http://localhost:5173");
  expect(corsHeaders(env,new Request("https://worker/health",{headers:{origin:"https://evil.example"}}))["access-control-allow-origin"]).not.toBe("https://evil.example");
});
test("maps internal and Meta failures to stable public error codes",()=>{
  expect(publicErrorCode(new Error('meta_{"message":"Invalid OAuth","code":190}'))).toBe("meta_token_invalid");
  expect(publicErrorCode(new Error("meta_429"))).toBe("meta_request_failed");
  expect(publicErrorCode(new Error("student_scope_denied"))).toBe("student_scope_denied");
  expect(publicErrorCode(new Error("secret implementation detail"))).toBe("internal_error");
});
test("does not log or return the rejected Page token",async()=>{
  const secretToken="super-secret-page-value";
  const tokenEnv={...env,META_PAGE_ACCESS_TOKEN:secretToken};
  const warn=vi.spyOn(console,"warn").mockImplementation(()=>undefined);
  vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({error:{message:"Invalid OAuth access token",code:190}}),{status:400,headers:{"content-type":"application/json"}}));
  let failure:unknown;
  try { await sendGraph({recipientPsid:"psid",text:"Xin chao"},tokenEnv); } catch (error) { failure=error; }
  expect(publicErrorCode(failure)).toBe("meta_token_invalid");
  expect(JSON.stringify(warn.mock.calls)).not.toContain(secretToken);
});
test("health check exposes local service version",async()=>expect(await(await worker.fetch(new Request("https://worker/health"),env)).json()).toEqual({ok:true,service:"messenger-worker",version:"local",environment:"development"}));
test("health check exposes Cloudflare production version",async()=>{
  const productionEnv={...env,ALLOWED_ORIGIN:"https://edumatrix-vn-576b1.web.app",CF_VERSION_METADATA:{id:"version-123",tag:"",timestamp:"2026-07-27T00:00:00Z"}};
  await expect((await worker.fetch(new Request("https://worker/health"),productionEnv)).json()).resolves.toMatchObject({version:"version-123",environment:"production"});
});
test("webhook challenge",async()=>expect(await(await worker.fetch(new Request("https://worker/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123"),env)).text()).toBe("123"));
test("rejects wrong verify token",async()=>expect((await worker.fetch(new Request("https://worker/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"),env)).status).toBe(403));
test("send requires auth",async()=>expect((await worker.fetch(new Request("https://worker/api/messenger/send",{method:"POST"}),env)).status).toBe(401));
test("post requires auth",async()=>expect((await worker.fetch(new Request("https://worker/api/messenger/post",{method:"POST"}),env)).status).toBe(401));
test("validates post image urls",()=>{expect(validPostImages(undefined)).toBe(true);expect(validPostImages(["https://a/1.jpg","http://b/2.png"])).toBe(true);expect(validPostImages(["ftp://a/1.jpg"])).toBe(false);expect(validPostImages(["https://a/1.jpg","https://a/2.jpg","https://a/3.jpg","https://a/4.jpg","https://a/5.jpg"])).toBe(false);expect(validPostImages("https://a/1.jpg")).toBe(false)});
test("builds plain feed payload with link",()=>expect(buildFeedPayload({message:"Hi",link:"https://x.vn"},[])).toEqual({message:"Hi",link:"https://x.vn"}));
test("builds feed payload with attached media and folds link into message",()=>expect(buildFeedPayload({message:"Hi",link:"https://x.vn",imageUrls:["https://a/1.jpg","https://a/2.jpg"]},["ph1","ph2"])).toEqual({message:"Hi\nhttps://x.vn",attached_media:[{media_fbid:"ph1"},{media_fbid:"ph2"}]}));
test("serializes meta error objects so token code 190 stays diagnosable",()=>{expect(metaErrorCode({error:{message:"Invalid OAuth",code:190}},400)).toContain('"code":190');expect(metaErrorCode({error:"bad"},400)).toBe("bad");expect(metaErrorCode({},502)).toBe("502")});});
