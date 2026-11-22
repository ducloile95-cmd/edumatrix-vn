# Tối ưu lượt đọc/ghi Firestore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa chi phí vận hành EduMatrix về 0đ/tháng (nằm trong hạn mức miễn phí của Firebase/Cloudflare) hoặc tối đa dưới 100.000đ/tháng, bằng cách cắt các lượt đọc lặp vô ích, không thêm hạ tầng mới.

**Architecture:** Không đổi kiến trúc (vẫn client-only + Firestore + Cloudflare Worker). Chỉ sửa đúng các điểm "đốt" lượt đọc: polling 5–15 giây bằng `getDocs`, cache React Query quá ngắn, dashboard tải toàn bộ collection, và phân trang `offset` trong Worker (Firestore tính phí cả các document bị bỏ qua). Cuối cùng là chốt chặn ngân sách để không bao giờ vượt 100k.

**Tech Stack:** React 19, TanStack Query v5, Firebase JS SDK v12 (Firestore), Cloudflare Worker (REST `runQuery`), Vitest.

**Spec:** Yêu cầu của người dùng ngày 22/11/2026: "đơn giản hóa và tối ưu lượt đọc ghi cũng như dữ liệu của hệ thống theo tiêu chí duy nhất là 0đ hoặc dưới 100k/tháng". Không có tài liệu spec riêng; phần "Ngân sách & giả định" bên dưới đóng vai trò spec.

## Ngân sách & giả định

Hạn mức miễn phí Firestore (Spark, và cũng là phần miễn phí của Blaze): **50.000 lượt đọc/ngày, 20.000 lượt ghi/ngày, 20.000 lượt xoá/ngày, 1 GiB dữ liệu**. Cloudflare Workers free: 100.000 request/ngày. 100.000đ ≈ 4 USD; kiểm tra bảng giá hiện tại theo region của dự án trước khi bật Blaze.

Quy mô giả định: ~300 học sinh, ~300 phụ huynh, ~10 nhân sự; phụ huynh mở app ~2 lần/ngày, ~5 phút/lần.

| Điểm nóng (đo từ code) | Ước tính hiện tại | Sau kế hoạch |
|---|---|---|
| Chuông thông báo phụ huynh poll 15s (`Topbar.tsx:25`), mỗi lần đọc tới 50 thông báo/học sinh + `notification_reads` | ~600.000 đọc/ngày | ~15.000 |
| Trạng thái gửi Messenger poll 5–10s ở 4 màn hình (qua Worker, vẫn là lượt đọc Firestore) | ~20.000 đọc/giờ cho mỗi tab nhân sự đang mở | chỉ poll khi còn job đang chờ, 30s |
| Dashboard nhân sự tải toàn bộ lớp/học sinh/bài tập/bài nộp, cache 60s | vài nghìn đọc mỗi lần vào trang | mỗi 15 phút, lớp học dùng chung cache |
| Danh mục (khóa, môn, lớp) có `staleTime: 60_000` ở 25 chỗ | đọc lại mỗi phút khi chuyển trang | 10 phút, mutation đã invalidate |
| Worker `queryDocuments` phân trang bằng `offset` | tốn O(n²) khi >200 document | O(n) |

**Mục tiêu nghiệm thu:** tab Usage của Firestore cho thấy < 40.000 đọc/ngày (chừa 20% dư) trong 3 ngày làm việc liên tiếp.

## Global Constraints

- Không thêm dependency mới, không thêm Cloud Functions, không đổi tên collection (`src/constants/collections.ts`: "KHONG duoc doi ten sau khi da co production data").
- Không sửa `firebase/firestore.rules` trong kế hoạch này (không task nào cần đổi rules).
- Giữ `memoryLocalCache` trong `src/services/firebase/firestoreClient.ts`: `getDocs` luôn đọc server khi online, nên cache bền (IndexedDB) không giảm phí mà còn gây lại lỗi khoá tab đã được sửa.
- Mọi thay đổi phải qua: `npm run typecheck`, `npm test`, `npm run lint`; Worker: `cd workers/messenger && npm test`.
- Thông điệp commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Phụ huynh vừa nhận thông báo mới mà chuông chưa cập nhật: phải hiện khi quay lại tab (refetch on focus) hoặc trong ≤ 5 phút → test ở Task 1 kiểm tra `refetchOnWindowFocus` và interval.
2. Job Messenger kẹt ở `processing` mãi: UI vẫn phải poll (không dừng), và dừng ngay khi mọi job đã `sent/failed/skipped` → test ở Task 2.
3. Phụ huynh có nhiều con: giảm giới hạn không được làm mất thông báo của đứa con thứ hai → test ở Task 1 (2 học sinh, mỗi bé có thông báo riêng).
4. Nhân sự vừa sửa lớp/khóa học: danh sách phải cập nhật ngay dù `staleTime` dài hơn, nhờ `invalidateQueries` → Task 3 có bước rà soát từng key.
5. Collection trong Worker có đúng 200 document (biên trang): phải gọi thêm một trang và trả đủ, không lặp vô hạn → test ở Task 5.

---

### Task 0: Đo baseline (thủ công, không code)

- [ ] **Step 1:** Firebase Console → Firestore → tab **Usage**: ghi lại số Reads/Writes/Deletes của 3 ngày làm việc gần nhất vào cuối file này (mục "Kết quả đo").
- [ ] **Step 2:** Firebase Console → **Usage and billing**: ghi rõ dự án đang ở gói **Spark** hay **Blaze**. Nếu là Spark thì chi phí luôn là 0đ, rủi ro thật là *app ngừng đọc khi chạm 50.000 lượt/ngày* — mục tiêu của kế hoạch là tránh điều đó.
- [ ] **Step 3:** Cloudflare Dashboard → Workers → `edumatrix-messenger` → Metrics: ghi số request/ngày.

### Task 1: Chuông thông báo phụ huynh — bỏ polling 15s, giảm số thông báo tải

**Files:**
- Modify: `src/services/firestore/announcements.ts:18-41` (`listAnnouncementsByStudent`: `batchSize` đang ép tối thiểu 50 nên truyền 20 vẫn đọc 50)
- Modify: `src/services/firestore/notifications.ts:23-24`
- Modify: `src/components/layouts/Topbar.tsx:21-26`
- Test: `src/services/firestore/notifications.test.ts`, `src/services/firestore/announcements.test.ts`

**Interfaces:**
- Produces: `export const VIEWER_NOTIFICATION_REFRESH_MS = 5 * 60_000` trong `notifications.ts` (Topbar dùng).

- [ ] **Step 1: Viết test hỏng** — thêm vào `notifications.test.ts`:

```ts
test("requests at most 20 announcements per student and keeps every child", async () => {
  mocks.listAnnouncementsByStudent.mockImplementation(async (studentId: string) => [
    { id: `a-${studentId}`, title: studentId, message: "", createdAt: { toMillis: () => 1 } },
  ]);
  mocks.getDocs.mockResolvedValue(snapshot([]));

  const result = await listViewerNotifications("parent-1", ["student-1", "student-2"]);

  expect(mocks.listAnnouncementsByStudent).toHaveBeenCalledWith("student-1", 20);
  expect(mocks.listAnnouncementsByStudent).toHaveBeenCalledWith("student-2", 20);
  expect(result.map((item) => item.id).sort()).toEqual(["a-student-1", "a-student-2"]);
});
```

Và vào `announcements.test.ts` (file này mock `limit` inline là `vi.fn`; thêm `import { limit } from "firebase/firestore";` ngay dưới import của `listAnnouncementsByStudent` để lấy bản mock):

```ts
test("uses the requested page size as the Firestore limit", async () => {
  getDocs.mockResolvedValue(snapshot([]));
  await listAnnouncementsByStudent("student-1", 20);
  expect(vi.mocked(limit)).toHaveBeenCalledWith(20);
});
```

Lưu ý: test phân trang sẵn có trong file (bỏ qua thông báo `resolvedAt`) có thể đang dựa vào lô 50 — nếu hỏng sau Step 3, sửa dữ liệu test theo lô bằng `pageSize`, không đổi lại code.

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `npx vitest run src/services/firestore/notifications.test.ts src/services/firestore/announcements.test.ts`
Expected: FAIL (`called with "student-1", 50`; `limit` called with `50`).

- [ ] **Step 3: Sửa code**

`announcements.ts`, trong `listAnnouncementsByStudent`:

```ts
  const batchSize = Math.max(pageSize, 1);
```

`notifications.ts`:

```ts
const PER_STUDENT_LIMIT = 20;
const TOTAL_LIMIT = 50;
const READ_BATCH_LIMIT = 10;
// Moi lan tai ~20 doc/hoc sinh; poll 15s tung chiem gan het 50k doc/ngay cua Spark.
export const VIEWER_NOTIFICATION_REFRESH_MS = 5 * 60_000;
```

`Topbar.tsx` (thêm `VIEWER_NOTIFICATION_REFRESH_MS` vào import từ `@/services/firestore/notifications`):

```tsx
  const viewerQuery = useQuery({
    queryKey,
    queryFn: () => listViewerNotifications(firebaseUser!.uid, studentIds),
    enabled: !!firebaseUser && !isStaff && studentIds.length > 0,
    staleTime: VIEWER_NOTIFICATION_REFRESH_MS,
    refetchInterval: VIEWER_NOTIFICATION_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
```

- [ ] **Step 4: Chạy lại test** — cùng lệnh, Expected: PASS. Sau đó `npm test` toàn bộ để chắc không vỡ test khác (ví dụ test đang kỳ vọng 50).
- [ ] **Step 5: Commit**

```bash
git add src/services/firestore/announcements.ts src/services/firestore/notifications.ts src/components/layouts/Topbar.tsx src/services/firestore/*.test.ts
git commit -m "perf(notifications): stop 15s polling and cap viewer notifications"
```

### Task 2: Trạng thái gửi Messenger — chỉ poll khi còn job đang chạy

**Files:**
- Modify: `src/services/integrations/messenger.ts` (thêm hàm cạnh `summarizeUtilityDelivery`, ~dòng 196)
- Modify: `src/features/announcements/components/ChatConversationPanel.tsx:142`
- Modify: `src/features/classes/components/EnrollmentManager.tsx:66`
- Modify: `src/features/classroom/pages/ClassroomInteractionPage.tsx:146`
- Modify: `src/features/invoices/pages/InvoicesPage.tsx:87`
- Test: `src/services/integrations/messenger.test.ts`

**Interfaces:**
- Produces: `export function utilityDeliveryRefetchInterval(response: UtilityDeliveryStatusResponse | undefined): number | false`

- [ ] **Step 1: Viết test hỏng** — thêm vào `messenger.test.ts`:

```ts
import { utilityDeliveryRefetchInterval } from "@/services/integrations/messenger";

describe("utilityDeliveryRefetchInterval", () => {
  const item = (status: string) => ({ id: status, entityId: "e1", status }) as never;
  test("polls every 30s while a job or event is pending or processing", () => {
    expect(utilityDeliveryRefetchInterval({ jobs: [item("processing")], events: [] })).toBe(30_000);
    expect(utilityDeliveryRefetchInterval({ jobs: [], events: [item("pending")] })).toBe(30_000);
  });
  test("stops polling once everything is terminal", () => {
    expect(utilityDeliveryRefetchInterval({ jobs: [item("sent"), item("failed"), item("skipped")], events: [] })).toBe(false);
  });
  test("polls once more when nothing has loaded yet", () => {
    expect(utilityDeliveryRefetchInterval(undefined)).toBe(30_000);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng** — `npx vitest run src/services/integrations/messenger.test.ts` → FAIL "is not a function".
- [ ] **Step 3: Sửa code** — trong `messenger.ts`:

```ts
const ACTIVE_DELIVERY_STATUSES = new Set(["pending", "processing"]);

/** Poll cham va chi khi con viec dang chay: moi lan poll la vai chuc luot doc Firestore qua Worker. */
export function utilityDeliveryRefetchInterval(response: UtilityDeliveryStatusResponse | undefined): number | false {
  if (!response) return 30_000;
  const active = [...response.jobs, ...response.events].some((item) => ACTIVE_DELIVERY_STATUSES.has(item.status));
  return active ? 30_000 : false;
}
```

Ở cả 4 file, thay dòng `refetchInterval: 10_000,` / `refetchInterval: 5_000,` của query `utility-delivery` bằng:

```tsx
    refetchInterval: (query) => utilityDeliveryRefetchInterval(query.state.data),
```

và thêm `utilityDeliveryRefetchInterval` vào import sẵn có từ `@/services/integrations/messenger`.

- [ ] **Step 4:** `npx vitest run src/services/integrations/messenger.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 5: Kiểm tra tay:** mở ClassroomInteractionPage của một buổi đã công bố, DevTools → Network lọc `delivery-jobs/status`: thấy request mỗi 30s khi đang gửi, và hết request khi tất cả đã `sent`.
- [ ] **Step 6: Commit**

```bash
git add src/services/integrations/messenger.ts src/services/integrations/messenger.test.ts src/features
git commit -m "perf(messenger): poll delivery status only while jobs are active"
```

### Task 3: Cache dữ liệu danh mục lâu hơn

**Files:**
- Modify: `src/app/providers.tsx:14`
- Modify: 25 dòng có `staleTime: 60_000` trong `src/features/**` (liệt kê bằng `grep -rn "staleTime: 60_000" src`)
- Modify: `src/features/dashboard/pages/StaffDashboardPage.tsx:99` (đổi key `"dashboard-filter-classes"` → dùng chung `["classes"]`)

**Interfaces:**
- Produces: `staleTime` mặc định 10 phút cho mọi query không tự khai báo.

- [ ] **Step 1: Rà soát invalidate trước khi đổi** (bắt buộc, vì đây là chỗ dễ làm dữ liệu cũ): với mỗi key `["classes"]`, `["courses"]`, `["subjects"]`, `["students"]`, `["billing-items"]`, `["settings", ...]`, chạy `grep -rn "queryKey: \[\"<key>\"" src --include=*.tsx | grep invalidate` và xác nhận mọi mutation tạo/sửa/xoá entity đó đều gọi `invalidateQueries` với key đó. Mutation nào thiếu thì thêm `onSuccess: () => queryClient.invalidateQueries({ queryKey: ["<key>"] })` trong cùng commit.
- [ ] **Step 2: Sửa default** trong `providers.tsx`:

```tsx
            // Danh muc it doi; mutation da invalidateQueries nen cache dai khong lam du lieu cu.
            staleTime: 10 * 60_000,
```

- [ ] **Step 3: Xoá override 60s** để các query dùng default mới:

```bash
grep -rln "staleTime: 60_000" src --include=*.tsx | xargs sed -i 's/, staleTime: 60_000 }/ }/; /^\s*staleTime: 60_000,\s*$/d'
grep -rn "staleTime: 60_000" src
```

Expected: lệnh grep thứ hai không còn kết quả. Rà diff để chắc chỉ xoá đúng các dòng đó.

- [ ] **Step 4: Dùng chung cache lớp học trên dashboard** — `StaffDashboardPage.tsx:99`:

```tsx
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses, enabled: !!firebaseUser });
```

(An toàn vì `listClasses` tự lọc theo user hiện tại: giáo viên chỉ nhận lớp có `teacherIds` chứa uid, admin nhận tất cả — `src/services/firestore/classes.ts:328-345`; key `["classes"]` đã được dùng như vậy ở 17 nơi khác.)

- [ ] **Step 5:** `npm run typecheck && npm test && npm run lint` → PASS.
- [ ] **Step 6: Kiểm tra tay:** sửa tên một lớp → danh sách lớp cập nhật ngay; chuyển qua lại giữa các trang Lớp/Buổi học trong 10 phút → tab Network không còn truy vấn lặp lại tới `classes`/`courses`/`subjects`.
- [ ] **Step 7: Commit** — `git commit -am "perf(query): cache catalog data for 10 minutes"`

### Task 4: Dashboard nhân sự — cache 15 phút, làm mới thủ công

**Files:**
- Modify: `src/features/dashboard/pages/StaffDashboardPage.tsx:103-119`

**Interfaces:**
- Consumes: `staleTime` default từ Task 3.

- [ ] **Step 1: Sửa code** — thêm hằng số ở đầu file và áp dụng cho 3 query `overview`, `learning`, `finance`:

```tsx
// Dashboard doc toan bo lop/hoc sinh/bai nop; tinh lai moi 15 phut la du cho quan ly.
const DASHBOARD_STALE_MS = 15 * 60_000;
```

```tsx
    staleTime: DASHBOARD_STALE_MS,
```

Nếu trang chưa có nút làm mới, thêm một `Button` (component sẵn có `@/components/ui/Button`) cạnh bộ lọc gọi `overview.refetch()` (và `learning.refetch()` khi `tab === "quality"`), có `aria-label="Làm mới số liệu"`.

- [ ] **Step 2:** `npm run typecheck && npm run lint` → PASS.
- [ ] **Step 3: Kiểm tra tay:** vào Dashboard, rời đi, quay lại trong 15 phút → không có request Firestore mới; bấm Làm mới → có request.
- [ ] **Step 4: Commit** — `git commit -am "perf(dashboard): cache staff dashboard for 15 minutes with manual refresh"`

> Không làm ở đây (YAGNI): document tổng hợp dashboard tính sẵn. Chỉ cần nếu sau Task 6 dashboard vẫn chiếm > 30% lượt đọc/ngày.

### Task 5: Worker — bỏ phân trang `offset`

**Files:**
- Modify: `workers/messenger/src/index.ts:581-613` (`queryDocuments`)
- Test: `workers/messenger/tests/worker.test.ts`

**Interfaces:**
- Produces: `export function pagedStructuredQuery(baseQuery: Record<string, unknown>, lastDocumentName: string | null): Record<string, unknown>`

- [ ] **Step 1: Viết test hỏng** — thêm `pagedStructuredQuery` vào dòng import ở đầu `worker.test.ts`, rồi:

```ts
test("pages Firestore queries with a __name__ cursor instead of offset",()=>{
  const base={from:[{collectionId:"chat_threads"}],limit:200};
  expect(pagedStructuredQuery(base,null)).toEqual({...base,orderBy:[{field:{fieldPath:"__name__"},direction:"ASCENDING"}]});
  const next=pagedStructuredQuery(base,"projects/p/databases/(default)/documents/chat_threads/t200");
  expect(next).toMatchObject({startAt:{values:[{referenceValue:"projects/p/databases/(default)/documents/chat_threads/t200"}],before:false}});
  expect(next).not.toHaveProperty("offset");
});
```

- [ ] **Step 2:** `cd workers/messenger && npx vitest run` → FAIL (`pagedStructuredQuery` không tồn tại).
- [ ] **Step 3: Sửa code** — thêm ngay trên `queryDocuments`:

```ts
/** offset van bi tinh phi cho moi doc bi bo qua; cursor theo __name__ chi tinh doc tra ve. */
export function pagedStructuredQuery(baseQuery: Record<string, unknown>, lastDocumentName: string | null): Record<string, unknown> {
  const ordered = { ...baseQuery, orderBy: [{ field: { fieldPath: "__name__" }, direction: "ASCENDING" }] };
  return lastDocumentName ? { ...ordered, startAt: { values: [{ referenceValue: lastDocumentName }], before: false } } : ordered;
}
```

Thay vòng lặp trong `queryDocuments`:

```ts
  const documents: unknown[] = [];
  let lastDocumentName: string | null = null;
  for (;;) {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ structuredQuery: pagedStructuredQuery(baseQuery, lastDocumentName) }),
    });
    if (!response.ok) throw new Error("firestore_query_failed");
    const rows = await response.json<Array<{ document?: unknown }>>();
    const page = rows.flatMap((row) => row.document ? [row.document] : []);
    documents.push(...page);
    if (page.length < 200) return documents;
    lastDocumentName = (page[page.length - 1] as { name: string }).name;
  }
```

(Lọc `EQUAL`/`ARRAY_CONTAINS` + sắp theo `__name__` dùng index đơn trường mặc định, không cần thêm composite index.)

- [ ] **Step 4:** `cd workers/messenger && npm test` → PASS toàn bộ.
- [ ] **Step 5: Kiểm tra trên emulator/dev:** `npm run dev` trong `workers/messenger`, gọi một endpoint dùng `queryDocuments` (ví dụ đồng bộ context Messenger từ trang Cài đặt) → không có lỗi `firestore_query_failed`.
- [ ] **Step 6: Commit** — `git commit -am "perf(worker): replace offset pagination with __name__ cursor"`

### Task 6: Chốt chặn ngân sách + đo lại (thủ công + tài liệu)

**Files:**
- Modify: `docs/operations-runbook.md` (thêm mục "Ngân sách Firestore")

- [ ] **Step 1:** Nếu dự án ở **Blaze**: Google Cloud Console → Billing → Budgets & alerts → tạo budget **100.000đ/tháng**, cảnh báo ở 50%, 90%, 100% gửi email quản trị. (Budget chỉ cảnh báo, không tự chặn chi; nếu cần chặn cứng thì ở lại Spark.)
- [ ] **Step 2:** Nếu ở **Spark**: giữ nguyên Spark — chi phí luôn 0đ. Chỉ cân nhắc Blaze khi Task 7 cho thấy vẫn chạm hạn mức trên 2 ngày/tuần.
- [ ] **Step 3:** Ghi vào `docs/operations-runbook.md`: hạn mức ở mục "Ngân sách & giả định", nơi xem Usage, và quy tắc cho code mới: *"Không dùng `refetchInterval` dưới 30s với query Firestore; cần realtime thì dùng `onSnapshot` có `limit`."*
- [ ] **Step 4: Commit** — `git commit -am "docs(ops): add Firestore budget guardrails"`

### Task 7: Nghiệm thu

- [ ] **Step 1:** Deploy (theo `docs/CHECKLIST-TRIEN-KHAI-PRODUCTION.md`), gồm cả Worker (`cd workers/messenger && npm run deploy:prod`).
- [ ] **Step 2:** Sau 3 ngày làm việc, ghi số Reads/Writes/ngày vào mục "Kết quả đo" và so với baseline của Task 0.
- [ ] **Step 3:** Đạt nếu < 40.000 đọc/ngày. Nếu chưa đạt: Console → Firestore → **Query insights** (hoặc so sánh theo collection) để tìm collection đọc nhiều nhất và lập task tiếp theo; ứng viên kế tiếp, theo thứ tự: (a) InvoicesPage chỉ gửi ID của job còn `pending/processing` thay vì toàn bộ hoá đơn khi poll; (b) tổng quan điểm danh admin đọc mọi `attendance` 30 ngày (`attendance.ts:353-356`) → tính từ `attendance_summaries`; (c) document tổng hợp cho dashboard (Task 4).

## Đã cân nhắc và bỏ qua

- **Cache bền IndexedDB (`persistentLocalCache`)**: không giảm phí cho `getDocs` khi online, và từng gây khoá giữa các tab.
- **TTL/dọn dữ liệu cũ** (`messenger_delivery_*`, `audit_logs`): ~300 học sinh còn xa mức 1 GiB. Chỉ làm khi Usage → Storage vượt 500 MiB.
- **Đổi Topbar phụ huynh sang `onSnapshot`**: mỗi học sinh cần một listener và vẫn phải truy vấn `notification_reads` riêng; poll 5 phút + refetch khi quay lại tab là đủ và đơn giản hơn.
- **Giãn cron Worker `*/5`**: ~6 truy vấn × 288 lần/ngày ≈ 1.700 đọc/ngày khi hàng đợi rỗng, không đáng đổi độ trễ gửi tin.

## Kết quả đo

| Ngày | Reads | Writes | Deletes | Worker requests | Ghi chú |
|---|---|---|---|---|---|
| (baseline) | | | | | |
| (sau triển khai) | | | | | |
