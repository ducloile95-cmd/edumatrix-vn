import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeEmail } from "@/utils/email";
import { writeAuditLog } from "@/services/firestore/auditLog";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import type { InviteDoc, UserDoc, UserRole, UserStatus } from "@/types/user";
import type { StudentDoc } from "@/types/academic";
import { decodeUserDoc } from "@/services/firestore/decoders";
import { assertDeletionAllowed } from "@/services/firestore/deletionDependencies";
import { listAllQueryDocuments } from "@/services/firestore/pagination";

export type ClaimFailureReason = "email_not_verified" | "no_invite" | "error";

export type ClaimResult = { claimed: true } | { claimed: false; reason: ClaimFailureReason };

export interface ParentProfileInput {
  displayName?: string;
  address?: string;
  phone?: string;
  facebookUrl?: string;
}

export interface UpdateUserAccountInput {
  displayName: string;
  role: UserRole;
  status: UserStatus;
  studentIds: string[];
}

/**
 * Thu claim tai khoan dua tren invite dang active (A16.4, Section 7).
 * Role/studentIds luon lay tu invite - nguoi dung khong duoc tu chon.
 * Batch 2 thao tac: tao users/{uid} + danh dau invites/{email} = claimed,
 * dong bo voi Firestore Rules (firebase/firestore.rules match /users/{uid}).
 */
export async function attemptClaimInvite(firebaseUser: User): Promise<ClaimResult> {
  if (!firebaseUser.email) {
    return { claimed: false, reason: "no_invite" };
  }
  if (!firebaseUser.emailVerified) {
    return { claimed: false, reason: "email_not_verified" };
  }

  const email = normalizeEmail(firebaseUser.email);
  const inviteRef = doc(db, COLLECTIONS.INVITES, email);

  try {
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      return { claimed: false, reason: "no_invite" };
    }
    const invite = inviteSnap.data() as InviteDoc;
    if (invite.status !== "active") {
      return { claimed: false, reason: "no_invite" };
    }

    const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
    const batch = writeBatch(db);

    batch.set(userRef, {
      email,
      displayName: firebaseUser.displayName ?? email,
      photoURL: firebaseUser.photoURL ?? null,
      role: invite.role,
      studentIds: invite.studentIds,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(inviteRef, {
      status: "claimed",
      claimedAt: serverTimestamp(),
    });

    await batch.commit();
    return { claimed: true };
  } catch (err) {
    console.error("attemptClaimInvite failed", err);
    return { claimed: false, reason: "error" };
  }
}

export async function listUsers(): Promise<(UserDoc & { uid: string })[]> {
  const documents = await listAllQueryDocuments(
    COLLECTIONS.USERS,
    [orderBy("createdAt", "desc")],
    100,
  );
  return documents.map((d) => ({
    uid: d.id,
    ...decodeUserDoc(d.data(), `${COLLECTIONS.USERS}/${d.id}`),
  }));
}

export async function listUsersByIds(uids: string[]): Promise<(UserDoc & { uid: string })[]> {
  const uniqueIds = [...new Set(uids)].filter(Boolean);
  const groups: (UserDoc & { uid: string })[][] = [];

  for (let offset = 0; offset < uniqueIds.length; offset += 30) {
    const chunk = uniqueIds.slice(offset, offset + 30);
    if (chunk.length === 0) continue;
    const snap = await getDocs(query(collection(db, COLLECTIONS.USERS), where(documentId(), "in", chunk)));
    groups.push(snap.docs.map((d) => ({
      uid: d.id,
      ...decodeUserDoc(d.data(), `${COLLECTIONS.USERS}/${d.id}`),
    })));
  }

  return groups.flat();
}

/** Giao vien khong duoc quet toan bo users (rules): danh ba nhan su + phu huynh cua hoc sinh minh phu trach. */
export async function listTeacherVisibleUsers(parentUids: string[]): Promise<(UserDoc & { uid: string })[]> {
  const [staffSnap, parents] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.USERS), where("role", "in", ["admin", "teacher"]))),
    listUsersByIds(parentUids),
  ]);
  const staff = staffSnap.docs.map((d) => ({ uid: d.id, ...decodeUserDoc(d.data(), `${COLLECTIONS.USERS}/${d.id}`) }));
  return [...new Map([...staff, ...parents].map((user) => [user.uid, user])).values()];
}

export async function updateParentProfile(uid: string, input: ParentProfileInput): Promise<void> {
  const payload: Record<string, string | ReturnType<typeof serverTimestamp>> = {
    updatedAt: serverTimestamp(),
  };
  if (input.displayName !== undefined) payload.displayName = input.displayName;
  if (input.address !== undefined) payload.address = input.address;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.facebookUrl !== undefined) payload.facebookUrl = input.facebookUrl;
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), payload);
}

export function subscribeUsers(
  onData: (users: (UserDoc & { uid: string })[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTIONS.USERS), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((entry) => ({
      uid: entry.id,
      ...decodeUserDoc(entry.data(), `${COLLECTIONS.USERS}/${entry.id}`),
    })));
  }, (error) => onError?.(error));
}

export async function updateUserAccount(actor: User, uid: string, input: UpdateUserAccountInput): Promise<void> {
  const nextStudentIds = [...new Set(input.studentIds)].filter(Boolean).sort();
  if (input.role !== "viewer" && nextStudentIds.length > 0) throw new Error("NON_VIEWER_CANNOT_LINK_STUDENTS");

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error("USER_NOT_FOUND");
    const currentUser = userSnap.data() as UserDoc;
    const affectedStudentIds = [...new Set([...currentUser.studentIds, ...nextStudentIds])];
    const studentSnaps = await Promise.all(
      affectedStudentIds.map((studentId) => transaction.get(doc(db, COLLECTIONS.STUDENTS, studentId))),
    );
    if (studentSnaps.some((studentSnap) => !studentSnap.exists() && nextStudentIds.includes(studentSnap.id))) {
      throw new Error("STUDENT_NOT_FOUND");
    }

    transaction.update(userRef, {
      displayName: input.displayName.trim(),
      role: input.role,
      status: input.status,
      studentIds: nextStudentIds,
      updatedAt: serverTimestamp(),
    });
    studentSnaps.forEach((studentSnap) => {
      if (!studentSnap.exists()) return;
      const student = studentSnap.data() as StudentDoc;
      const parentUids = nextStudentIds.includes(studentSnap.id)
        ? [...new Set([...student.parentUids, uid])]
        : student.parentUids.filter((parentUid) => parentUid !== uid);
      transaction.update(studentSnap.ref, { parentUids, updatedAt: serverTimestamp() });
    });
  });
  await writeAuditLog(actor, "user_account_updated", "user", uid, {
    role: input.role,
    status: input.status,
    studentCount: String(input.studentIds.length),
  });
}

export async function deleteUserAccount(actor: User, uid: string): Promise<void> {
  if (actor.uid === uid) throw new Error("USER_SELF_DELETE_NOT_ALLOWED");
  // shortcut: kiem tra phu thuoc chay ngoai transaction (dem khong lam trong transaction duoc), con mot khe nho neu ban ghi lien quan duoc tao giua chung; chi Admin xoa. Nang len neu xuat hien tham chieu treo.
  await assertDeletionAllowed("user", uid);

  const deletedUser = await runTransaction(db, async (transaction) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error("USER_NOT_FOUND");
    const currentUser = userSnap.data() as UserDoc;

    transaction.delete(userRef);
    return currentUser;
  });
  await writeAuditLog(actor, "user_account_deleted", "user", uid, {
    role: deletedUser.role,
    email: deletedUser.email,
  });
}

/**
 * Ghi lai lan dang nhap gan nhat cua chinh minh - goi tu AuthContext moi phien
 * dang nhap (A16: chi duoc tu sua field cua rieng minh, xem firestore.rules
 * users/{uid} allow update). Loi khong throw ra ngoai - khong duoc chan luong
 * dang nhap chi vi ghi lastLoginAt that bai.
 */
export async function touchLastLogin(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("touchLastLogin failed", err);
  }
}

/** Cap nhat tuy chon thong bao cua chinh minh (Settings > Thong bao). */
export async function updateNotificationPrefs(uid: string, prefs: Record<string, boolean>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    notificationPrefs: prefs,
    updatedAt: serverTimestamp(),
  });
}

/** Danh sach tai khoan active theo role - dung de chon Giao vien khi tao/sua lop (Phase 3). */
export async function listUsersByRole(role: UserRole): Promise<(UserDoc & { uid: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser) return [];

  if (!isAdminUser(currentUser) && (!isTeacherUser(currentUser) || role === "admin")) return [];
  if (isTeacherUser(currentUser)) return role === "teacher" ? [currentUser] : [];

  const documents = await listAllQueryDocuments(
    COLLECTIONS.USERS,
    [where("role", "==", role), where("status", "==", "active")],
    50,
  );
  return documents.map((d) => ({
    uid: d.id,
    ...decodeUserDoc(d.data(), `${COLLECTIONS.USERS}/${d.id}`),
  }));
}
