# Kế hoạch nâng cấp module Cài đặt và theo dõi Firebase Spark

Ngày lập: 17/07/2026  
Phạm vi: Role Admin, bản demo để duyệt, chưa thay dữ liệu và Rules production.

## 1. Kết luận kiểm kê

- Module Cài đặt hiện có 4 tab: thông tin trường, vai trò và phân quyền, thông báo, giao diện.
- `settings/{docId}` hiện chỉ cho Admin đọc và ghi. Đây là mặc định an toàn nhưng chưa có schema riêng cho tích hợp và thanh toán.
- Ma trận phân quyền hiện chỉ để xem, phản ánh 3 role cố định trong Rules. Chưa có custom role và không được phép tạo cảm giác rằng giao diện có thể sửa Rules động.
- Module Người dùng hiện đã có Tổng quan, Staff, Phụ huynh/Học sinh. Nhánh Vai trò và phân quyền phù hợp hơn khi đặt tại đây.
- Thông tin QR đang được sao chép vào từng hóa đơn. Đây là dữ liệu công khai theo nghiệp vụ, khác với token API hoặc OAuth secret.

## 2. Kiến trúc thông tin đề xuất

### Module Người dùng

1. Tổng quan
2. Tài khoản Staff
3. Phụ huynh/Học sinh
4. Vai trò và phân quyền

Nhánh phân quyền chỉ hiển thị ma trận role hệ thống và phạm vi dữ liệu. Nếu cần custom role, phải có pha thiết kế Rules riêng, không dùng cấu hình Firestore để vượt qua Rules đã deploy.

### Module Cài đặt, Role Admin

1. Tổng quan hệ thống
   - Tình trạng Firebase Spark
   - Ước tính lượt đọc, ghi, xóa trong ứng dụng
   - Biểu đồ 7 ngày
   - Collection phát sinh nhiều thao tác
   - Cảnh báo ngưỡng
2. Hồ sơ trường học
3. Kết nối và API
   - Facebook Page
   - Google Drive
   - API công khai và webhook
4. Thanh toán và QR
5. Thông báo
6. Giao diện

## 3. Nguyên tắc thiết kế

- Chế độ: redesign-preserve, giữ cobalt Edumatrix, neutral ấm và font Be Vietnam Pro.
- DESIGN_VARIANCE: 5/10. Lưới lệch nhẹ, phần theo dõi Spark rộng hơn phần cảnh báo.
- MOTION_INTENSITY: 3/10. Chỉ hover, focus và chuyển tab ngắn; tôn trọng reduced motion.
- VISUAL_DENSITY: 7/10. Nhiều dữ liệu nhưng giữ khoảng thở, số dùng tabular numerals.
- Một hệ bán kính: input 8px, card 12px, modal 16px.
- Không dùng gradient trong bảng hoặc nền nội dung. Cobalt chỉ làm accent, trạng thái dùng màu ngữ nghĩa.
- Desktop dùng điều hướng dọc trong module; mobile chuyển thành thanh tab ngang.

## 4. Mô hình theo dõi Spark khả thi

### Số liệu chính thức

Theo tài liệu Firebase cập nhật tháng 07/2026, quota Firestore miễn phí gồm 50.000 document reads/ngày, 20.000 writes/ngày, 20.000 deletes/ngày, 1 GiB lưu trữ và 10 GiB outbound/tháng. Quota ngày reset khoảng nửa đêm theo giờ Pacific.

Firebase và Google Cloud Console có usage dashboard. Số liệu được lấy mẫu mỗi phút và có thể mất tới 4 phút để hiển thị. Dashboard cũng chỉ là ước tính và có thể khác số billed.

### Giới hạn client-side

Web SDK không có API an toàn để đọc tổng usage của project. Cloud Monitoring yêu cầu quyền IAM `monitoring.timeSeries.list`; không được nhúng access token hoặc service-account key vào frontend.

Vì vậy production có hai cấp:

- Cấp Spark client-only: đo thao tác do Edumatrix chủ động thực hiện qua một lớp `instrumentedFirestore`, lưu rollup theo ngày. Số liệu phải ghi nhãn “Ước tính trong ứng dụng”. Không đếm được Firebase Console, client cũ, index reads và một số thao tác nội bộ.
- Cấp đối soát: nút mở Firebase Console Usage. Đây là nguồn kiểm tra chính thức khả dụng trong điều kiện không có backend tin cậy.

Không quét toàn bộ collection để đếm document. Cách đó tự tạo thêm reads và đi ngược mục tiêu tiết kiệm Spark.

### Chuỗi tính toán đề xuất

```text
Firestore service wrapper
  -> ghi nhận read/write/delete dự kiến trong bộ nhớ
  -> gộp theo uid + ngày + collection
  -> flush theo nhịp giới hạn
  -> usage_events/{uid_date_collection}
  -> Admin đọc tối đa 7 hoặc 30 ngày
  -> tổng hợp tại client bằng hàm thuần
  -> cảnh báo 60%, 80%, 95% quota
```

Rollup không cấp quyền và không được dùng cho billing. Client chỉ ghi document mang `uid` của chính mình; Admin được đọc. Mỗi update chỉ được tăng trong biên nhỏ để hạn chế làm sai số liệu.

## 5. Dữ liệu Cài đặt và Rules

| Document | Nội dung | Đọc | Ghi |
| --- | --- | --- | --- |
| `settings/general` | Hồ sơ trường | Admin | Admin |
| `settings/integrations_public` | Page ID, Drive folder ID, trạng thái kết nối | Admin | Admin |
| `settings/payment` | Bank BIN, số tài khoản, tên tài khoản, mẫu nội dung | Admin | Admin |
| `public_settings/payment` | Projection tối thiểu dùng khi tạo hóa đơn | Active user theo nghiệp vụ | Admin |
| `usage_events/{uid_date_collection}` | Rollup ước tính | Admin hoặc chính chủ | Chính chủ, tăng có giới hạn |

Không lưu trong Firestore client-readable:

- Facebook access token
- Google OAuth refresh token
- Service-account JSON
- API secret hoặc webhook signing secret

Nếu yêu cầu kết nối thật Facebook hoặc Drive, cần một secure broker ở hạ tầng ngoài client. Spark không cho phép deploy Cloud Functions mới. Bản client-only chỉ lưu định danh công khai, trạng thái và đường dẫn chia sẻ đã cấp quyền sẵn.

## 6. Thanh toán và QR

- Dùng `qrcode.react` hiện có, không thêm dependency.
- Cấu hình ngân hàng chỉ Admin sửa.
- Khi tạo hóa đơn, snapshot bank BIN, số tài khoản, tên tài khoản và nội dung thanh toán vào invoice để lịch sử không đổi khi Admin cập nhật cấu hình.
- Không coi QR là xác nhận thanh toán. Luồng `payments` hiện tại vẫn cần Staff đối soát.

## 7. Lộ trình triển khai sau khi duyệt

### Cấu trúc giao diện

- Chuyển `RolesPermissionsTab` sang feature Người dùng.
- Tạo Settings shell mới và 6 nhánh như mục 2.
- Giữ route `/app/settings` và `/app/users`; chỉ thay nội dung sau duyệt.

### Logic và Rules

- Định nghĩa schema Zod cho từng settings document.
- Tách public projection thanh toán khỏi cấu hình Admin.
- Tạo wrapper đo usage và hàm tổng hợp thuần có unit test.
- Bổ sung Rules cho `usage_events` và `public_settings/payment`.
- Thêm emulator tests: Admin, Teacher, Viewer, người chưa đăng nhập, tăng vượt biên, giả uid, thay khóa bất biến.

### Kiểm thử chấp nhận

- Admin truy cập đủ 6 nhánh, Teacher không truy cập cấu hình Admin.
- Không có secret trong bundle, localStorage, Firestore hoặc log.
- Dashboard luôn ghi rõ nguồn dữ liệu và thời điểm cập nhật.
- Tính tỷ lệ quota không chia cho 0, clamp trong 0-100%, dùng timezone rõ ràng.
- Không quét collection để tạo dashboard.
- Typecheck, lint, unit test, Rules emulator test và build đều đạt.

## 8. Phạm vi bản demo

- Route riêng `/app/settings-demo`, chỉ Admin truy cập.
- Dữ liệu minh họa không đọc hoặc ghi Firestore.
- Có đủ Tổng quan Spark, Kết nối/API, Thanh toán/QR và preview nhánh Vai trò và phân quyền trong Người dùng.
- Module production và Rules production giữ nguyên cho đến khi được duyệt.

## 9. Nguồn chính thức

- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/docs/firestore/monitor-usage
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans

