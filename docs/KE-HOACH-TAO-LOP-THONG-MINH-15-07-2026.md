# Kế hoạch: Tạo lớp học thông minh (lịch lặp theo tuần + học phí/buổi)

Trạng thái: **Chờ duyệt — chưa code.** Ngày lập: 15/07/2026.

## 1. Mục tiêu và ví dụ mẫu

Khi tạo lớp, Admin nhập: ngày khai giảng, các thứ học trong tuần, khung giờ, tổng số buổi. Hệ thống tự sinh toàn bộ buổi học và tự tính ngày bế giảng — không cần tự đếm lịch bằng tay. Học phí chuyển từ "trọn khóa" sang "theo buổi", và các nơi hiển thị số tiền dùng định dạng `xxx.xxx đ`.

Ví dụ đối chiếu (dùng để kiểm chứng thuật toán ở phần 3):

- Lớp: **Lớp luyện chữ 1**, khai giảng **15/07/2026 (Thứ 4)**, lịch học **Thứ 3 & Thứ 5, 19:45–21:00**, tổng **22 buổi**.
- Vì 15/07/2026 là Thứ 4 — không khớp Thứ 3/Thứ 5 — buổi #1 vẫn là 15/07 (buổi khai giảng luôn cố định), các buổi sau mới bám đúng Thứ 3/Thứ 5 kể từ hôm sau.
- Kết quả tính tay: buổi #2 = Thứ 5 16/07 → buổi #3 = Thứ 3 21/07 → ... → buổi #22 = **Thứ 5 24/09/2026**. Vậy bế giảng = 24/09/2026.

## 2. Giả định và phạm vi (đọc trước khi duyệt)

- Chỉ **Admin** tạo lớp ở UI hiện tại (`ClassesPage.tsx` khoá nút "Tạo lớp học" theo `role === ADMIN`). Kế hoạch này giả định cơ chế mới cũng chỉ dùng qua đường Admin — quan trọng cho phần Rules ở mục 4.
- Sửa lớp đã tạo (đổi tên, giáo viên, trạng thái...) **không** đụng tới các buổi đã sinh. Muốn đổi lịch của lớp đang chạy, dùng công cụ có sẵn: tạo buổi thủ công ở Lịch học, hoặc kéo-thả đổi giờ từng buổi (Fit week). Việc "sửa lại cả chuỗi lịch lặp" nằm ngoài phạm vi lần này.
- Học phí/buổi (`pricePerSession`) là đơn giá cho **1 học sinh / 1 buổi**. Tính tiền hoá đơn = đơn giá × số buổi muốn thu, do người tạo hoá đơn nhập số buổi (mặc định 1, tự sửa được) — không tự dò buổi nào đã/chưa thu.
- Không có Cloud Functions (gói Spark) — toàn bộ logic sinh lịch chạy ở client, ghi bằng một `writeBatch` duy nhất, bảo mật do Firestore Rules đảm nhiệm.
- Dữ liệu cũ (khoá học chưa có `pricePerSession`, lớp chưa có lịch lặp cấu trúc) vẫn đọc/hiển thị bình thường — không chạy script migrate hàng loạt (Spark không có Admin SDK phía server). Trường mới tự điền khi Admin mở sửa lại, đúng theo lựa chọn "prefill_computed" đã chốt.

## 3. Thuật toán sinh buổi học (client-side, thuần logic)

File mới: `src/utils/recurrence.ts` — hàm thuần, không phụ thuộc Firestore, dễ kiểm chứng bằng tay.

```ts
export interface RecurrenceInput {
  startDate: Date;       // ngay khai giang (chi lay phan ngay)
  daysOfWeek: number[];  // 0=CN..6=T7, vd [2,4] = T3 & T5
  startTime: string;     // "HH:mm"
  endTime: string;       // "HH:mm"
  sessionCount: number;  // >= 1
}

export interface RecurrenceResult {
  sessions: { startAt: Date; endAt: Date }[];
  endDate: Date; // ngay cua buoi cuoi = be giang
}

export function generateRecurringSessions(input: RecurrenceInput): RecurrenceResult {
  // Buoi #1 = startDate, luon co dinh du co khop daysOfWeek hay khong.
  // Tu ngay sau startDate, di tung ngay, buoi nao roi dung thu trong
  // daysOfWeek thi lay, cho toi khi du sessionCount buoi.
}
```

Quy tắc "buổi #1 luôn cố định theo ngày khai giảng" áp dụng cho cả trường hợp ngày khai giảng trùng thứ trong lịch lặp lẫn không trùng — nên không cần nhánh rẽ đặc biệt, thuật toán tổng quát cho mọi trường hợp. Validate `daysOfWeek` không rỗng và `sessionCount >= 1` nằm ở schema form, không xử lý trong hàm thuần này.

Bước kiểm chứng: chạy thử với input đúng ví dụ mục 1, đối chiếu kết quả trả về khớp bảng tính tay (buổi #22 = 24/09/2026).

## 4. Firestore Rules

### 4.1. `validCourseData` — thêm `pricePerSession`, bắt buộc

```
function validCourseData(data) {
  return data.keys().hasAll(['name','subjectIds','pricePerSession','tuitionFee','totalSessions','startDate','endDate','status','createdAt','updatedAt']) &&
    data.keys().hasOnly(['name','subjectIds','pricePerSession','tuitionFee','totalSessions','startDate','endDate','status','createdAt','updatedAt']) &&
    data.pricePerSession is int && data.pricePerSession >= 0 &&
    ... (giu nguyen cac dieu kien con lai, tuitionFee van la int >= 0)
}
```

`pricePerSession` bắt buộc kể từ lần ghi tiếp theo — khoá học cũ **vẫn đọc được bình thường** (rule `read` không kiểm schema), chỉ khi Admin mở sửa và lưu lại thì mới cần trường này, và `CourseForm` sẽ tự điền sẵn giá trị gợi ý (mục 6.2) nên Admin không thấy có gì "hỏng". `tuitionFee` giữ lại làm tổng tiền suy ra tự động (không cho nhập tay nữa) để không phá các màn hình đang đọc `tuitionFee` (CoursesList, CatalogDashboard).

### 4.2. `validClassData` — thêm `recurrence` (tuỳ chọn)

```
function validRecurrence(data) {
  return data.keys().hasAll(['daysOfWeek','startTime','endTime','startDate','endDate','sessionCount']) &&
    data.keys().hasOnly(['daysOfWeek','startTime','endTime','startDate','endDate','sessionCount']) &&
    data.daysOfWeek is list && data.daysOfWeek.size() > 0 &&
    data.startTime is string && data.endTime is string &&
    data.startDate is timestamp && data.endDate is timestamp && data.endDate >= data.startDate &&
    data.sessionCount is int && data.sessionCount > 0;
}

function validClassData(data) {
  return data.keys().hasAll(['name','courseId','subjectIds','teacherIds','studentIds','scheduleText','location','status','createdAt','updatedAt']) &&
    data.keys().hasOnly(['name','courseId','subjectIds','teacherIds','studentIds','scheduleText','location','status','recurrence','createdAt','updatedAt']) &&
    ... (giu nguyen cac dieu kien cu) &&
    (!data.keys().hasAny(['recurrence']) || data.recurrence == null || validRecurrence(data.recurrence));
}
```

`recurrence` **không** nằm trong `hasAll` — lớp cũ/lớp tạo thủ công không có trường này vẫn hợp lệ. Đây là lựa chọn an toàn vì elicitation lần trước chỉ chốt migrate cho học phí, chưa nói gì về lịch lặp; giữ optional là hướng ít rủi ro nhất, tránh khoá sửa các lớp cũ.

### 4.3. `validSessionData`, rule `sessions/{sessionId}`, rule `invoices/{invoiceId}`

**Không đổi.** Buổi học tự sinh dùng đúng cấu trúc `SessionDoc` hiện có. Hoá đơn tự tính tiền vẫn ghi qua `createInvoice` như cũ, rule `amount > 0` không quan tâm số tiền đến từ tính tay hay tính tự động.

### 4.4. Điểm cần lưu ý về ghi atomic (đã xác minh, không cần đổi kiến trúc)

Rule tạo buổi học (`sessions/{sessionId} allow create`) gọi `canManageClass(classId)` → với Teacher sẽ gọi `isAssignedTeacherForClass` → cần `exists()`/`get()` lớp học đó. Nếu tạo lớp + N buổi học trong **cùng một `writeBatch`**, tài liệu lớp chưa commit nên `exists()` sẽ trả `false` — batch sẽ bị Rules từ chối **nếu người tạo là Teacher**.

Với **Admin**, `canManageClass` rẽ nhánh qua `isAdmin()` — không cần `get()` lớp học, nên ghi atomic một batch (lớp + buổi) hoàn toàn an toàn. Vì UI tạo lớp hiện tại chỉ mở cho Admin (mục 2), phương án 1 batch dùng được ngay, không cần chia 2 lượt ghi. Ghi chú để sau này: nếu có luồng Teacher tự tạo lớp, hàm `createClassWithSchedule` phải đổi sang ghi 2 lượt (tạo lớp trước, chờ xác nhận, rồi mới tạo buổi) — không dùng 1 batch chung cho trường hợp đó.

Số lượng ghi mỗi batch: 1 lớp + tối đa vài chục buổi, còn xa mới chạm giới hạn 500 thao tác/batch của Firestore — không cần chia nhỏ.

## 5. Data model (`src/types/academic.ts`)

```ts
export interface ClassRecurrence {
  daysOfWeek: number[]; // 0=CN..6=T7
  startTime: string;    // "HH:mm"
  endTime: string;      // "HH:mm"
  startDate: Timestamp; // khai giang
  endDate: Timestamp;   // be giang - tu tinh
  sessionCount: number;
}

export interface CourseDoc {
  name: string;
  subjectIds: string[];
  /** Don gia 1 buoi/1 hoc sinh - so nguyen VND (A7.4). La truong nguon chinh cho hoc phi. */
  pricePerSession: number;
  /** Tong hoc phi du kien = pricePerSession * totalSessions - tu tinh, khong nhap tay. Giu de tuong thich man hinh dang doc truong nay. */
  tuitionFee: number;
  totalSessions: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: CourseStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClassDoc {
  name: string;
  courseId: string;
  subjectIds: string[];
  teacherIds: string[];
  studentIds: string[];
  scheduleText: string;
  location: string;
  status: ClassStatus;
  /** Chi co khi lop duoc tao bang "Lich hoc thong minh". Lop cu/lop thu cong = undefined. */
  recurrence?: ClassRecurrence | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`SessionDoc`, `InvoiceDoc` giữ nguyên — không đổi.

## 6. Backend / service layer (client-SDK, Firebase Spark)

### 6.1. Sinh lớp + buổi học: `createClassWithSchedule` (mới, trong `src/services/firestore/classes.ts`)

```ts
export interface CreateClassWithScheduleInput extends UpsertClassInput {
  recurrence: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    startDate: Date;
    sessionCount: number;
  };
}

export async function createClassWithSchedule(input: CreateClassWithScheduleInput): Promise<string> {
  const { sessions, endDate } = generateRecurringSessions({
    startDate: input.recurrence.startDate,
    daysOfWeek: input.recurrence.daysOfWeek,
    startTime: input.recurrence.startTime,
    endTime: input.recurrence.endTime,
    sessionCount: input.recurrence.sessionCount,
  });

  const batch = writeBatch(db);
  const classRef = doc(collection(db, COLLECTIONS.CLASSES));
  batch.set(classRef, {
    name: input.name,
    courseId: input.courseId,
    subjectIds: input.subjectIds,
    teacherIds: input.teacherIds,
    studentIds: [],
    scheduleText: buildScheduleText(input.recurrence), // vd "Thu 3, Thu 5 - 19:45-21:00"
    location: input.location,
    status: input.status,
    recurrence: {
      daysOfWeek: input.recurrence.daysOfWeek,
      startTime: input.recurrence.startTime,
      endTime: input.recurrence.endTime,
      startDate: Timestamp.fromDate(input.recurrence.startDate),
      endDate: Timestamp.fromDate(endDate),
      sessionCount: sessions.length,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  sessions.forEach((session) => {
    const ref = doc(collection(db, COLLECTIONS.SESSIONS));
    batch.set(ref, {
      classId: classRef.id,
      title: input.name,
      startAt: Timestamp.fromDate(session.startAt),
      endAt: Timestamp.fromDate(session.endAt),
      location: input.location,
      status: "scheduled",
      note: "",
      makeUpForSessionId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return classRef.id;
}
```

`createClass`/`updateClass`/`deleteClass` hiện có giữ nguyên — hàm mới chỉ cộng thêm, không thay hàm cũ (lớp tạo thủ công vẫn dùng `createClass` như trước).

### 6.2. Học phí theo buổi: sửa `src/services/firestore/courses.ts`

`CreateCourseInput.tuitionFee` → đổi thành `pricePerSession`. `createCourse`/`updateCourse` tự tính `tuitionFee: input.pricePerSession * input.totalSessions` khi ghi — Admin không cần nhập tổng tiền tay nữa.

## 7. Client-side UI

Đọc lại `andrej-karpathy-skills:karpathy-guidelines` áp dụng ở đây: chỉ sửa đúng phần cần, không viết lại toàn bộ form, không thêm cấu hình thừa (ví dụ không làm giao diện chọn nhiều khung giờ khác nhau trong tuần — chỉ 1 khung giờ áp dụng cho mọi thứ đã chọn, đúng như ví dụ "Thứ 3 - Thứ 5 : 07:45 CH-09:00 CH" của bạn).

- `src/utils/recurrence.ts` — thuật toán (mục 3).
- `src/utils/currency.ts` — mới: `formatVnd(amount) => \`${amount.toLocaleString("vi-VN")} đ\``. Thay 2 bản `formatVnd` trùng lặp trong `CatalogDashboard.tsx` và `CoursesList.tsx` bằng import dùng chung, và mọi hiển thị tiền mới thêm trong kế hoạch này đều gọi hàm này — đảm bảo luôn ra đúng dạng `xxx.xxx đ`.
- `src/schemas/course.ts` — `tuitionFee` → `pricePerSession` trong `courseFormSchema`.
- `src/features/catalog/components/CourseForm.tsx` — đổi nhãn "Học phí (VNĐ)" → "Học phí / buổi (VNĐ)", bind `pricePerSession`. Thêm dòng hiển thị "Tổng học phí dự kiến: {formatVnd(pricePerSession × totalSessions)}" (chỉ đọc, cập nhật theo thời gian thực qua `watch()`). Khi mở sửa khoá học cũ chưa có `pricePerSession`, `useEffect` reset tự điền `Math.round(editingCourse.tuitionFee / editingCourse.totalSessions)` — vẫn sửa được tay trước khi lưu (đúng lựa chọn "prefill_computed").
- `src/features/catalog/components/CoursesList.tsx`, `CatalogDashboard.tsx` — đổi hiển thị từ tổng học phí sang đơn giá/buổi (`course.pricePerSession ?? Math.round(course.tuitionFee / course.totalSessions)` cho khoá cũ chưa migrate), dùng `formatVnd`.
- `src/schemas/class.ts` hoặc file mới `src/schemas/classRecurrence.ts` — schema riêng cho khối "Lịch học thông minh" (ngày khai giảng, các thứ, giờ bắt đầu/kết thúc, tổng số buổi), tách khỏi `classFormSchema` hiện có để không làm phình schema cũ.
- `src/features/classes/components/ClassForm.tsx` — thêm khối "Lịch học thông minh" (bật/tắt bằng toggle, mặc định tắt = giữ hành vi nhập `scheduleText` tay như hiện nay). Khi bật: chọn ngày khai giảng, chọn thứ trong tuần (pill toggle T2..CN theo đúng quy ước `DOW_LABEL` đang dùng ở `TimetableGrid`), giờ bắt đầu/kết thúc, tổng số buổi. Có ô xem trước: bế giảng dự kiến + buổi đầu/buổi cuối, tính bằng `generateRecurringSessions()` ngay trên client (chưa ghi gì). Khi submit, nếu khối này đang bật thì gọi `createClassWithSchedule()` thay vì `createClass()`.
- `src/features/invoices/pages/InvoicesPage.tsx` — thêm select "Lớp học" (sau select "Học sinh"), ô số "Số buổi" (mặc định 1). Khi có lớp + số buổi, tự tính `amount = pricePerSession(khoá học của lớp) × số buổi` và điền vào ô "Số tiền" — vẫn sửa tay được sau đó (dùng cờ `amountTouched` để không ghi đè nếu Admin đã tự gõ số khác), đúng lựa chọn "prefill_invoice".
- `src/types/academic.ts` — theo mục 5.

## 8. Trình tự triển khai (từng bước có cách kiểm chứng riêng)

1. **Utilities & types** — `recurrence.ts`, `currency.ts`, cập nhật `academic.ts`. Kiểm chứng: `npm run typecheck` sạch; chạy thử `generateRecurringSessions` với ví dụ mục 1, đối chiếu buổi #22 = 24/09/2026.
2. **Firestore Rules** — sửa `validCourseData`, thêm `validRecurrence` + trường `recurrence` optional trong `validClassData`. Kiểm chứng: soát lại bằng Rules Playground trên Firebase Console trước khi publish (Spark không có emulator CI sẵn trong repo), xác nhận khoá học/lớp cũ vẫn đọc được, còn ghi mới đúng yêu cầu field.
3. **Service layer** — `createClassWithSchedule` + `buildScheduleText`, sửa `createCourse`/`updateCourse` tự tính `tuitionFee`. Kiểm chứng: `npm run typecheck && npm run lint`.
4. **CourseForm + hiển thị học phí** — đổi input, prefill migrate, cập nhật CoursesList/CatalogDashboard. Kiểm chứng: typecheck/lint sạch; mở thử 1 khoá học cũ xác nhận ô học phí/buổi tự điền số hợp lý và lưu được.
5. **ClassForm — khối lịch học thông minh**. Kiểm chứng: typecheck/lint sạch; đối chiếu bằng tay ví dụ "Lớp luyện chữ 1" cho ra đúng 22 buổi, bế giảng 24/09/2026.
6. **InvoicesPage — tự tính tiền hoá đơn**. Kiểm chứng: typecheck/lint sạch.
7. **Kiểm tra toàn cục**: `npm run typecheck && npm run lint`; `git diff --ignore-space-at-eol --stat -- src/features/students/` phải rỗng; rà lại diff tổng thể để chắc chỉ sửa đúng phạm vi đã liệt kê.

Mỗi bước làm xong sẽ báo lại trước khi qua bước kế — không gộp thành một lần đổi lớn.
