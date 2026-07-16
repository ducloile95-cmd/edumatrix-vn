import type { Timestamp } from "firebase/firestore";

/** settings/general - thong tin truong hoc, chi Admin doc/ghi (xem firestore.rules match /settings/{docId}). */
export interface SchoolSettingsDoc {
  name: string;
  schoolYear: string;
  address: string;
  phone: string;
  /** URL logo (dan link ngoai) - chua co upload file truc tiep o ban nay. */
  logoUrl: string;
  updatedAt: Timestamp;
}
