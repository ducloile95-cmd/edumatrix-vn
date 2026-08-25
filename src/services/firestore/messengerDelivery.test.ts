import { describe, expect, test } from "vitest";
import { utilityDeliveryEventId } from "@/services/firestore/messengerDelivery";

describe("utility delivery event idempotency", () => {
  test("uses event, entity and business version as the stable key", () => {
    expect(utilityDeliveryEventId({ eventType: "invoice_committed", entityId: "invoice-1", version: 1 }))
      .toBe("invoice_committed:invoice-1:v1");
    expect(utilityDeliveryEventId({ eventType: "enrollment_completed", entityId: "class-1_student-1", version: 2 }))
      .toBe("enrollment_completed:class-1_student-1:v2");
  });

  test("rejects unsafe entity ids and invalid versions", () => {
    expect(() => utilityDeliveryEventId({ eventType: "invoice_committed", entityId: "invoice/1", version: 1 })).toThrow("UTILITY_DELIVERY_EVENT_INVALID");
    expect(() => utilityDeliveryEventId({ eventType: "invoice_committed", entityId: "invoice-1", version: 0 })).toThrow("UTILITY_DELIVERY_EVENT_INVALID");
  });

  test("accepts existing student codes that are valid Firestore document ids", () => {
    expect(utilityDeliveryEventId({ eventType: "enrollment_completed", entityId: "class-1_HS 01.Đ", version: 1 }))
      .toBe("enrollment_completed:class-1_HS 01.Đ:v1");
  });
});
