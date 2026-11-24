# Các vấn đề cần sửa sau code review

Phạm vi review: nhánh `codex/meta-sync-full-fix` so với `origin/main`, merge base `07a10365d90fcc9546f05440662112de9337b8c0`.

## 1. [P1] Không xóa Staff khi UID vẫn còn được phân công

> **Trạng thái 23/11/2026:** đã chặn ở rules — chỉ Admin được xoá tài khoản (commit `fc4aead`, nhánh `fix/dot-1-quyen-tien-du-lieu`); kiểm tra phụ thuộc vẫn chạy ở client trước khi xoá.

- File: `src/services/firestore/users.ts`
- Vị trí: hàm `deleteUserAccount`, khoảng dòng 201–212.
- Hiện trạng: hàm chỉ gỡ liên kết thông qua `currentUser.studentIds`, trường này thường rỗng với Teacher/Admin, rồi xóa hồ sơ `users/{uid}`.
- Ảnh hưởng: UID đã xóa vẫn có thể nằm trong `classes.teacherIds`, `courses.teacherIds` và `students.teacherIds`. Dữ liệu phân công trở thành tham chiếu treo, trong khi giao diện cho phép xóa mọi tài khoản Staff khác tài khoản đang đăng nhập.
- Cách sửa đề xuất: chặn xóa khi Staff còn được phân công, hoặc gỡ/chuyển toàn bộ phân công liên quan trong cùng một quy trình nhất quán trước khi xóa hồ sơ.

## 2. [P2] Không dịch dữ liệu do người dùng nhập

- File: `src/features/preferences/DocumentTranslationBridge.tsx`
- Vị trí: hàm `applyTextNode`, khoảng dòng 29–31.
- Hiện trạng: bridge áp dụng bảng dịch lên mọi text node không bị đánh dấu bỏ qua.
- Ảnh hưởng: tên học sinh, nội dung chat, ghi chú, bài tập và dữ liệu nghiệp vụ có thể bị thay thế theo substring khi chọn tiếng Anh, khiến nội dung lưu trữ được hiển thị sai.
- Cách sửa đề xuất: chỉ dịch các chuỗi giao diện được khai báo rõ ràng. Nếu tiếp tục dùng bridge DOM, phải đánh dấu đầy đủ các vùng dữ liệu động bằng `translate="no"` hoặc `data-no-translate`.

## 3. [P2] Tránh tạo một Firestore listener cho mỗi học sinh

- File: `src/services/firestore/chat.ts`
- Vị trí: hàm `subscribeChatThreads`, khoảng dòng 58–69; luồng tải ban đầu trong `listChatThreads` cũng có cùng kiểu truy vấn.
- Hiện trạng: mỗi học sinh được phân công tạo một realtime listener và một truy vấn riêng.
- Ảnh hưởng: giáo viên có roster lớn có thể mở hàng trăm listener/query đồng thời. Mỗi callback còn gộp và sắp xếp lại toàn bộ kết quả, làm tăng độ trễ và chi phí Firestore.
- Cách sửa đề xuất: gom `studentId` thành các nhóm dùng toán tử `in` với tối đa 30 phần tử, hoặc điều chỉnh Firestore rules để truy vấn trực tiếp theo `assignedTeacherIds` bằng số listener cố định.

## Kết quả kiểm tra

- TypeScript typecheck: thành công.
- Frontend unit tests: 305/305 test thành công.
- Messenger worker tests: 55/55 test thành công.
- Firestore rules tests: các test hiển thị đã chạy thành công, nhưng tiến trình tổng thể kết thúc với lỗi hạ tầng Vitest `ERR_IPC_CHANNEL_CLOSED`; lệnh trả mã thoát 1.
