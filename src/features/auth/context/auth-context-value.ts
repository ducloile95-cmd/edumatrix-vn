import { createContext } from "react";
import type { User } from "firebase/auth";
import type { ClaimFailureReason } from "@/services/firestore/users";
import type { UserDoc } from "@/types/user";

export interface AuthContextValue {
  firebaseUser: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  claiming: boolean;
  claimFailureReason: ClaimFailureReason | null;
}

export const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
  claiming: false,
  claimFailureReason: null,
});
