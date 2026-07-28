import LegalPageLayout from "../components/LegalPageLayout";

const sectionTitleClass = "text-xl font-bold text-slate-950";

export default function DataDeletionPage() {
  return (
    <LegalPageLayout
      title="Hướng dẫn yêu cầu xóa dữ liệu"
      description="Bạn có thể yêu cầu xóa dữ liệu tài khoản EduMatrix hoặc dữ liệu liên kết với Facebook Messenger theo các bước dưới đây."
    >
      <section>
        <h2 className={sectionTitleClass}>Cách gửi yêu cầu</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-6 text-slate-700">
          <li>
            Liên hệ quản trị viên của trường hoặc trung tâm đã cấp tài khoản
            EduMatrix cho bạn.
          </li>
          <li>
            Cung cấp email dùng để đăng nhập, tên đơn vị đào tạo và nội dung cần
            xử lý: xóa tài khoản, xóa hội thoại Messenger hoặc hủy liên kết
            Facebook với học sinh.
          </li>
          <li>
            Hoàn thành bước xác minh danh tính do quản trị viên hướng dẫn. Không
            gửi mật khẩu, mã OTP, Page Access Token hoặc khóa bí mật.
          </li>
          <li>
            Sau khi phạm vi và quyền yêu cầu được xác nhận, quản trị viên sẽ xử
            lý dữ liệu thuộc đơn vị quản lý và thông báo kết quả cho bạn.
          </li>
        </ol>
      </section>

      <section>
        <h2 className={sectionTitleClass}>Nếu bạn không đăng nhập được</h2>
        <p className="mt-3 text-slate-700">
          Hãy liên hệ trực tiếp trường hoặc trung tâm đã đăng ký hồ sơ của bạn.
          Cung cấp email hoặc số điện thoại đã dùng khi đăng ký để đơn vị xác
          minh. Không đăng thông tin định danh cá nhân lên kênh công khai.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>Dữ liệu Messenger</h2>
        <p className="mt-3 text-slate-700">
          Bạn có thể yêu cầu ngừng liên kết tài khoản Facebook với hồ sơ học
          sinh và xóa dữ liệu hội thoại do EduMatrix lưu giữ. Việc xóa tại
          EduMatrix không tự động xóa bản sao tin nhắn đang được Meta hoặc chính
          tài khoản Facebook của bạn lưu trữ; các dữ liệu đó chịu sự quản lý
          theo công cụ và chính sách của Meta.
        </p>
      </section>

      <section>
        <h2 className={sectionTitleClass}>Phạm vi xử lý</h2>
        <p className="mt-3 text-slate-700">
          Một số dữ liệu có thể cần được giữ lại khi đơn vị đào tạo có nghĩa vụ
          pháp lý, kế toán, giải quyết tranh chấp hoặc bảo vệ an toàn hệ thống.
          Khi đó, dữ liệu sẽ chỉ được giữ trong phạm vi cần thiết và được hạn
          chế truy cập.
        </p>
      </section>
    </LegalPageLayout>
  );
}
