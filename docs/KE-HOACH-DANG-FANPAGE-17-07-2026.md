# Kế hoạch: Thiết kế lại nhánh "Đăng Fanpage" (module Chat)

Ngày: 17/07/2026
Phạm vi: chỉ nhánh `section === "fanpage"` trong `src/features/announcements/pages/ChatPage.tsx` (route `/app/chat`, chỉ Admin thấy tab này). Hai tab còn lại của Chat (Hội thoại, Nhật ký gửi) **không đổi**.

## 1. Hiện trạng

`Fanpage()` hiện tại (trong `ChatPage.tsx`) chỉ là một form đơn: ô "Nội dung" + ô "Liên kết" + nút "Đăng lên Fanpage" → gọi thẳng `postToPage()` (proxy qua Cloudflare Worker tới Facebook Graph API). Không có:

- Bản xem trước bài viết trước khi đăng.
- Lịch sử các bài đã đăng (đăng lúc nào, ai đăng, thành công hay lỗi).
- Khả năng soạn trước và đăng vào một thời điểm khác.

Có một bản demo cũ hơn (`ChatDemoPage.tsx`, route `/app/chat-demo`, dữ liệu giả) đã thử làm 2 cột soạn/xem trước — dùng làm tham khảo bố cục, không dùng làm chuẩn vì vẫn thiếu lịch sử/hàng chờ.

`StaffAnnouncementsPage.tsx` là bản cũ hơn nữa của cùng chức năng, đã bị thay thế (route `STAFF_ANNOUNCEMENTS` giờ chỉ redirect sang `STAFF_CHAT`) — không đụng tới.

## 2. Giả định quan trọng (đọc trước khi duyệt)

1. **Không có "lên lịch đăng tự động thật".** Firebase đang ở gói Spark → không có Cloud Functions/cron ở backend. Cloudflare Worker (`VITE_MESSENGER_WORKER_URL`) chỉ nhận request tức thời từ client đã đăng nhập (`postToPage()`), không tự chạy nền theo giờ hẹn. Vì vậy "Lên lịch" trong bản thiết kế mới nghĩa là: **đưa bài vào một hàng chờ** (lưu Firestore), và khi đến giờ, hệ thống hiển thị nhắc "Đến giờ đăng" ngay trong màn hình — Staff/Admin phải đang mở app và bấm "Đăng ngay" để bài thực sự được gửi lên Facebook. Đây là giới hạn kỹ thuật cần Admin hiểu rõ trước khi duyệt, không phải một bản rút gọn tuỳ tiện.
2. **Không hỗ trợ đính kèm ảnh/media trong vòng này.** `postToPage()` (Worker) hiện chỉ nhận `{ message, link }`, không có tham số ảnh. Thêm ảnh cần sửa hợp đồng API của Worker (nằm ngoài repo này) — ghi nhận là việc cho vòng sau, không làm ở đây. Cách "liên kết" (link) vẫn là phương án duy nhất để đính kèm nội dung ngoài, giống cách Giáo án dùng link thay vì Firebase Storage.
3. **Chỉ một Fanpage.** `PostPageInput` không có `pageId` → không làm bộ chọn nhiều Trang. Tên/logo Trang hiển thị trong bản xem trước là tĩnh (placeholder "Edumatrix Việt Nam"), vì `settings/messenger` (hằng số đã khai báo ở `collections.ts`) hiện chưa có màn cấu hình/đọc dữ liệu thật ở đâu trong code.
4. **Lịch sử đăng bài là dữ liệu mới**, chưa từng được lưu — `postToPage()` hiện tại gọi xong là xong, không ghi Firestore. Cần collection mới `fanpage_posts`, ghi trực tiếp từ client (giống cách `registerLeave()` của module Điểm danh ghi thẳng, không qua Worker) vì đây là hành động chỉ Admin dùng và Worker không có endpoint ghi log.
5. **Đính kèm ảnh theo đường dẫn công khai (URL) — không tải lên, không lưu trữ.** Đúng tiêu chí đã chốt của dự án (không dùng Cloud Storage kể cả khi có Blaze — xem `edumatrix_firebase_storage_removed_from_spark`), tính năng ảnh **không phải** là ô "chọn file từ máy". Admin dán sẵn đường dẫn ảnh **đã công khai trên Internet** (ảnh trên website trường, Google Drive đã bật chia sẻ công khai, ảnh từ bài đăng Fanpage cũ, CDN ảnh khác...). Hệ thống chỉ lưu **chuỗi URL** vào Firestore — không có byte ảnh nào đi qua hay nằm lại ở Edumatrix. Khi đăng, Worker gọi Facebook Graph API kèm chính URL đó (`POST /{page-id}/photos?url=...`), **Facebook tự tải ảnh từ URL** về máy chủ của họ. Đây là cách Meta hỗ trợ sẵn, không cần Edumatrix trung chuyển hay lưu file.
6. **Chưa làm video trong vòng này.** Chỉ ảnh, tối đa 4 ảnh/bài. Luồng video của Graph API phức tạp hơn (resumable upload, giới hạn thời lượng) và nhu cầu hiện tại (thông báo, sự kiện, ảnh thành tích học sinh) chủ yếu là ảnh. Nếu cần sau này, video cũng có thể theo đúng cơ chế "URL công khai, không lưu trữ" (`file_url`) — mở rộng chứ không đổi kiến trúc.
7. **Cần Worker hỗ trợ thêm tham số `imageUrls`.** `postToPage()` phía client sẽ gửi thêm mảng URL ảnh, nhưng Worker (Cloudflare Worker, nằm ngoài repo này) là nơi thực sự gọi Graph API — cần cập nhật Worker để nhận `imageUrls` và gọi đúng endpoint ảnh. Trước khi Worker cập nhật, trường ảnh vẫn hiển thị và cho nhập, nhưng nút đăng báo lỗi rõ ràng (giống cách xử lý `MESSENGER_NOT_CONFIGURED` hiện tại) thay vì âm thầm bỏ qua ảnh.

## 3. Chuỗi DB → Rules → Frontend

| Lớp | Hiện tại | Thay đổi |
|---|---|---|
| **DB** | Không có collection lưu bài Fanpage | Thêm `fanpage_posts` |
| **Rules** | — | `allow read/create: if isAdmin()`; `allow update` chỉ cho phép chuyển `scheduled → sent/failed/canceled`, các trường gốc (`message`, `link`, `actorUid`, `createdAt`, `scheduledFor`) giữ nguyên (`keepsImmutable`, cùng khuôn với `attendance`); `allow delete: if false` |
| **Service** | `postToPage()` trong `services/messenger/client.ts` chỉ nhận `{ message, link }` | Mở rộng `PostPageInput` thêm `imageUrls?: string[]` (chuỗi URL, không phải file); thêm `services/firestore/fanpagePosts.ts`: `createFanpagePost()`, `listFanpagePosts()`, `markFanpagePostResult()`, `cancelScheduledFanpagePost()` |
| **Frontend** | `Fanpage()` — 1 form phẳng trong `ChatPage.tsx` | Tách thành 4 file trong `features/announcements/components/fanpage/` (mục 5), `ChatPage.tsx` chỉ còn gọi `<FanpagePanel />` |

### Cấu trúc `fanpage_posts/{postId}`

```ts
interface FanpagePostDoc {
  message: string;
  link: string | null;
  imageUrls: string[] | null;       // URL ảnh công khai, tối đa 4 — CHỈ lưu chuỗi, không lưu file
  status: "sent" | "failed" | "scheduled" | "canceled";
  scheduledFor: Timestamp | null;   // null nếu đăng ngay
  actorUid: string;
  actorName: string;                // tên hiển thị, lưu kèm để khỏi phải join
  createdAt: Timestamp;
  sentAt: Timestamp | null;
  postId: string | null;            // id bài viết Graph API trả về khi thành công
  errorCode: string | null;
}
```

Rules cho `imageUrls` (trong `allow create`): `request.resource.data.imageUrls == null || (request.resource.data.imageUrls is list && request.resource.data.imageUrls.size() <= 4)` — chỉ kiểm tra hình dạng dữ liệu (mảng chuỗi, tối đa 4 phần tử), không kiểm tra ảnh có tải được hay không (việc đó thuộc về Facebook khi Worker gọi Graph API).

## 4. Luồng nghiệp vụ mới

**Đăng ngay:** Soạn nội dung → bấm "Đăng lên Fanpage" → gọi `postToPage()` → biết kết quả ngay → `createFanpagePost()` ghi 1 lần với `status: "sent"` (kèm `postId`) hoặc `status: "failed"` (kèm `errorCode`). Không đổi trải nghiệm so với hiện tại, chỉ thêm bước ghi log.

**Lên lịch:** Soạn nội dung → chọn "Lên lịch" → chọn ngày giờ → bấm "Thêm vào hàng chờ" → **không gọi Worker** → `createFanpagePost()` ghi `status: "scheduled"` + `scheduledFor`. Bài xuất hiện ở tab "Hàng chờ & Lịch sử".

**Xử lý hàng chờ:** Ở tab "Hàng chờ & Lịch sử", bài `scheduled` có `scheduledFor <= now` được đánh dấu "Đến giờ đăng" (badge cam) kèm nút "Đăng ngay" → gọi `postToPage()` rồi `markFanpagePostResult()` chuyển sang `sent`/`failed`. Bài `scheduled` trong tương lai có nút "Hủy lịch" → `cancelScheduledFanpagePost()` → `status: "canceled"`.

**Ảnh đính kèm:** ở cả 2 luồng trên, nếu Admin đã dán URL ảnh, `imageUrls` được gửi kèm `message`/`link` cho cả `postToPage()` (khi đăng ngay) lẫn `createFanpagePost()` (ghi log/hàng chờ) — xử lý như một trường dữ liệu bình thường, không có bước tải/lưu file nào chen vào giữa.

**Thống kê nhanh** (tính từ chính danh sách đã tải, không cần collection tổng hợp riêng vì khối lượng thấp — tính năng chỉ Admin dùng): số bài đã đăng 30 ngày qua, số đang chờ lịch, số lỗi cần xử lý.

## 5. Cấu trúc frontend

```
src/features/announcements/components/fanpage/
  FanpagePanel.tsx     -- điều phối: 2 tab con (Soạn bài / Hàng chờ & Lịch sử), state chung
  Composer.tsx          -- form soạn: nội dung, liên kết, ảnh (URL công khai, tối đa 4), toggle Đăng ngay/Lên lịch, ngày giờ
  ImageUrlInput.tsx     -- ô nhập URL ảnh dạng chip + lưới thumbnail xem trước (tải trực tiếp từ URL ngoài, không qua server)
  PostPreviewCard.tsx   -- thẻ xem trước kiểu Facebook (chữ + liên kết + lưới ảnh), dùng lại ở Composer
  PostQueueList.tsx     -- 3 chip thống kê + danh sách hàng chờ/lịch sử (kèm thumbnail nhỏ nếu có ảnh) + hành động
```

`ChatPage.tsx`: xoá hàm `Fanpage()` nội bộ, thay bằng `<FanpagePanel configured={configured} actorUid={uid} actorName={...} />` tại đúng chỗ `section === "fanpage"`. Tab bar chính (Hội thoại / Nhật ký gửi / Đăng Fanpage) giữ nguyên.

## 6. Ngôn ngữ thiết kế áp dụng (không dùng mặc định chung chung)

Tái sử dụng nguyên trạng các quy ước đã có trong `ChatPage.tsx` và toàn hệ thống, không phát minh mới:

- Khung thẻ: `rounded-card border border-neutral-200 bg-white`, tiêu đề `border-b border-neutral-200 px-5 py-4`.
- `StatusBadge` (5 tone success/warning/danger/info/neutral) cho trạng thái bài viết.
- Toggle dạng viên thuốc `grid grid-cols-2 gap-1 rounded-input bg-neutral-100 p-1` — y hệt bộ lọc "Tất cả/Chưa đọc" đang dùng ở `Conversations`.
- Nút submit gradient `linear-gradient(135deg,#3366F0,#1D39AC)` + `.motion-control` cho hiệu ứng nhấn (đã định nghĩa ở `index.css`, không cần thêm CSS mới).
- Font Be Vietnam Pro, bo góc `rounded-input` (8px)/`rounded-card` (12px).

## 7. Bản Demo

File tĩnh `docs/edumatrix-ui-fanpage-demo-17-07-2026.html`, dựng lại đúng khung Sidebar/Topbar hiện có (mục "Chat" trong nhóm "Chức năng"), 3 tab của Chat với "Đăng Fanpage" đang mở, bên trong có 2 tab con "Soạn bài" (mặc định) và "Hàng chờ & Lịch sử" — dữ liệu mẫu, có banner "DEMO — chờ duyệt" cố định đầu trang.
