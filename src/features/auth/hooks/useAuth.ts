import { useContext } from "react";
import { AuthContext } from "@/features/auth/context/AuthContext";
import { isStaffRole } from "@/constants/roles";

export function useAuth() {
  const ctx = useContext(AuthContext);
  const role = ctx.userDoc?.role ?? null;

  return {
    ...ctx,
    role,
    isSignedIn: !!ctx.firebaseUser,
    isActive: ctx.userDoc?.status === "active",
    isStaff: role ? isStaffRole(role) : false,
  };
}
