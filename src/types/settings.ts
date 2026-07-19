import type { Timestamp } from "firebase/firestore";
import type { RankThresholds } from "@/utils/ranking";

export interface AcademicSettingsDoc {
  rankThresholds: RankThresholds;
  updatedAt: Timestamp | null;
}

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
