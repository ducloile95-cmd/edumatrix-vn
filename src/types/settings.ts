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

/** settings/integrations - chi chua dinh danh cong khai, tuyet doi khong chua token/secret. */
export interface IntegrationSettingsDoc {
  facebookPageId: string;
  driveFolderId: string;
  webhookUrl: string;
  updatedAt: Timestamp;
}

/** settings/payment - cau hinh nguon tao VietQR, duoc snapshot vao hoa don. */
export interface PaymentSettingsDoc {
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  contentTemplate: string;
  vietQrTemplate: string;
  updatedAt: Timestamp;
}

/** usage_events/{uid_date_collection} - uoc tinh do client Edumatrix ghi nhan. */
export interface FirestoreUsageDoc {
  uid: string;
  dateKey: string;
  collectionId: string;
  reads: number;
  writes: number;
  deletes: number;
  lastLatencyMs: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
