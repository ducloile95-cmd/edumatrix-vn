import { describe, expect, test } from "vitest";
import worker, { buildMessengerPayload, extractBearer, extractReferralLinks, isMessengerTagShape, verifyMetaSignature, type Env } from "../src/index";
const env={FIREBASE_PROJECT_ID:"project",FIREBASE_CLIENT_EMAIL:"email",FIREBASE_PRIVATE_KEY:"key",META_PAGE_ACCESS_TOKEN:"token",META_APP_SECRET:"app-secret",META_WEBHOOK_VERIFY_TOKEN:"verify-me",META_GRAPH_VERSION:"v22.0",ALLOWED_ORIGIN:"http://localhost:5173"}satisfies Env;
describe("messenger worker",()=>{
test("extracts bearer",()=>expect(extractBearer("Bearer abc.def")).toBe("abc.def"));test("rejects malformed bearer",()=>expect(extractBearer("Basic abc")).toBeNull());
test("accepts valid HMAC",async()=>{const raw="{\"object\":\"page\"}";const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.META_APP_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const bytes=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));const signature="sha256="+[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,"0")).join("");expect(await verifyMetaSignature(raw,signature,env.META_APP_SECRET)).toBe(true)});
test("rejects invalid HMAC",async()=>expect(await verifyMetaSignature("{}","sha256=bad",env.META_APP_SECRET)).toBe(false));
test("extracts referral",()=>expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"},recipient:{id:"page"},referral:{ref:"uid"}}]}]})).toEqual([{uid:"uid",psid:"psid",pageId:"page"}]));test("ignores missing referral",()=>expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"}}]}]})).toEqual([]));
test("builds response payload by default",()=>expect(buildMessengerPayload({recipientPsid:"psid",text:"Xin chao"})).toEqual({recipient:{id:"psid"},messaging_type:"RESPONSE",message:{text:"Xin chao"}}));
test("builds tagged payload for outside-window sends",()=>expect(buildMessengerPayload({recipientPsid:"psid",text:"Cap nhat tai khoan",tag:"ACCOUNT_UPDATE"})).toEqual({recipient:{id:"psid"},messaging_type:"MESSAGE_TAG",tag:"ACCOUNT_UPDATE",message:{text:"Cap nhat tai khoan"}}));
test("validates message tag shape locally",()=>{expect(isMessengerTagShape("ACCOUNT_UPDATE")).toBe(true);expect(isMessengerTagShape("bad tag")).toBe(false);expect(isMessengerTagShape("")).toBe(false)});
test("health check",async()=>expect(await(await worker.fetch(new Request("https://worker/health"),env)).json()).toEqual({ok:true}));
test("webhook challenge",async()=>expect(await(await worker.fetch(new Request("https://worker/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123"),env)).text()).toBe("123"));
test("rejects wrong verify token",async()=>expect((await worker.fetch(new Request("https://worker/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"),env)).status).toBe(403));
test("send requires auth",async()=>expect((await worker.fetch(new Request("https://worker/api/messenger/send",{method:"POST"}),env)).status).toBe(401));
test("post requires auth",async()=>expect((await worker.fetch(new Request("https://worker/api/messenger/post",{method:"POST"}),env)).status).toBe(401));});
