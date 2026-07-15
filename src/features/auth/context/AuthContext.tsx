import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/services/firebase/authClient";
import { COLLECTIONS } from "@/constants/collections";
import type { UserDoc } from "@/types/user";
import { AuthContext, type AuthContextValue } from "@/features/auth/context/auth-context-value";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimFailureReason, setClaimFailureReason] = useState<
    AuthContextValue["claimFailureReason"]
  >(null);
  const claimAttemptedForUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthResolved(true);
      if (!user) {
        setUserDoc(null);
        setProfileResolved(true);
        claimAttemptedForUid.current = null;
        setClaimFailureReason(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    setProfileResolved(false);
    // Realtime o day la chap nhan duoc: chi 1 document, can phan quyen
    // (role/status) cap nhat ngay lap tuc khi Admin khoa tai khoan (A14).
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    Promise.all([import("firebase/firestore"), import("@/services/firebase/firestoreClient")])
      .then(([{ doc, onSnapshot }, { db }]) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(db, COLLECTIONS.USERS, firebaseUser.uid),
          (snapshot) => {
            setUserDoc(snapshot.exists() ? (snapshot.data() as UserDoc) : null);
            setProfileResolved(true);
          },
          () => {
            setUserDoc(null);
            setProfileResolved(true);
          },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setUserDoc(null);
        setProfileResolved(true);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [firebaseUser]);

  // Tu dong thu claim invite khi dang nhap Google lan dau nhung chua co
  // users/{uid} - moi uid chi thu 1 lan de tranh vong lap (Section 7.1).
  useEffect(() => {
    if (!firebaseUser || !profileResolved || userDoc) return;
    if (claimAttemptedForUid.current === firebaseUser.uid) return;

    claimAttemptedForUid.current = firebaseUser.uid;
    setClaiming(true);
    setClaimFailureReason(null);

    let cancelled = false;

    import("@/services/firestore/users")
      .then(({ attemptClaimInvite }) => attemptClaimInvite(firebaseUser))
      .then((result) => {
        if (cancelled) return;
        setClaiming(false);
        if (!result.claimed) {
          setClaimFailureReason(result.reason);
        }
        // Neu claimed thanh cong, onSnapshot users/{uid} o effect tren se tu
        // dong nhan doc moi va cap nhat userDoc - khong can setUserDoc thu cong.
      })
      .catch(() => {
        if (cancelled) return;
        setClaiming(false);
        setClaimFailureReason("error");
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, profileResolved, userDoc]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userDoc,
        loading: !authResolved || !profileResolved,
        claiming,
        claimFailureReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
