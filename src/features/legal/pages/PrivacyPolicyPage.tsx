import LegalPageLayout from "../components/LegalPageLayout";

const sectionTitleClass = "text-xl font-bold text-slate-950";
const listClass = "mt-3 list-disc space-y-2 pl-6 text-slate-700";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Chính sách quyền riêng tư"
      description="Chính sách này giải thích cách EduMatrix thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu khi nhà trường, trung tâm, giáo viên, phụ huynh và học sinh sử dụng hệ thống."
    >
      <section>
        <h2 className={sectionTitleClass}>1. Phạm vi áp dụng</h2>
        <p className="mt-3 text-slate-700">
          EduMatrix là hệ thống hỗ trợ quản lý hoạt động giáo dục và giao tiếp
          giữa đơn vị đào tạo với người học, phụ huynh. Đơn vị trường hoặc trung
          tâm cấp tài khoản và quản lý dữ liệu nghiệp vụ của mình trên hệ thống.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>2. Dữ liệu có thể được xử lý</h2>
        <ul className={listClass}>
          <li>Thông tin tài khoản như họ tên, email, vai trò và trạng thái truy cập.</li>
          <li>
            Thông tin phục vụ quản lý học tập như hồ sơ học sinh, lớp học, lịch
            học, điểm danh, đánh giá, học phí và trạng thái thanh toán.
          </li>
          <li>
            Dữ liệu Messenger như mã định danh người dùng theo Trang Facebook,
            tên hiển thị, ảnh đại diện, nội dung hội thoại và trạng thái gửi,
            nhận hoặc đã đọc.
          </li>
          <li>
            Thông tin tệp và thư mục được người dùng chủ động chọn khi sử dụng
            tính năng tích hợp Google Drive.
          </li>
          <li>
            Dữ liệu kỹ thuật cần thiết để vận hành và bảo mật, chẳng hạn thời
            điểm truy cập, nhật ký lỗi và thông tin phiên đăng nhập.
          </li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitleClass}>3. Mục đích sử dụng</h2>
        <ul className={listClass}>
          <li>Xác thực người dùng và phân quyền truy cập.</li>
          <li>Vận hành các chức năng quản lý lớp học và học sinh.</li>
          <li>
            Gửi, nhận và lưu lịch sử trao đổi với phụ huynh qua Messenger theo
            quyền và chính sách của Meta.
          </li>
          <li>Hỗ trợ thanh toán, đối soát và thông báo nghiệp vụ.</li>
          <li>Phát hiện lỗi, ngăn chặn lạm dụng và bảo vệ hệ thống.</li>
        </ul>
      </section>

      <section>
        <h2 className={sectionTitleClass}>4. Nền tảng và nhà cung cấp</h2>
        <p className="mt-3 text-slate-700">
          EduMatrix có thể sử dụng Firebase để xác thực, lưu trữ và phân phối
          ứng dụng; Cloudflare Workers để xử lý tích hợp máy chủ; Meta Messenger
          Platform để trao đổi tin nhắn; Google Drive khi người dùng lựa chọn
          tệp; và dịch vụ hiển thị hoặc đối soát thông tin thanh toán. Mỗi nền
          tảng xử lý dữ liệu theo điều khoản và chính sách riêng của họ.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>5. Chia sẻ và bán dữ liệu</h2>
        <p className="mt-3 text-slate-700">
          EduMatrix không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ trong
          phạm vi cần thiết để cung cấp chức năng, thực hiện yêu cầu hợp pháp
          hoặc bảo vệ an toàn của người dùng và hệ thống.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>6. Bảo mật và lưu giữ</h2>
        <p className="mt-3 text-slate-700">
          Hệ thống áp dụng kết nối HTTPS, kiểm soát truy cập theo vai trò và lưu
          bí mật tích hợp ở phía máy chủ. Dữ liệu được lưu trong thời gian cần
          thiết để cung cấp dịch vụ, đáp ứng nghĩa vụ quản lý của đơn vị đào tạo
          và xử lý các yêu cầu hợp pháp. Không có biện pháp kỹ thuật nào loại bỏ
          hoàn toàn mọi rủi ro, vì vậy người dùng không nên chia sẻ mật khẩu,
          mã truy cập hoặc khóa bí mật qua tin nhắn.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>7. Dữ liệu học sinh</h2>
        <p className="mt-3 text-slate-700">
          Dữ liệu học sinh được xử lý phục vụ hoạt động giáo dục dưới sự quản lý
          của đơn vị đào tạo và quyền giám hộ phù hợp. Người dùng chỉ được truy
          cập dữ liệu đúng vai trò và mục đích được giao.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>8. Quyền và yêu cầu của người dùng</h2>
        <p className="mt-3 text-slate-700">
          Người dùng có thể yêu cầu xem, chỉnh sửa, ngừng liên kết Messenger
          hoặc xóa dữ liệu bằng cách liên hệ quản trị viên của trường hoặc trung
          tâm đã cấp tài khoản EduMatrix. Quản trị viên sẽ xác minh danh tính và
          phạm vi dữ liệu trước khi xử lý. Chi tiết có tại trang hướng dẫn xóa
          dữ liệu.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>9. Thay đổi chính sách</h2>
        <p className="mt-3 text-slate-700">
          Chính sách có thể được cập nhật khi chức năng hoặc yêu cầu pháp lý
          thay đổi. Ngày cập nhật mới nhất luôn được hiển thị ở đầu trang.
        </p>
      </section>
    </LegalPageLayout>
  );
}
