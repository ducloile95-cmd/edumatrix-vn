/** Mot nhom sau bi loi khi cac nhom truoc da ghi: UI phai bo chon cac hoc sinh nay de khong tao trung. */
export class InvoiceBatchPartialError extends Error {
  constructor(readonly createdStudentIds: string[], readonly cause: unknown) {
    super("invoice_batch_partial");
    this.name = "InvoiceBatchPartialError";
  }
}
