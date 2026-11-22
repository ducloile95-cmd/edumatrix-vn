# Edumatrix Zalo Utility Service

Đây là dịch vụ phụ trợ tự chạy (self-hosted) độc lập giúp tích hợp và tự động hóa gửi tin nhắn qua **Zalo cá nhân** bằng cách giả lập trình duyệt Web (`zca-js`).

## Cách hoạt động
1. Máy chủ khởi chạy, nếu không có session cũ sẽ hiển thị đường dẫn hình ảnh QR code trong terminal.
2. Bạn dùng ứng dụng Zalo trên điện thoại quét mã QR này để đăng nhập.
3. Khi đăng nhập thành công, session được lưu lại vào `zalo-credentials.json` để tự kết nối lại trong những lần chạy sau.
4. Máy chủ cung cấp HTTP API Endpoint `/api/send-message` bảo mật bằng Bearer token để hệ thống chính gọi sang.

## Hướng dẫn cài đặt và chạy

### 1. Cài đặt các gói phụ thuộc
Di chuyển vào thư mục `zalo-service` và cài đặt npm packages:
```bash
cd zalo-service
npm install
```

### 2. Chạy ứng dụng
* **Chạy ở chế độ phát triển (auto reload):**
  ```bash
  npm run dev
  ```
* **Chạy ở chế độ production:**
  ```bash
  npm start
  ```

### 3. Đăng nhập lần đầu
Khi chạy lần đầu, hãy nhìn màn hình console, bạn sẽ thấy thông báo:
`[ZALO SERVICE] Vui lòng quét mã QR tại đường dẫn này để đăng nhập: <đường-dẫn-ảnh-qr>`
Mở ảnh đó lên hoặc truy cập đường dẫn được hiển thị để quét mã QR bằng tài khoản Zalo của trung tâm.

---

## Tài liệu hướng dẫn sử dụng API

Mọi request gửi lên API cần được gửi kèm Header để xác thực:
`Authorization: Bearer edumatrix-zalo-token-secret-999` *(Bạn có thể thay đổi token này thông qua biến môi trường `API_TOKEN`)*

### 1. Kiểm tra trạng thái kết nối
* **Method:** `GET`
* **URL:** `http://localhost:3000/api/status`
* **Headers:** Không yêu cầu

### 2. Gửi tin nhắn tự động
* **Method:** `POST`
* **URL:** `http://localhost:3000/api/send-message`
* **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer edumatrix-zalo-token-secret-999`
* **Request Body (JSON):**
  ```json
  {
    "phoneNumber": "0912345678",
    "message": "Edumatrix thông báo: Con bạn đã điểm danh thành công lớp Toán học 8A."
  }
  ```
* **Response thành công (JSON):**
  ```json
  {
    "success": true,
    "message": "Gửi tin nhắn Zalo thành công!",
    "targetUid": "82736152435465768"
  }
  ```

---

## Lưu ý quan trọng
- **Lạm dụng gửi tin cho người lạ:** Nếu số điện thoại nhận tin chưa từng kết bạn hoặc trò chuyện với số Zalo này, tin nhắn dễ bị chặn và tài khoản có thể bị khóa. **Khuyến cáo trung tâm nên yêu cầu phụ huynh kết bạn trước** khi kích hoạt luồng nhận tin nhắn Zalo.
- **Duy trì session:** Hạn chế đăng nhập Zalo Web trên trình duyệt máy tính khác bằng chính số điện thoại này, vì Zalo chỉ duy trì một phiên đăng nhập Web tại một thời điểm. Nếu bị logout, chỉ cần quét lại mã QR trên server.

## Proxy và chống gửi trùng

- Chỉ đặt `TRUST_PROXY=1` khi service thật sự chạy sau reverse proxy (nginx, Cloudflare Tunnel...). Mặc định không tin `X-Forwarded-For`, để người gọi không giả mạo IP mà né rate limit.
- Gửi lại cùng `Idempotency-Key` nhưng khác số điện thoại hoặc nội dung sẽ nhận `409`, thay vì âm thầm trả kết quả cũ.
