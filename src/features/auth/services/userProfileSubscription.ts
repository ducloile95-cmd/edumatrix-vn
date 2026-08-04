import { doc, onSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { setCachedUserDoc } from "@/services/firestore/authz";
import type { UserDoc } from "@/types/user";

export function subscribeToUserProfile(
  uid: string,
  onProfile: (profile: UserDoc | null) => void,
  onError: () => void,
) {
  return onSnapshot(
    doc(db, COLLECTIONS.USERS, uid),
    (snapshot) => {
      const profile = snapshot.exists() ? (snapshot.data() as UserDoc) : null;
      setCachedUserDoc(profile ? { uid, ...profile } : null);
      onProfile(profile);
    },
    () => {
      setCachedUserDoc(null);
      onError();
    },
  );
}
