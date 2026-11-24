import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";

/** Cache React Query giu toi 10 phut: xoa khi dang xuat/doi tai khoan de nguoi sau khong thay du lieu nguoi truoc. */
export function QueryCacheUserBoundary() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const previousUid = useRef<string | null>(null);
  const uid = firebaseUser?.uid ?? null;
  useEffect(() => {
    if (previousUid.current && previousUid.current !== uid) client.clear();
    previousUid.current = uid;
  }, [uid, client]);
  return null;
}
