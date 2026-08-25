import { afterEach, describe, expect, test, vi } from "vitest";
import worker, { assertStudentScope, buildMessengerPayload, buildUtilityPayload, checkMetaUtilityPermission, conversationTombstoneExpired, corsHeaders, deliveryEventEligible, deliveryEventTemplateKey, deliveryJobEligible, deliveryJobId, deliveryJobLeaseExpired, extractBearer, extractInboundMessages, extractReferralLinks, extractUtilityTemplateStatuses, firebaseCertificates, isMessengerTagShape, latestUtilityTemplateStatus, markWebhookMessageProcessed, META_OAUTH_SCOPES, META_UTILITY_OAUTH_SCOPE, META_UTILITY_WEBHOOK_FIELD, META_WEBHOOK_FIELDS, metaErrorCode, metaOAuthCompletionErrorMessage, metaOAuthErrorMessage, metaOAuthScopes, metaUtilityPermissionStatus, metaWebhookFields, nextUnreadStaffCount, normalizeMetaUtilityReason, oauthStateActive, parseMessengerProfile, publicErrorCode, referralClaimUid, referralTargetAllowed, resetFirebaseCachesForTest, safeConnectOrigin, sendGraph, serviceAccessToken, startDeleteChatConversation, subscribePageWebhooks, threadId, UTILITY_TEMPLATES, validChatThreadId, validUtilityParameters, verifyMetaSignature, webhookMessageProcessed, type Env } from "../src/index";
const env={FIREBASE_PROJECT_ID:"project",FIREBASE_CLIENT_EMAIL:"email",FIREBASE_PRIVATE_KEY:"key",META_APP_ID:"app-id",META_PAGE_ACCESS_TOKEN:"token",META_APP_SECRET:"app-secret",META_WEBHOOK_VERIFY_TOKEN:"verify-me",META_GRAPH_VERSION:"v25.0",META_PAGE_ID:"page-id",ALLOWED_ORIGIN:"http://localhost:5173"}satisfies Env;
describe("messenger worker",()=>{
afterEach(()=>{vi.restoreAllMocks();resetFirebaseCachesForTest()});
test("extracts bearer",()=>expect(extractBearer("Bearer abc.def")).toBe("abc.def"));test("rejects malformed bearer",()=>expect(extractBearer("Basic abc")).toBeNull());
test("accepts valid HMAC",async()=>{const raw="{\"object\":\"page\"}";const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.META_APP_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const bytes=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));const signature="sha256="+[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,"0")).join("");expect(await verifyMetaSignature(raw,signature,env.META_APP_SECRET)).toBe(true)});
test("rejects invalid HMAC",async()=>expect(await verifyMetaSignature("{}","sha256=bad",env.META_APP_SECRET)).toBe(false));
test("extracts a referral nonce",()=>expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"},recipient:{id:"page"},referral:{ref:"abcdefghijklmnopqrstuv"}}]}]})).toEqual([{nonce:"abcdefghijklmnopqrstuv",psid:"psid",pageId:"page"}]));test("ignores missing or UID-shaped referral",()=>{expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"}}]}]})).toEqual([]);expect(extractReferralLinks({entry:[{messaging:[{sender:{id:"psid"},recipient:{id:"page"},referral:{ref:"uid"}}]}]})).toEqual([])});
test("claims only an active unused referral nonce without overwriting links",()=>{
  const future=new Date(Date.now()+60_000).toISOString();
  const past=new Date(Date.now()-60_000).toISOString();
  const nonce=(overrides:Record<string,unknown>={})=>({fields:{parentUid:{stringValue:"parent-1"},studentId:{stringValue:"student-1"},status:{stringValue:"active"},expiresAt:{timestampValue:future},usedAt:{nullValue:null},...overrides}});
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
test("extracts utility template status updates without retaining the full payload",()=>expect(extractUtilityTemplateStatuses({entry:[{id:"page-1",time:123,changes:[{field:"message_template_status_update",value:{message_template_id:"template-1",message_template_name:"edumatrix_payment",message_template_status:"APPROVED",message_template_language:"vi",reason:"ok"}}]}]})).toEqual([{pageId:"page-1",templateId:"template-1",templateName:"edumatrix_payment",status:"APPROVED",language:"vi",reason:"ok",timestamp:123000}]));
test("does not expose Meta NONE as a rejection reason",()=>{
  expect(normalizeMetaUtilityReason("NONE")).toBeNull();
  expect(normalizeMetaUtilityReason("  ")).toBeNull();
  expect(normalizeMetaUtilityReason("Policy violation")).toBe("Policy violation");
});
test("ignores unrelated or incomplete template status changes",()=>expect(extractUtilityTemplateStatuses({entry:[{id:"page-1",changes:[{field:"feed",value:{name:"x"}},{field:"messenger_template_status_update",value:{status:"APPROVED"}}]}]})).toEqual([]));
test("uses only the latest template status for the configured Page and language",()=>{
  const template=UTILITY_TEMPLATES.tuition_payment_reminder;
  const statusDocument=(pageId:string,language:string,status:string,updatedAt:string)=>({fields:{
    pageId:{stringValue:pageId},templateName:{stringValue:template.metaName},language:{stringValue:language},
    status:{stringValue:status},updatedAt:{timestampValue:updatedAt},
  }});
  expect(latestUtilityTemplateStatus([
    statusDocument("page-1","vi","APPROVED","2026-08-24T08:00:00.000Z"),
    statusDocument("page-1","vi","PAUSED","2026-08-24T09:00:00.000Z"),
    statusDocument("page-2","vi","APPROVED","2026-08-24T10:00:00.000Z"),
    statusDocument("page-1","en","APPROVED","2026-08-24T11:00:00.000Z"),
  ],template,"page-1")).toBe("PAUSED");
  expect(latestUtilityTemplateStatus([],template,"page-1")).toBeNull();
});
test("parses Messenger account name and secure avatar",()=>{expect(parseMessengerProfile({first_name:"Le",last_name:"Loi",profile_pic:"https://cdn.example/avatar.jpg"})).toEqual({name:"Le Loi",avatarUrl:"https://cdn.example/avatar.jpg"});expect(parseMessengerProfile({first_name:"Le",profile_pic:"http://unsafe.example/avatar.jpg"})).toEqual({name:"Le",avatarUrl:null})});
test("ignores message echoes",()=>expect(extractInboundMessages({entry:[{messaging:[{sender:{id:"page"},recipient:{id:"psid"},message:{mid:"mid-2",text:"echo",is_echo:true}}]}]})).toEqual([]));
test("increments unread messages for inbound events and clears them for outbound events",()=>{const thread={fields:{unreadStaffCount:{integerValue:"2"}}};expect(nextUnreadStaffCount(thread,"inbound")).toBe(3);expect(nextUnreadStaffCount(thread,"outbound")).toBe(0)});
test("validates conversation ids before deletion",()=>{expect(validChatThreadId("messenger_thread-1")).toBe(true);expect(validChatThreadId("chat_threads/thread-1")).toBe(false);expect(validChatThreadId("")).toBe(false)});
test("expires only completed conversation tombstones after their retention date",()=>{
  const now=new Date("2026-08-25T05:00:00.000Z");
  const tombstone=(status:string,expiresAt:string)=>({fields:{status:{stringValue:status},expiresAt:{timestampValue:expiresAt}}});
  expect(conversationTombstoneExpired(tombstone("deleted","2026-08-25T04:59:59.000Z"),now)).toBe(true);
  expect(conversationTombstoneExpired(tombstone("deleted","2026-08-25T05:00:01.000Z"),now)).toBe(false);
  expect(conversationTombstoneExpired(tombstone("deleting","2026-08-25T04:59:59.000Z"),now)).toBe(false);
});
test("keeps separate stable threads for each parent and student context",()=>{
  expect(threadId("parent-1","student-1")).toBe("messenger_parent-1_student-1");
  expect(threadId("parent-1","student-2")).not.toBe(threadId("parent-1","student-1"));
  expect(threadId("parent-2","student-1")).not.toBe(threadId("parent-1","student-1"));
});
test("rejects expired OAuth state for the expected admin",()=>{
  const state=(expiresAt:string,uid="admin-1")=>({fields:{uid:{stringValue:uid},status:{stringValue:"ready"},expiresAt:{timestampValue:expiresAt}}});
  const now=new Date("2026-08-25T05:00:00.000Z");
  expect(oauthStateActive(state("2026-08-25T05:01:00.000Z"),"admin-1",now)).toBe(true);
  expect(oauthStateActive(state("2026-08-25T04:59:00.000Z"),"admin-1",now)).toBe(false);
  expect(oauthStateActive(state("2026-08-25T05:01:00.000Z","admin-2"),"admin-1",now)).toBe(false);
});
test("uses a stable delivery idempotency key and finite retry lease",()=>{
  expect(deliveryJobId("invoice_committed","invoice/1","2","parent-1")).toBe("invoice_committed:invoice_1:2:parent-1");
  const timestamp=(value:string)=>({timestampValue:value});
  const job=(status:string,attempts:number,nextAttemptAt:string,leaseUntil:string)=>({fields:{status:{stringValue:status},attempts:{integerValue:String(attempts)},nextAttemptAt:timestamp(nextAttemptAt),leaseUntil:timestamp(leaseUntil)}});
  const now=Date.parse("2026-08-25T05:00:00.000Z");
  expect(deliveryJobEligible(job("pending",0,"2026-08-25T04:59:00.000Z","2026-08-25T04:59:00.000Z"),now)).toBe(true);
  expect(deliveryJobEligible(job("processing",1,"2026-08-25T04:59:00.000Z","2026-08-25T05:01:00.000Z"),now)).toBe(false);
  expect(deliveryJobEligible(job("processing",1,"2026-08-25T04:59:00.000Z","2026-08-25T04:59:00.000Z"),now)).toBe(false);
  expect(deliveryJobLeaseExpired(job("processing",1,"2026-08-25T04:59:00.000Z","2026-08-25T04:59:00.000Z"),now)).toBe(true);
  expect(deliveryJobEligible(job("failed",3,"2026-08-25T04:59:00.000Z","2026-08-25T04:59:00.000Z"),now)).toBe(false);
});
test("maps the five business events to approved Utility templates",()=>{
  expect(deliveryEventTemplateKey("lesson_feedback_published")).toBe("lesson_feedback_request");
  expect(deliveryEventTemplateKey("invoice_committed")).toBe("tuition_payment_reminder");
  expect(deliveryEventTemplateKey("payment_verified")).toBe("tuition_payment_confirmation");
  expect(deliveryEventTemplateKey("enrollment_completed")).toBe("enrollment_confirmation");
  expect(deliveryEventTemplateKey("session_schedule_changed")).toBe("class_schedule_adjustment");
  expect(deliveryEventTemplateKey("unknown_event")).toBeNull();
  expect(deliveryEventTemplateKey("unknown")).toBeNull();
});
test("retries event expansion only while due, lease-expired, and below the attempt cap",()=>{
  const timestamp=(value:string)=>({timestampValue:value});
  const event=(status:string,attempts:number,nextAttemptAt:string,leaseUntil:string)=>({fields:{status:{stringValue:status},attempts:{integerValue:String(attempts)},nextAttemptAt:timestamp(nextAttemptAt),leaseUntil:timestamp(leaseUntil)}});
  const now=Date.parse("2026-08-25T05:00:00.000Z");
  expect(deliveryEventEligible(event("pending",0,"2026-08-25T04:59:00.000Z","2026-08-25T04:59:00.000Z"),now)).toBe(true);
  expect(deliveryEventEligible(event("processing",1,"2026-08-25T04:59:00.000Z","2026-08-25T04:59:00.000Z"),now)).toBe(true);
  expect(deliveryEventEligible(event("processing",1,"2026-08-25T04:59:00.000Z","2026-08-25T05:01:00.000Z"),now)).toBe(false);
  expect(deliveryEventEligible(event("failed",3,"2026-08-25T04:59:00.000Z","2026-08-25T04:59:00.000Z"),now)).toBe(false);
});
test("starts idempotent two-phase conversation deletion without touching messages",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({name:"projects/project/databases/(default)/documents/chat_threads/thread-1"}),{status:200}))
    .mockResolvedValueOnce(new Response("",{status:404}))
    .mockResolvedValueOnce(new Response(JSON.stringify({writeResults:[]}),{status:200}));
  await expect(startDeleteChatConversation("thread-1","admin-1","service-token",env)).resolves.toBeUndefined();
  const commitBody=JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
  expect(JSON.stringify(commitBody)).toContain("messenger_conversation_tombstones/thread-1");
  expect(JSON.stringify(commitBody)).toContain("deletionState");
  expect(JSON.stringify(commitBody)).not.toContain("/messages/");
  expect(JSON.stringify(commitBody)).not.toContain("messenger_psid_links");
  expect(JSON.stringify(commitBody)).not.toContain("messenger_connections");
});
test("builds response payload by default",()=>expect(buildMessengerPayload({recipientPsid:"psid",text:"Xin chao"})).toEqual({recipient:{id:"psid"},messaging_type:"RESPONSE",message:{text:"Xin chao"}}));
test("builds tagged payload for outside-window sends",()=>expect(buildMessengerPayload({recipientPsid:"psid",text:"Cap nhat tai khoan",tag:"ACCOUNT_UPDATE"})).toEqual({recipient:{id:"psid"},messaging_type:"MESSAGE_TAG",tag:"ACCOUNT_UPDATE",message:{text:"Cap nhat tai khoan"}}));
test("builds an allowlisted utility template payload",()=>{
  const body={recipientPsid:"psid",deliveryMode:"utility" as const,templateKey:"tuition_payment_confirmation" as const,parameters:{studentName:"Nguyen Van A",billingPeriod:"Thang 8",amount:"2.000.000 dong",paymentDate:"05/08/2026",paymentReference:"HP-001"}};
  expect(validUtilityParameters(body)).toBe(true);
  expect(buildUtilityPayload(body)).toEqual({
    recipient:{id:"psid"},
    messaging_type:"UTILITY",
    message:{template:{name:"edumatrix_tuition_payment_confirmation_v2_vi",language:{code:"vi"},components:[{type:"body",parameters:[
      {type:"text",text:"Nguyen Van A"},
      {type:"text",text:"Thang 8"},
      {type:"text",text:"2.000.000 dong"},
      {type:"text",text:"05/08/2026"},
      {type:"text",text:"HP-001"},
    ]}]}}
  });
});
test.each([
  ["class_schedule_adjustment","edumatrix_class_schedule_adjustment_v2_vi",{className:"Lop A1",studentName:"Nguyen Van A",lessonDate:"30/07/2026",lessonTime:"18:00",adjustmentNote:"Hoc bu ngay 02/08/2026"},["Lop A1","Nguyen Van A","30/07/2026","18:00","Hoc bu ngay 02/08/2026"]],
  ["lesson_feedback_request","edumatrix_lesson_feedback_notice_v2_vi",{className:"Lop A1",studentName:"Nguyen Van A",teacherName:"Co Nguyen Mai"},["Lop A1","Nguyen Van A","Co Nguyen Mai"]],
  ["enrollment_confirmation","edumatrix_enrollment_confirmation_v2_vi",{studentName:"Nguyen Van A",courseName:"Luyen chu dep",centerName:"EduMatrix"},["Nguyen Van A","Luyen chu dep","EduMatrix"]],
  ["parent_account_link_confirmation","edumatrix_parent_account_link_confirmation_v2_vi",{parentEmail:"phuhuynh@gmail.com",studentName:"Nguyen Van A"},["phuhuynh@gmail.com","Nguyen Van A"]],
] as const)("builds approved %s v2 payload in Meta parameter order",(templateKey,metaName,parameters,expectedTexts)=>{
  const payload=buildUtilityPayload({recipientPsid:"psid",deliveryMode:"utility",templateKey,parameters});
  expect(payload.message.template.name).toBe(metaName);
  expect(payload.message.template.components[0].parameters.map((parameter)=>parameter.text)).toEqual(expectedTexts);
});
test("builds the approved tuition reminder v2 payload in Meta parameter order",()=>{
  const body={recipientPsid:"psid",deliveryMode:"utility" as const,templateKey:"tuition_payment_reminder" as const,parameters:{studentName:"Nguyen Van A",billingPeriod:"Thang 8",amount:"2.000.000 dong",dueDate:"05/08/2026"}};
  expect(validUtilityParameters(body)).toBe(true);
  expect(buildUtilityPayload(body)).toEqual({
    recipient:{id:"psid"},
    messaging_type:"UTILITY",
    message:{template:{name:"edumatrix_tuition_payment_reminder_v2_vi",language:{code:"vi"},components:[{type:"body",parameters:[
      {type:"text",text:"Nguyen Van A"},
      {type:"text",text:"Thang 8"},
      {type:"text",text:"2.000.000 dong"},
      {type:"text",text:"05/08/2026"},
    ]}]}}
  });
});
test("rejects missing, extra, empty, and unknown utility parameters",()=>{
  expect(validUtilityParameters({deliveryMode:"utility",templateKey:"tuition_payment_reminder",parameters:{}})).toBe(false);
  expect(validUtilityParameters({deliveryMode:"utility",templateKey:"tuition_payment_reminder",parameters:{billingPeriod:"Thang 8",studentName:"A",amount:"2m",dueDate:"",extra:"x"}})).toBe(false);
  expect(validUtilityParameters({deliveryMode:"utility",templateKey:"not_real" as never,parameters:{}})).toBe(false);
});
test("allows only supported Messenger tags",()=>{expect(isMessengerTagShape("ACCOUNT_UPDATE")).toBe(true);expect(isMessengerTagShape("CONFIRMED_EVENT_UPDATE")).toBe(true);expect(isMessengerTagShape("POST_PURCHASE_UPDATE")).toBe(true);expect(isMessengerTagShape("HUMAN_AGENT")).toBe(false);expect(isMessengerTagShape("ARBITRARY_VALID_SHAPE")).toBe(false);expect(isMessengerTagShape("bad tag")).toBe(false)});
test("sends Messenger token in Authorization header, never the URL",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({message_id:"mid"}),{status:200,headers:{"content-type":"application/json"}}));
  await sendGraph({recipientPsid:"psid",text:"Xin chao"},env);
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://graph.facebook.com/v25.0/page-id/messages");
  expect(String(url)).not.toContain("access_token");
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer token");
});
test("automatic delivery treats an ambiguous Meta 5xx as unknown and never retries",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({error:{message:"temporary"}}),{status:500,headers:{"content-type":"application/json"}}));
  let failure:unknown;
  try { await sendGraph({recipientPsid:"psid",text:"Xin chao"},env,{retryTransient:false}); } catch (error) { failure=error; }
  expect(publicErrorCode(failure)).toBe("meta_delivery_outcome_unknown");
  expect(fetchMock).toHaveBeenCalledTimes(1);
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
test("never echoes a wildcard origin even if ALLOWED_ORIGIN is misconfigured to *",()=>{
  const wildcardEnv={...env,ALLOWED_ORIGIN:"*"}satisfies Env;
  expect(corsHeaders(wildcardEnv,new Request("https://worker/health",{headers:{origin:"https://evil.example"}}))["access-control-allow-origin"]).toBeUndefined();
  expect(corsHeaders(wildcardEnv)["access-control-allow-origin"]).toBeUndefined();
  const mixedEnv={...env,ALLOWED_ORIGIN:"*,https://edumatrix-vn-576b1.web.app"}satisfies Env;
  expect(corsHeaders(mixedEnv,new Request("https://worker/health",{headers:{origin:"https://evil.example"}}))["access-control-allow-origin"]).toBeUndefined();
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
test("health check exposes local service version",async()=>expect(await(await worker.fetch(new Request("https://worker/health"),env)).json()).toEqual({ok:true,service:"messenger-worker",version:"local",release:"local",environment:"development",utilityMessagingEnabled:false,utilityAutomationEnabled:false}));
test("health check exposes Cloudflare production version",async()=>{
  const productionEnv={...env,ALLOWED_ORIGIN:"https://edumatrix-vn-576b1.web.app",RELEASE_SHA:"07a1036",CF_VERSION_METADATA:{id:"version-123",tag:"",timestamp:"2026-07-27T00:00:00Z"}};
  await expect((await worker.fetch(new Request("https://worker/health"),productionEnv)).json()).resolves.toMatchObject({version:"version-123",release:"07a1036",environment:"production"});
});
test("webhook challenge",async()=>expect(await(await worker.fetch(new Request("https://worker/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123"),env)).text()).toBe("123"));
test("rejects wrong verify token",async()=>expect((await worker.fetch(new Request("https://worker/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"),env)).status).toBe(403));
test("send requires auth",async()=>expect((await worker.fetch(new Request("https://worker/api/messenger/send",{method:"POST"}),env)).status).toBe(401));
test("thread context sync requires auth",async()=>expect((await worker.fetch(new Request("https://worker/api/messenger/sync-contexts",{method:"POST"}),env)).status).toBe(401));
test("Page posting endpoint is not exposed",async()=>expect((await worker.fetch(new Request("https://worker/api/messenger/post",{method:"POST"}),env)).status).toBe(404));
test("Meta connect start requires auth",async()=>{
  const response=await worker.fetch(new Request("https://worker/api/meta/connect/start",{method:"POST",headers:{origin:"http://localhost:5173"}}),env);
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toMatchObject({error:"missing_bearer_token"});
});
test("rejects an OAuth origin outside the allowlist",()=>{
  expect(()=>safeConnectOrigin("https://evil.example",env)).toThrow("origin_not_allowed");
});
test("does not emit an allow-origin header for a disallowed origin",async()=>{
  const response=await worker.fetch(new Request("https://worker/api/messenger/send",{method:"OPTIONS",headers:{origin:"https://evil.example"}}),env);
  expect(response.status).toBe(204);
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
});
test("returns the matching secondary production origin for referrals",async()=>{
  const productionEnv={...env,ALLOWED_ORIGIN:"https://edumatrix-vn-576b1.web.app,https://edumatrix.id.vn"}satisfies Env;
  const response=await worker.fetch(new Request("https://worker/api/messenger/referral",{method:"POST",headers:{origin:"https://edumatrix.id.vn"}}),productionEnv);
  expect(response.status).toBe(401);
  expect(response.headers.get("access-control-allow-origin")).toBe("https://edumatrix.id.vn");
});
test("requests Utility permission only after its production flag is enabled",()=>{
  expect(META_OAUTH_SCOPES).toEqual(["pages_show_list","pages_manage_metadata","pages_messaging"]);
  expect(metaOAuthScopes(env)).toEqual(META_OAUTH_SCOPES);
  expect(metaOAuthScopes({...env,UTILITY_MESSAGING_ENABLED:"true"})).toEqual([...META_OAUTH_SCOPES,META_UTILITY_OAUTH_SCOPE]);
  expect(META_UTILITY_OAUTH_SCOPE).toBe("pages_utility_messaging");
});
test("subscribes to Utility template status updates only when Utility Messaging is enabled",()=>{
  expect(metaWebhookFields(env)).toEqual(META_WEBHOOK_FIELDS);
  expect(metaWebhookFields({...env,UTILITY_MESSAGING_ENABLED:"true"})).toEqual([...META_WEBHOOK_FIELDS,META_UTILITY_WEBHOOK_FIELD]);
  expect(META_UTILITY_WEBHOOK_FIELD).toBe("message_template_status_update");
});
test("recognizes granted, missing, and unknown Utility Messaging permission states",()=>{
  expect(metaUtilityPermissionStatus({data:[{permission:"pages_utility_messaging",status:"granted"}]})).toBe("granted");
  expect(metaUtilityPermissionStatus({data:[{permission:"page_utility_messaging",status:"granted"}]})).toBe("missing");
  expect(metaUtilityPermissionStatus({data:[{permission:"pages_messaging",status:"granted"}]})).toBe("missing");
  expect(metaUtilityPermissionStatus({error:"unavailable"})).toBe("unknown");
});
test("checks Utility permission without putting the access token in the URL",async()=>{
  const secretToken="utility-secret-token";
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({data:[{permission:"pages_utility_messaging",status:"declined"}]}),{status:200,headers:{"content-type":"application/json"}}));
  await expect(checkMetaUtilityPermission(secretToken,env)).resolves.toBe("missing");
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).not.toContain(secretToken);
  expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${secretToken}`);
});
test("subscribes and verifies required Page webhook fields without exposing the token",async()=>{
  const page={id:"page-id",name:"Page",access_token:"page-secret"};
  const fetchMock=vi.spyOn(globalThis,"fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({success:true}),{status:200,headers:{"content-type":"application/json"}}))
    .mockResolvedValueOnce(new Response(JSON.stringify({data:[{id:env.META_APP_ID,subscribed_fields:[...META_WEBHOOK_FIELDS]}]}),{status:200,headers:{"content-type":"application/json"}}));
  await expect(subscribePageWebhooks(page,env)).resolves.toEqual([...META_WEBHOOK_FIELDS]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  for(const [url,init] of fetchMock.mock.calls){
    expect(String(url)).not.toContain(page.access_token);
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${page.access_token}`);
  }
});
test("subscribes and verifies the Utility template status webhook when enabled",async()=>{
  const utilityEnv={...env,UTILITY_MESSAGING_ENABLED:"true"}satisfies Env;
  const requiredFields=[...META_WEBHOOK_FIELDS,META_UTILITY_WEBHOOK_FIELD];
  const fetchMock=vi.spyOn(globalThis,"fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({success:true}),{status:200,headers:{"content-type":"application/json"}}))
    .mockResolvedValueOnce(new Response(JSON.stringify({data:[{id:utilityEnv.META_APP_ID,subscribed_fields:requiredFields}]}),{status:200,headers:{"content-type":"application/json"}}));
  await expect(subscribePageWebhooks({id:"page-id",name:"Page",access_token:"secret"},utilityEnv)).resolves.toEqual(requiredFields);
  expect(String(fetchMock.mock.calls[0][0])).toContain("message_template_status_update");
});
test("rejects a Page webhook subscription that cannot be verified",async()=>{
  vi.spyOn(globalThis,"fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({success:true}),{status:200,headers:{"content-type":"application/json"}}))
    .mockResolvedValueOnce(new Response(JSON.stringify({data:[{id:env.META_APP_ID,subscribed_fields:["messages"]}]}),{status:200,headers:{"content-type":"application/json"}}));
  await expect(subscribePageWebhooks({id:"page-id",name:"Page",access_token:"secret"},env)).rejects.toThrow("meta_webhook_subscription_unverified");
});
test("maps Meta OAuth denial separately from app configuration failures",()=>{
  expect(metaOAuthErrorMessage("access_denied","user_denied")).toContain("chưa cấp quyền");
  expect(metaOAuthErrorMessage("temporarily_unavailable","")).toContain("trạng thái App");
  expect(metaOAuthCompletionErrorMessage("meta_no_managed_pages")).toContain("Không tìm thấy Fanpage");
  expect(metaOAuthCompletionErrorMessage("meta_oauth_exchange_failed")).toContain("thử lại");
});
test("serializes meta error objects so token code 190 stays diagnosable",()=>{expect(metaErrorCode({error:{message:"Invalid OAuth",code:190}},400)).toContain('"code":190');expect(metaErrorCode({error:"bad"},400)).toBe("bad");expect(metaErrorCode({},502)).toBe("502")});});
