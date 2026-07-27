# Kế hoạch nâng cấp module Tương tác lớp học

Ngày lập: 25/07/2026

## 1. Mục tiêu

Nâng cấp màn hình chọn buổi học theo nguyên tắc "hôm nay trước, dữ liệu đầy đủ sau":

1. Chỉ hiển thị buổi đang diễn ra và buổi sắp diễn ra trong ngày hiện tại.
2. Không tải và không hiển thị danh sách buổi học của các ngày tương lai tại màn hình này.
3. Hiển thị toàn bộ lớp người dùng được phép xem trong một bảng riêng.
4. Giữ nguyên route và workspace nhập tương tác của từng buổi học.
5. Chỉ dùng Firebase Auth, Cloud Firestore và mã client hiện có, phù hợp Firebase Spark Plan.

Demo giao diện:

`docs/demos/classroom-interaction-today-first.html`

## 2. Audit codebase hiện tại

### Hiện trạng

`SessionPicker` trong:

`src/features/classroom/pages/ClassroomInteractionPage.tsx`

đang gọi:

```ts
listSessions(subDays(new Date(), 14), addDays(new Date(), 30))
```

Hệ quả:

- Màn hình trộn buổi đã qua, buổi hôm nay và buổi của 30 ngày tới.
- Danh sách dài làm mất trọng tâm tác nghiệp.
- Admin có thể đọc tối đa 300 document buổi học mỗi lần mở màn hình.
- Teacher gọi một truy vấn buổi học cho từng lớp được phân công.
- Dữ liệu lớp học và dữ liệu buổi học chưa được trình bày thành hai cấp thông tin riêng.

### Phần được giữ nguyên

- Route `/classroom/:sessionId`.
- `ClassroomWorkspace`.
- Luồng lưu bản nháp tự động.
- Điểm danh, bài tập, nhận xét học sinh.
- Tổng kết và phát hành thông báo.
- Messenger.
- Firestore Security Rules hiện tại.
- Design tokens trong `tailwind.config.ts`.

## 3. Kiến trúc giao diện đề xuất

### Khu vực Lớp học hôm nay

Chỉ nhận các session có:

```text
startAt >= đầu ngày hiện tại
startAt <= cuối ngày hiện tại
status != cancelled
endAt >= thời điểm hiện tại
```

Thứ tự:

1. Buổi đang diễn ra.
2. Buổi sắp diễn ra gần nhất.
3. Các buổi còn lại trong hôm nay theo `startAt`.

Không hiển thị buổi đã kết thúc trong khu vực ưu tiên. Có thể hiển thị một dòng tổng kết số buổi đã kết thúc, nhưng không render toàn bộ danh sách.

Mỗi buổi hiển thị:

- Khung giờ.
- Tên lớp.
- Tiêu đề buổi.
- Giáo viên.
- Địa điểm.
- Sĩ số.
- Trạng thái thời gian.
- Nút `Mở tương tác`.

### Bảng Danh sách lớp học

Nguồn dữ liệu là collection `classes`, không phải toàn bộ collection `sessions`.

Cột đề xuất:

- Tên lớp và khóa học.
- Lịch học.
- Giáo viên.
- Sĩ số.
- Địa điểm.
- Trạng thái.
- Thao tác.

Bộ lọc client:

- Tìm theo tên lớp.
- Tìm theo tên giáo viên sau khi đã map dữ liệu người dùng.
- Lọc trạng thái `active`, `completed`, `cancelled`.

Trên màn hình nhỏ, mỗi hàng chuyển thành một thẻ có nhãn trường. Không để bảng tràn ngang.

## 4. Phương án truy vấn Firestore

### Truy vấn buổi học hôm nay

Tính mốc ngày theo timezone ứng dụng:

```ts
const from = startOfDay(new Date());
const to = endOfDay(new Date());
```

Tái sử dụng `listSessions(from, to)`.

Không dùng:

```ts
subDays(new Date(), 14)
addDays(new Date(), 30)
```

Sau khi nhận kết quả, lọc client:

```ts
session.status !== "cancelled" &&
session.endAt.toDate() >= now
```

Lọc trạng thái sau truy vấn là chấp nhận được vì tập dữ liệu đã bị giới hạn trong đúng một ngày.

### Truy vấn danh sách lớp

Tái sử dụng:

```ts
listClasses()
```

Hàm này đã phân quyền:

- Admin đọc tối đa 200 lớp.
- Teacher chỉ đọc lớp có `teacherIds` chứa UID của mình.

Không tạo collection tổng hợp mới ở giai đoạn này.

### Index

Index hiện có:

```text
sessions: classId ASC, startAt ASC
```

đã phục vụ truy vấn buổi theo lớp của Teacher.

Truy vấn Admin theo `startAt` dùng automatic index hiện có. Không cần thêm index cho bản nâng cấp tối thiểu.

### Chi phí đọc

Firestore Spark hiện có quota miễn phí hằng ngày:

- 50.000 document reads.
- 20.000 document writes.
- 20.000 document deletes.
- 1 GiB dữ liệu lưu trữ.

Mỗi lần mở màn hình dự kiến:

```text
Admin:
  số session hôm nay trả về
  + tối đa 200 class document

Teacher:
  1 truy vấn danh sách lớp được phân công
  + 1 truy vấn session hôm nay cho mỗi lớp
  + số class document dùng cho bảng
```

Các truy vấn không trả kết quả vẫn có mức tính tối thiểu một read. Vì vậy không tự động refetch theo chu kỳ ngắn.

Đề xuất React Query:

```ts
staleTime: 5 * 60 * 1000
refetchOnWindowFocus: false
```

Chỉ thêm realtime listener khi có yêu cầu nghiệp vụ rõ ràng. Bản nâng cấp này không cần listener.

## 5. Thay đổi code dự kiến

### Tệp bắt buộc

`src/features/classroom/pages/ClassroomInteractionPage.tsx`

Thay `SessionPicker` bằng cấu trúc:

```text
ClassroomLanding
  TodaySessions
  ClassesTable
```

Không bắt buộc tách component sang tệp mới trong lần đầu. Chỉ tách khi tệp trở nên khó đọc hoặc component được dùng lại.

### Import cần đổi

Thêm:

```ts
endOfDay
startOfDay
```

Bỏ khỏi phần chọn buổi nếu không còn dùng:

```ts
subDays
```

Lưu ý: `subDays` và `addDays` vẫn đang được `ClassroomWorkspace` sử dụng cho tiến độ khóa học, nên chỉ xóa import nếu toàn tệp thực sự không còn dùng.

### Query mới ở màn hình landing

```ts
const todaySessions = useQuery({
  queryKey: ["classroom", "sessions", format(today, "yyyy-MM-dd")],
  queryFn: () => listSessions(startOfDay(today), endOfDay(today)),
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
});

const classes = useQuery({
  queryKey: ["classes"],
  queryFn: listClasses,
  staleTime: 5 * 60 * 1000,
});
```

Không gọi lại dữ liệu cho từng hàng của bảng.

### Dữ liệu bổ sung

Nếu cần hiển thị tên khóa học và giáo viên:

- Tải danh sách course và staff một lần theo query hiện có.
- Tạo `Map` bằng `useMemo`.
- Không gọi `getCourse()` hoặc `getUser()` riêng cho từng hàng.

Nếu bản đầu chỉ cần thông tin đã có trong `ClassDoc`, dùng:

- `name`.
- `scheduleText`.
- `studentIds.length`.
- `location`.
- `status`.

Điều này giảm phạm vi và số lượt đọc.

## 6. Tiêu chí nghiệm thu

### Chức năng

- Khi mở `/classroom`, không có session của ngày mai hoặc ngày khác trong khu vực ưu tiên.
- Buổi đang diễn ra đứng đầu.
- Buổi sắp bắt đầu trong hôm nay sắp xếp tăng dần theo thời gian.
- Buổi `cancelled` không xuất hiện.
- Buổi đã kết thúc không xuất hiện trong danh sách ưu tiên.
- Admin thấy bảng tất cả lớp trong giới hạn 200.
- Teacher chỉ thấy lớp được phân công.
- Nút `Mở tương tác` vẫn đi tới route hiện tại.
- Search và status filter hoạt động trên dữ liệu đã tải.

### Trạng thái giao diện

- Loading dùng skeleton theo đúng hai khu vực.
- Lỗi session không làm mất bảng lớp nếu bảng vẫn tải thành công.
- Lỗi bảng lớp không làm mất khu vực buổi học hôm nay.
- Không có buổi hôm nay hiển thị empty state có hướng dẫn.
- Không có lớp hiển thị empty state riêng.

### Responsive và accessibility

- Kiểm tra tại 375px, 768px, 1024px và 1440px.
- Không tràn ngang.
- Touch target tối thiểu 44px.
- Có focus-visible.
- Search có label.
- Filter có label.
- Trạng thái không chỉ phân biệt bằng màu.
- Bảng có `th scope="col"`.
- Mobile hiển thị nhãn cho từng trường.

## 7. Kiểm thử cần bổ sung

### Unit test

Tạo helper nhỏ:

```ts
getTodaySessionState(session, now)
```

Các ca kiểm thử:

1. Session đang diễn ra trả `current`.
2. Session chưa bắt đầu trả `upcoming`.
3. Session đã kết thúc trả `past`.
4. Session cancelled trả `hidden`.
5. Sắp xếp `current` trước `upcoming`.
6. Không trả session của ngày khác.

### Component test

- Render empty state khi không có session.
- Không render session ngày mai.
- Filter bảng theo từ khóa.
- Filter bảng theo trạng thái.
- Link mở đúng `classroomSessionPath(session.id)`.

### Kiểm tra thủ công

- Admin.
- Teacher có một lớp.
- Teacher có nhiều lớp.
- Teacher không có lớp.
- Ngày không có lịch.
- Một buổi đang diễn ra.
- Nhiều buổi sắp diễn ra.
- Mobile 375px.

## 8. Lộ trình triển khai

### Bản tối thiểu

1. Thu hẹp query session về đúng ngày hiện tại.
2. Tách UI buổi hôm nay và bảng lớp.
3. Thêm search và status filter client.
4. Thêm unit test cho phân loại thời gian.
5. Chạy typecheck, test và build.

### Sau khi có dữ liệu sử dụng

Chỉ thực hiện nếu số lớp hoặc số read thực tế tăng:

1. Phân trang bảng lớp bằng cursor.
2. Chuẩn hóa trường tìm kiếm nếu cần search server-side.
3. Tối ưu truy vấn Teacher theo nhóm tối đa 30 `classId` với toán tử `in`.
4. Chỉ cân nhắc denormalize `teacherIds` vào session khi số truy vấn theo lớp trở thành vấn đề đo được.

Không thêm Cloud Functions, search service, realtime listener hoặc collection tổng hợp trong bản đầu.

## 9. Rủi ro và cách kiểm soát

| Rủi ro | Kiểm soát |
|---|---|
| Lệch ngày do timezone | Dùng timezone ứng dụng nhất quán, kiểm thử lúc 00:00 và 23:59 |
| Giáo viên có nhiều lớp | Giới hạn đúng một ngày, theo dõi read, chỉ tối ưu khi có số liệu |
| Table quá rộng trên mobile | Chuyển hàng thành card có nhãn |
| Dữ liệu course/teacher gây N+1 reads | Tải theo danh sách một lần, map client |
| Hai query lỗi độc lập | Hiển thị error state theo từng khu vực |
| Thay đổi làm ảnh hưởng workspace | Giữ nguyên route và `ClassroomWorkspace` |

## 10. Quyết định thiết kế

- Redesign mode: targeted evolution.
- Giữ nguyên nhận diện EduMatrix.
- Màu primary xanh là accent chính.
- Màu success và warning chỉ biểu thị trạng thái.
- Radius giữ hệ thống 8px cho control, 12px cho surface.
- Không thêm animation tự động.
- Chỉ có hover, focus và phản hồi trạng thái trong 150-200ms.
- Không thêm dependency UI hoặc table mới cho dưới 200 lớp.
