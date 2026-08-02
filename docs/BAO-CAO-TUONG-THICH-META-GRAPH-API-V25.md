# Báo cáo tương thích Meta Graph API v25.0

Ngày rà soát: 31/07/2026

## Kết luận

Messenger Worker và luồng kết nối Facebook Page tương thích với Graph API
`v25.0` sau các thay đổi trong repository này. Không deploy và không thay đổi
secret trong đợt rà soát.

| Luồng | Endpoint v25.0 | Payload/quyền |
| --- | --- | --- |
| OAuth | `/v25.0/dialog/oauth`, `/v25.0/oauth/access_token` | OAuth code flow giữ nguyên |
| Liệt kê Page/token | `GET /v25.0/me/accounts` | `id,name,access_token,picture`; `pages_show_list` |
| Gửi Messenger | `POST /v25.0/{page-id}/messages` | `RESPONSE`, `MESSAGE_TAG`, `UTILITY`; `pages_messaging` |
| Hồ sơ PSID | `GET /v25.0/{psid}` | `first_name,last_name,profile_pic`; `pages_messaging` |
| Đăng ảnh nháp | `POST /v25.0/{page-id}/photos` | `url`, `published:false`; `pages_manage_posts` |
| Đăng Page | `POST /v25.0/{page-id}/feed` | `message`, `link` hoặc `attached_media`; `pages_manage_posts` |
| Webhook | `/webhook` của Worker | GET challenge; POST kiểm tra `X-Hub-Signature-256` |

Nguồn đối chiếu: [Meta Messenger Platform API collection](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api),
[Meta Send API](https://www.postman.com/meta/messenger-platform-api/folder/22794852-685b3d8d-4ff2-482f-8a9f-5cec3245eb6f),
[Meta Page access token flow](https://www.postman.com/meta/facebook/request/bqfxwbp/get-access-tokens-of-pages-you-manage),
[Meta Webhooks flow](https://www.postman.com/meta/messenger-platform-api/folder/22794852-b5d97624-14d8-4e67-a2e4-529add49ca58).

## Thao tác thủ công bắt buộc trên Meta Dashboard

1. **Settings → Advanced:** đặt Graph API version của App thành `v25.0`.
2. **Webhooks → Page:** đặt version subscription thành `v25.0`, giữ Callback URL
   production hiện tại và Verify Token hiện tại; bấm **Verify and Save**.
3. Subscribe đúng Page cho các field `messages`, `messaging_postbacks` và
   `messaging_referrals`. Luồng chọn Page trong EduMatrix không tự gọi
   `/{page-id}/subscribed_apps`.
4. **Facebook Login for Business/Facebook Login → Settings:** xác nhận Valid
   OAuth Redirect URI là
   `https://edumatrix-messenger-production.edumatrix-vn.workers.dev/api/meta/connect/callback`.
5. **App Review → Permissions and Features:** xác nhận Advanced Access cho
   `pages_show_list`, `pages_manage_metadata`, `pages_messaging`,
   `pages_read_engagement`; thêm `pages_manage_posts` nếu dùng chức năng đăng
   Page; chỉ thêm/bật `page_utility_messaging` sau khi Utility được duyệt.
6. Sau khi quyền OAuth thay đổi, Admin phải kết nối lại Fanpage trong EduMatrix
   để Page Access Token mới nhận scope mới. Không sửa token trong repository.
7. Trước khi Live, dùng tài khoản App Admin/Tester chạy smoke test: nhận một tin
   nhắn, trả lời trong cửa sổ 24 giờ, mở link referral và đăng một bài thử. Không
   bật Utility cho tới khi template và quyền Utility đã được Meta phê duyệt.

## Không thực hiện trong đợt này

- Không deploy Worker/frontend.
- Không đổi, đọc hoặc ghi `META_PAGE_ACCESS_TOKEN`, `META_APP_SECRET`,
  `META_WEBHOOK_VERIFY_TOKEN` hay Firebase private key.
- Không chuyển App sang Live, không gửi App Review và không bật
  `UTILITY_MESSAGING_ENABLED`.
