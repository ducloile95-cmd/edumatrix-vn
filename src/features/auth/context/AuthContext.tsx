import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import type { UserDoc } from "@/types/user";

interface AuthContextValue {
  firebaseUser: User | null;
  userDoc: UserDoc | null;
  /** true = dang cho Firebase Auth hoac users/{uid} lan dau. */
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthResolved(true);
      if (!user) {
        setUserDoc(null);
        setProfileResolved(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    setProfileResolved(false);
    // Realtime o day la chap nhan duoc: chi 1 document, can phan quyen
    // (role/status) cap nhat ngay lap tuc khi Admin khoa tai khoan (A14).
    const unsubscribe = onSnapshot(
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
    return unsubscribe;
  }, [firebaseUser]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userDoc,
        loading: !authResolved || !profileResolved,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
