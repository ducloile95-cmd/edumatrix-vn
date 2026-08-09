import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeStudentCode } from "@/services/firestore/students";
import { writeAuditLog } from "@/services/firestore/auditLog";
import { normalizeEmail } from "@/utils/email";
import type { DeclaredChildInput, LinkRequestDoc, UserDoc } from "@/types/user";
import type { StudentDoc } from "@/types/academic";
import { listAllQueryDocuments } from "@/services/firestore/pagination";

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
  const documents = await listAllQueryDocuments(
    COLLECTIONS.LINK_REQUESTS,
    [where("status", "==", "pending")],
    pageSize,
  );
  return documents
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

  let studentIds = decisions.map((decision) =>
    decision.mode === "existing" ? decision.studentId : normalizeStudentCode(decision.studentCode));
  if (new Set(studentIds).size !== studentIds.length) throw new Error("duplicate_student");

  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, COLLECTIONS.LINK_REQUESTS, request.id);
    const userRef = doc(db, COLLECTIONS.USERS, request.id);
    const [requestSnap, userSnap] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(userRef),
    ]);
    if (!requestSnap.exists()) throw new Error("LINK_REQUEST_NOT_FOUND");
    const currentRequest = requestSnap.data() as LinkRequestDoc;
    if (currentRequest.status !== "pending") throw new Error("LINK_REQUEST_ALREADY_REVIEWED");
    if (decisions.length !== currentRequest.children.length) throw new Error("decision_count_mismatch");

    studentIds = decisions.map((decision) =>
      decision.mode === "existing" ? decision.studentId : normalizeStudentCode(decision.studentCode));
    if (new Set(studentIds).size !== studentIds.length) throw new Error("duplicate_student");
    const studentRefs = studentIds.map((studentId) => doc(db, COLLECTIONS.STUDENTS, studentId));
    const studentSnaps = await Promise.all(studentRefs.map((studentRef) => transaction.get(studentRef)));
    decisions.forEach((decision, index) => {
      if (decision.mode === "existing" && !studentSnaps[index].exists()) throw new Error("STUDENT_NOT_FOUND");
      if (decision.mode === "new" && studentSnaps[index].exists()) throw new Error("STUDENT_ALREADY_EXISTS");
    });

    if (userSnap.exists()) {
      const currentUser = userSnap.data() as UserDoc;
      if (currentUser.role !== "viewer") throw new Error("USER_ROLE_INVALID");
      transaction.update(userRef, {
        email: currentRequest.email,
        displayName: currentRequest.parentName,
        studentIds: [...new Set([...currentUser.studentIds, ...studentIds])],
        status: "active",
        phone: currentRequest.phone,
        address: currentRequest.address ?? "",
        facebookUrl: currentRequest.facebookUrl ?? "",
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(userRef, {
        email: currentRequest.email,
        displayName: currentRequest.parentName,
        photoURL: null,
        role: "viewer",
        studentIds,
        status: "active",
        phone: currentRequest.phone,
        address: currentRequest.address ?? "",
        facebookUrl: currentRequest.facebookUrl ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    decisions.forEach((decision, index) => {
      const child = currentRequest.children[index];
      const studentRef = studentRefs[index];
      if (decision.mode === "existing") {
        const student = studentSnaps[index].data() as StudentDoc;
        transaction.update(studentRef, {
          parentUids: [...new Set([...student.parentUids, request.id])],
          updatedAt: serverTimestamp(),
        });
      } else {
        const id = studentIds[index];
        transaction.set(studentRef, {
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
      }
    });
    transaction.update(requestRef, {
      status: "approved",
      reviewedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
  });
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
