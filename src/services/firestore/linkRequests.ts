import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeStudentCode } from "@/services/firestore/students";
import { writeAuditLog } from "@/services/firestore/auditLog";
import { normalizeEmail } from "@/utils/email";
import type { DeclaredChildInput, LinkRequestDoc } from "@/types/user";

export type LinkRequest = LinkRequestDoc & { id: string };

export interface LinkRequestInput {
  parentName: string;
  phone: string;
  address?: string;
  facebookUrl?: string;
  relationship: string;
  children: DeclaredChildInput[];
}

/** Moi con mot quyet dinh - Admin hoac gan vao ho so co san, hoac tao ho so moi. */
export type ChildDecision =
  | { mode: "existing"; studentId: string }
  | { mode: "new"; studentCode: string };

const MAX_CHILDREN = 5;

/**
 * Phu huynh gui yeu cau, hoac gui lai sau khi bi tu choi.
 * Doc id = uid nen goi hai lan khong de ra hai ban ghi - ghi de len chinh no.
 * `existing` la ban ghi dang co (neu gui lai), truyen vao de giu nguyen createdAt
 * ma khong ton them mot lan doc.
 */
export async function createLinkRequest(user: User, input: LinkRequestInput, existing?: LinkRequest): Promise<void> {
  if (!user.email) throw new Error("missing_email");
  if (!input.children.length) throw new Error("no_children");
  if (input.children.length > MAX_CHILDREN) throw new Error("too_many_children");

  await setDoc(doc(db, COLLECTIONS.LINK_REQUESTS, user.uid), {
    email: normalizeEmail(user.email),
    parentName: input.parentName,
    phone: input.phone,
    address: input.address ?? "",
    facebookUrl: input.facebookUrl ?? "",
    relationship: input.relationship,
    children: input.children,
    status: "pending",
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Man phu huynh theo doi trang thai - duyet xong la tu lat, khong can nut lam moi. */
export function subscribeMyLinkRequest(uid: string, callback: (request: LinkRequest | null) => void): Unsubscribe {
  return onSnapshot(doc(db, COLLECTIONS.LINK_REQUESTS, uid), (snapshot) => {
    callback(snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as LinkRequestDoc) }) : null);
  });
}

export async function listPendingLinkRequests(pageSize = 50): Promise<LinkRequest[]> {
  // Chi loc theo status, KHONG orderBy: ghep where + orderBy khac field se doi
  // mot composite index rieng cho link_requests. So yeu cau cho duyet luon nho
  // (chan boi pageSize) nen sap xep o client re hon nhieu so voi nuoi mot index.
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.LINK_REQUESTS),
    where("status", "==", "pending"),
    limit(pageSize),
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...(item.data() as LinkRequestDoc) }))
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
}

/**
 * Duyet yeu cau bang MOT writeBatch: hoac thanh cong het, hoac fail het.
 * Day chinh la thu con thieu o bug C1 - ba lenh ghi doc lap khong co buoc bu tru.
 */
export async function approveLinkRequest(actor: User, request: LinkRequest, decisions: ChildDecision[]): Promise<void> {
  // Chan duyet nua voi o tang service, khong chi o UI: thieu mot quyet dinh la
  // users.studentIds se thieu mot ma, va khong co gi bao cho ai biet.
  if (decisions.length !== request.children.length) throw new Error("decision_count_mismatch");

  const studentIds = decisions.map((decision) =>
    decision.mode === "existing" ? decision.studentId : normalizeStudentCode(decision.studentCode));
  if (new Set(studentIds).size !== studentIds.length) throw new Error("duplicate_student");

  const batch = writeBatch(db);

  batch.set(doc(db, COLLECTIONS.USERS, request.id), {
    email: request.email,
    displayName: request.parentName,
    photoURL: null,
    role: "viewer",
    studentIds,
    status: "active",
    phone: request.phone,
    address: request.address ?? "",
    facebookUrl: request.facebookUrl ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  decisions.forEach((decision, index) => {
    const child = request.children[index];
    if (decision.mode === "existing") {
      batch.update(doc(db, COLLECTIONS.STUDENTS, decision.studentId), {
        parentUids: arrayUnion(request.id),
        updatedAt: serverTimestamp(),
      });
      return;
    }
    const id = normalizeStudentCode(decision.studentCode);
    batch.set(doc(db, COLLECTIONS.STUDENTS, id), {
      studentCode: id,
      fullName: child.fullName,
      nickname: child.nickname ?? "",
      dateOfBirth: child.dateOfBirth,
      parentUids: [request.id],
      currentClassIds: [],
      teacherIds: [],
      staffNote: child.note ?? "",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  batch.update(doc(db, COLLECTIONS.LINK_REQUESTS, request.id), {
    status: "approved",
    reviewedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  // Ngoai batch: writeAuditLog tu nuot loi (A26), ghi log that bai khong duoc
  // lam hong mot lan duyet da commit thanh cong.
  await writeAuditLog(actor, "link_request_approved", "user", request.id, {
    studentIds: studentIds.join(","),
    childCount: String(decisions.length),
  });
}

export async function rejectLinkRequest(actor: User, uid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.LINK_REQUESTS, uid), {
    status: "rejected",
    rejectReason: reason,
    reviewedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog(actor, "link_request_rejected", "user", uid, { reason });
}
