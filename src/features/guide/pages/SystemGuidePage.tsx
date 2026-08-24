import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Images,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  NotebookPen,
  Presentation,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ROUTES, systemGuideRoleForUserRole } from "@/constants/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";

type GuideRole = "teacher" | "parent";

interface Screenshot {
  src: string;
  alt: string;
  title: string;
  description: string;
}

interface GuideChapter {
  id: string;
  icon: ReactNode;
  title: string;
  summary: string;
  actions: Array<{ title: string; body: string }>;
  notes?: string[];
  screenshot?: Screenshot;
}

const teacherScreenshots = {
  lessonPlan: {
    src: "/guide/teacher-lesson-plan.png",
    alt: "Màn hình soạn giáo án trên web app Edumatrix",
    title: "Editor giáo án theo buổi học",
    description: "Mục tiêu, học liệu Drive, tiến trình hoạt động và tổng thời lượng được đặt trong một không gian soạn tập trung.",
  },
  classroom: {
    src: "/guide/teacher-classroom.png",
    alt: "Màn hình tương tác lớp học của giáo viên",
    title: "Workspace tương tác lớp học",
    description: "Giáo viên ghi nhận chuyên cần, mức độ hoàn thành bài tập, nội dung đã dạy và bản tổng kết gửi phụ huynh.",
  },
  attendance: {
    src: "/guide/teacher-attendance.png",
    alt: "Màn hình điểm danh theo buổi học",
    title: "Điểm danh theo buổi",
    description: "Mỗi học sinh có trạng thái rõ ràng, ghi chú riêng và thống kê chuyên cần gần nhất.",
  },
  learning: {
    src: "/guide/teacher-learning.png",
    alt: "Màn hình bài tập và điểm của giáo viên",
    title: "Bài tập và điểm",
    description: "Theo dõi bài chờ chấm, chấm điểm, phản hồi và yêu cầu học sinh làm lại ngay trong cùng một module.",
  },
  chat: {
    src: "/guide/teacher-chat.png",
    alt: "Màn hình soạn tin nhắn gửi phụ huynh",
    title: "Trao đổi với phụ huynh",
    description: "Chọn học sinh, chủ đề, cách gửi và nội dung phù hợp chính sách trước khi gửi.",
  },
} satisfies Record<string, Screenshot>;

const teacherChapters: GuideChapter[] = [
  {
    id: "teacher-start",
    icon: <LayoutDashboard size={20} />,
    title: "Bắt đầu ngày dạy",
    summary: "Dùng Tổng quan để xác định việc cần ưu tiên trước khi mở từng module.",
    actions: [
      { title: "Đăng nhập đúng tài khoản", body: "Dùng email đã được Admin mời và chọn đúng hồ sơ Teacher. Nếu tài khoản bị khóa, liên hệ Admin thay vì tạo tài khoản mới." },
      { title: "Kiểm tra lớp được phân công", body: "Teacher chỉ thao tác trên lớp, khóa học, học sinh và buổi học thuộc phạm vi được gán. Nếu thiếu lớp, yêu cầu Admin cập nhật phân công." },
      { title: "Đọc các việc cần xử lý", body: "Ưu tiên buổi sắp diễn ra, giáo án chưa hoàn thiện, buổi chưa điểm danh, bài chờ chấm và thông báo cần phản hồi." },
    ],
    notes: ["Thanh bên trái là điều hướng đầy đủ trên desktop.", "Trên điện thoại, dùng thanh điều hướng dưới cùng và nút Khác để mở toàn bộ chức năng."],
  },
  {
    id: "teacher-lesson-plan",
    icon: <NotebookPen size={20} />,
    title: "Tạo luồng giáo án hoàn chỉnh",
    summary: "Giáo án được tổ chức từ chương trình khóa, thư viện bài học chuẩn đến giáo án gắn với từng buổi dạy.",
    actions: [
      { title: "Chọn đúng không gian làm việc", body: "Mở Giáo án. Dùng Chương trình khóa để sắp thứ tự nội dung, Thư viện bài học để tái sử dụng mẫu và Buổi dạy để soạn giáo án thực tế." },
      { title: "Gắn lớp và buổi học", body: "Chọn khóa học, lớp và buổi học cụ thể. Đây là liên kết giúp giáo án xuất hiện đúng trong lịch dạy và Tương tác lớp học." },
      { title: "Nhập thông tin chung", body: "Đặt tiêu đề rõ ràng, thời lượng dự kiến, mục tiêu kiến thức, kỹ năng, thái độ hoặc năng lực và yêu cầu chuẩn bị cho giáo viên, học sinh." },
      { title: "Thêm học liệu", body: "Chọn tệp từ Google Drive, tải tệp mới hoặc gắn liên kết phù hợp. Luôn kiểm tra quyền truy cập của tài liệu trước giờ dạy." },
      { title: "Xây tiến trình hoạt động", body: "Tạo các hoạt động theo trình tự dạy thật. Mỗi hoạt động cần tên, số phút, cách thực hiện và kết quả mong đợi." },
      { title: "Kiểm tra tổng thời lượng", body: "Tổng số phút của các hoạt động cần khớp thời lượng buổi học. Nếu lệch, điều chỉnh trước khi lưu để tránh giáo án quá tải." },
      { title: "Hoàn thiện bài tập và tóm tắt", body: "Ghi bài tập về nhà, nội dung trọng tâm và phần phụ huynh có thể xem. Nội dung công khai phải ngắn, rõ và không chứa ghi chú nội bộ." },
      { title: "Lưu đúng trạng thái", body: "Lưu nháp khi đang soạn, lưu thành mẫu khi muốn tái sử dụng, hoặc phát hành khi giáo án đã sẵn sàng cho buổi dạy." },
    ],
    notes: ["Bản nháp cục bộ hỗ trợ khôi phục nội dung chưa lưu của đúng tài khoản.", "Không sửa giáo án đã phát hành nếu chưa kiểm tra ảnh hưởng đến buổi học và nội dung phụ huynh đã nhận."],
    screenshot: teacherScreenshots.lessonPlan,
  },
  {
    id: "teacher-students",
    icon: <Users size={20} />,
    title: "Quản lý học sinh đúng vòng đời",
    summary: "Hồ sơ học sinh là nguồn liên kết cho lớp học, phụ huynh, điểm danh, bài tập, điểm số và học phí.",
    actions: [
      { title: "Tìm trước khi tạo", body: "Tìm theo tên hoặc mã học sinh để tránh tạo hồ sơ trùng. Kiểm tra cả học sinh đang hoạt động và hồ sơ đã ngưng." },
      { title: "Tạo hồ sơ tối thiểu", body: "Nhập mã học sinh duy nhất, họ tên, tên gọi, ngày sinh, thông tin liên hệ và trạng thái. Dùng dữ liệu đúng hồ sơ trung tâm." },
      { title: "Phân vào lớp", body: "Mở chi tiết lớp hoặc hồ sơ học sinh để ghi danh. Một học sinh có thể học nhiều lớp nếu nghiệp vụ cho phép." },
      { title: "Liên kết phụ huynh", body: "Phụ huynh được liên kết qua lời mời hoặc yêu cầu khai báo đã được Admin duyệt. Kiểm tra đúng học sinh trước khi xác nhận." },
      { title: "Theo dõi hồ sơ tổng hợp", body: "Từ danh sách học sinh, xem lớp đang học, chuyên cần, kết quả học tập, khoản phí và tình trạng liên kết gia đình." },
      { title: "Ngưng thay vì xóa lịch sử", body: "Khi học sinh nghỉ học, ưu tiên đổi trạng thái hoặc kết thúc ghi danh. Không xóa hồ sơ có điểm danh, điểm số hoặc hóa đơn." },
    ],
    notes: ["Mã học sinh cần ổn định vì được dùng để đối chiếu trên nhiều module.", "Teacher chỉ nên chỉnh dữ liệu trong phạm vi được phân công; các thay đổi tài khoản thuộc quyền Admin."],
  },
  {
    id: "teacher-classroom",
    icon: <Presentation size={20} />,
    title: "Điều hành tương tác lớp học",
    summary: "Đây là luồng theo buổi, nối giáo án đã chuẩn bị với dữ liệu phụ huynh nhận sau giờ học.",
    actions: [
      { title: "Mở đúng buổi đang dạy", body: "Chọn buổi từ Lớp học hôm nay hoặc danh sách lớp. Kiểm tra tên lớp, thời gian, phòng học và trạng thái buổi." },
      { title: "Đọc giáo án đã gắn", body: "Mở giáo án để đối chiếu mục tiêu, hoạt động và học liệu. Nếu chưa có giáo án, quay lại module Giáo án và gắn đúng buổi." },
      { title: "Ghi nhận lớp", body: "Đánh dấu chuyên cần và mức độ hoàn thành bài tập cho từng học sinh. Dùng thao tác hàng loạt trước, sau đó sửa các trường hợp ngoại lệ." },
      { title: "Viết nhật ký nhanh", body: "Ghi nội dung thực tế đã dạy, tổng kết chung và bài tập về nhà. Thông tin phải phản ánh đúng diễn biến của buổi học." },
      { title: "Kiểm tra từng học sinh", body: "Bổ sung nhận xét riêng khi cần. Không ghi thông tin nhạy cảm hoặc nhận xét không phù hợp vào nội dung gửi phụ huynh." },
      { title: "Xem trước phụ huynh", body: "Mở tab xem trước để kiểm tra tiêu đề, chuyên cần, nội dung đã học, bài tập và nhận xét trước khi phát hành." },
      { title: "Hoàn tất và phát hành", body: "Hệ thống kiểm tra các trường bắt buộc. Sau khi xác nhận, tổng kết được phát hành và buổi học chuyển sang trạng thái đã khóa." },
      { title: "Đính chính khi thật sự cần", body: "Mở lại buổi đã phát hành, sửa nội dung, kiểm tra lại và phát hành bản cập nhật. Tránh sửa nhiều lần gây nhiễu thông tin gia đình." },
    ],
    notes: ["Lưu nháp trong lúc giảng dạy không gửi dữ liệu cho phụ huynh.", "Nút phát hành chỉ dùng sau khi đã kiểm tra số học sinh, chuyên cần, bài tập và nội dung tổng kết."],
    screenshot: teacherScreenshots.classroom,
  },
  {
    id: "teacher-attendance",
    icon: <ClipboardCheck size={20} />,
    title: "Điểm danh theo buổi",
    summary: "Điểm danh phải gắn đúng session để chuyên cần, cảnh báo và dashboard phụ huynh được cập nhật chính xác.",
    actions: [
      { title: "Chọn buổi học", body: "Ưu tiên buổi đang diễn ra hoặc buổi chưa hoàn tất. Kiểm tra lớp, giờ, phòng và giáo viên phụ trách." },
      { title: "Xác nhận trạng thái", body: "Chọn Có mặt, Đi muộn, Vắng có phép hoặc Vắng không phép cho từng học sinh. Dùng Tất cả có mặt để thao tác nhanh." },
      { title: "Ghi chú ngoại lệ", body: "Ghi số phút đi muộn, lý do nghỉ hoặc thông tin cần theo dõi. Không dùng ghi chú chung cho nhiều trường hợp khác nhau." },
      { title: "Lưu một lần hoàn chỉnh", body: "Kiểm tra số đã xác nhận bằng sĩ số lớp, sau đó lưu. Mở lại buổi để sửa nếu phát hiện sai." },
    ],
    screenshot: teacherScreenshots.attendance,
  },
  {
    id: "teacher-learning",
    icon: <FileCheck2 size={20} />,
    title: "Giao bài, chấm bài và cập nhật điểm",
    summary: "Module Bài tập và Điểm gom quy trình giao nhiệm vụ, theo dõi nộp bài, phản hồi và công bố kết quả.",
    actions: [
      { title: "Tạo bài tập", body: "Chọn lớp, đặt tiêu đề, mô tả, hạn nộp, hình thức nộp và thang điểm. Gắn giáo án hoặc buổi học khi có liên quan." },
      { title: "Theo dõi tiến độ", body: "Dùng bộ lọc Đang mở, Chờ chấm, Cần làm lại và Đã hoàn tất để ưu tiên đúng nhóm bài." },
      { title: "Chấm và phản hồi", body: "Mở từng bài nộp, nhập điểm, nhận xét cụ thể và lưu. Chỉ yêu cầu làm lại khi đã nêu rõ nội dung cần bổ sung." },
      { title: "Nhắc học sinh chưa nộp", body: "Kiểm tra đúng danh sách chưa nộp trước khi gửi nhắc. Tránh gửi lặp trong thời gian ngắn." },
      { title: "Công bố điểm", body: "Điểm đã công bố xuất hiện trong tiến trình học tập của phụ huynh. Kiểm tra thang điểm và nhận xét trước khi lưu hàng loạt." },
    ],
    screenshot: teacherScreenshots.learning,
  },
  {
    id: "teacher-communication",
    icon: <MessageCircleMore size={20} />,
    title: "Trao đổi với phụ huynh",
    summary: "Chat và thông báo giúp giáo viên gửi đúng nội dung tới đúng gia đình trong phạm vi lớp phụ trách.",
    actions: [
      { title: "Chọn đúng học sinh", body: "Tìm theo tên hoặc mã học sinh. Kiểm tra lớp và trạng thái liên kết phụ huynh trước khi soạn." },
      { title: "Chọn chủ đề và cách gửi", body: "Phân loại nội dung như học tập, chuyên cần, nhắc bài hoặc đánh giá. Dùng phương thức gửi phù hợp chính sách tích hợp." },
      { title: "Viết nội dung có hành động rõ", body: "Nêu sự việc, điều cần phụ huynh biết và việc cần phối hợp. Tránh thông tin dài hoặc mơ hồ." },
      { title: "Kiểm tra trước khi gửi", body: "Đọc lại tên học sinh, người nhận, nội dung và các giới hạn của Messenger. Chỉ bấm gửi một lần và theo dõi trạng thái." },
    ],
    screenshot: teacherScreenshots.chat,
  },
];

const parentChapters: GuideChapter[] = [
  {
    id: "parent-access",
    icon: <UserRoundCheck size={20} />,
    title: "Kích hoạt và liên kết con",
    summary: "Tài khoản phụ huynh chỉ xem dữ liệu của học sinh đã được trung tâm liên kết.",
    actions: [
      { title: "Dùng đúng email được mời", body: "Mở trang đăng nhập, chọn Kích hoạt tài khoản nếu đây là lần đầu dùng email và đặt mật khẩu theo yêu cầu." },
      { title: "Đăng nhập bằng Google khi phù hợp", body: "Nếu trung tâm mời đúng email Google, có thể đăng nhập bằng Google. Email phải được xác minh." },
      { title: "Khai báo khi chưa có lời mời", body: "Nếu hệ thống báo chưa có quyền, khai báo họ tên, tên gọi và ngày sinh của con để trung tâm đối chiếu." },
      { title: "Chờ trung tâm duyệt", body: "Yêu cầu liên kết ở trạng thái chờ duyệt sẽ tự cập nhật sau khi Admin xác nhận. Không gửi nhiều yêu cầu giống nhau." },
    ],
    notes: ["Nếu gia đình có nhiều con, tài khoản có thể được liên kết với nhiều mã học sinh.", "Không chia sẻ mật khẩu hoặc dùng chung tài khoản với người không có trách nhiệm chăm sóc học sinh."],
  },
  {
    id: "parent-dashboard",
    icon: <LayoutDashboard size={20} />,
    title: "Đọc Tổng quan của con",
    summary: "Dashboard tổng hợp chuyên cần, tiến trình điểm số, lịch học, bài tập, học phí và thông báo gần đây.",
    actions: [
      { title: "Chọn học sinh", body: "Nếu có nhiều con, dùng bộ chuyển học sinh ở đầu trang. Luôn kiểm tra tên đang hiển thị trước khi xem chi tiết." },
      { title: "Đọc nhịp học tập", body: "Theo dõi tỷ lệ chuyên cần, số buổi đi muộn hoặc vắng và các đánh giá gần nhất đã được Teacher công bố." },
      { title: "Mở nhóm cần xử lý", body: "Chọn Lịch học sắp tới, Bài tập cần nộp, Học phí cần xử lý hoặc Thông báo gần đây để xem đầy đủ." },
    ],
  },
  {
    id: "parent-schedule",
    icon: <CalendarDays size={20} />,
    title: "Theo dõi lịch học",
    summary: "Lịch học hiển thị theo tuần và theo lớp, kèm giờ, địa điểm và trạng thái từng buổi.",
    actions: [
      { title: "Chọn tuần", body: "Dùng nút tuần trước, tuần sau hoặc Hôm nay. Trên điện thoại, chuyển giữa danh sách và lịch tuần theo nhu cầu." },
      { title: "Mở chi tiết buổi", body: "Chọn một buổi để xem lớp, giáo viên, phòng học, thời gian và trạng thái thay đổi nếu có." },
      { title: "Kiểm tra lịch bù hoặc hủy", body: "Các buổi bù, đổi giờ hoặc hủy phải được đọc theo thông báo mới nhất của trung tâm." },
    ],
    screenshot: {
      src: "/guide/parent-schedule.png",
      alt: "Màn hình lịch học trên cổng phụ huynh",
      title: "Lịch học trên web app phụ huynh",
      description: "Phụ huynh xem lịch theo tuần, mở chi tiết buổi và chuyển học sinh khi tài khoản có nhiều con.",
    },
  },
  {
    id: "parent-assignments",
    icon: <BookOpenCheck size={20} />,
    title: "Theo dõi bài tập và kết quả",
    summary: "Danh sách bài tập được phân theo trạng thái để gia đình biết việc nào cần hoàn thành trước.",
    actions: [
      { title: "Lọc đúng trạng thái", body: "Dùng Tất cả, Cần làm, Đã nộp và Đã chấm. Kiểm tra hạn hoàn thành và lớp của từng bài." },
      { title: "Đọc yêu cầu", body: "Mở bài tập để xem mô tả, hình thức nộp, tài liệu đính kèm và thang điểm." },
      { title: "Xem điểm và nhận xét", body: "Kết quả chỉ xuất hiện sau khi Teacher chấm hoặc công bố. Nếu có yêu cầu làm lại, đọc nhận xét trước khi hỗ trợ con." },
    ],
  },
  {
    id: "parent-tuition",
    icon: <WalletCards size={20} />,
    title: "Kiểm tra học phí",
    summary: "Cổng phụ huynh hiển thị khoản cần thanh toán, hạn thanh toán và lịch sử theo từng học sinh.",
    actions: [
      { title: "Mở hóa đơn", body: "Chọn khoản học phí để kiểm tra mã hóa đơn, nội dung, số tiền, hạn và trạng thái." },
      { title: "Thanh toán theo hướng dẫn", body: "Dùng thông tin chuyển khoản hoặc QR do trung tâm cung cấp. Kiểm tra đúng nội dung chuyển khoản." },
      { title: "Báo đã thanh toán", body: "Khi chức năng khả dụng, gửi thông tin đối soát và chờ trung tâm xác nhận. Trạng thái chỉ chuyển sang đã thanh toán sau khi được duyệt." },
    ],
  },
  {
    id: "parent-notifications",
    icon: <MessageCircleMore size={20} />,
    title: "Đọc thông báo và phối hợp",
    summary: "Thông báo tập trung các cập nhật về lớp học, chuyên cần, bài tập và trao đổi từ Teacher hoặc trung tâm.",
    actions: [
      { title: "Đọc thông báo mới", body: "Mở mục Thông báo và kiểm tra tiêu đề, học sinh liên quan, người gửi và thời gian." },
      { title: "Đối chiếu dữ liệu", body: "Nếu nội dung nói về điểm danh, bài tập hoặc học phí, mở module tương ứng để xem chi tiết chính thức." },
      { title: "Liên hệ đúng kênh", body: "Khi dữ liệu chưa đúng, ghi rõ tên học sinh, lớp, buổi học hoặc mã hóa đơn để trung tâm xử lý nhanh." },
    ],
  },
];

const businessFlow = [
  { icon: <Sparkles size={18} />, label: "Môn và khóa học", body: "Định nghĩa nội dung, học phí và phạm vi giảng dạy." },
  { icon: <Users size={18} />, label: "Lớp và học sinh", body: "Gắn Teacher, ghi danh học sinh và liên kết gia đình." },
  { icon: <CalendarDays size={18} />, label: "Lịch và buổi học", body: "Sinh các session theo lịch chuẩn, buổi bù hoặc thay đổi." },
  { icon: <NotebookPen size={18} />, label: "Giáo án", body: "Chuẩn bị mục tiêu, học liệu và tiến trình cho từng buổi." },
  { icon: <Presentation size={18} />, label: "Trong lớp", body: "Ghi nhận chuyên cần, bài tập và nội dung thực dạy." },
  { icon: <FileCheck2 size={18} />, label: "Đánh giá", body: "Giao bài, chấm bài, lưu điểm và phản hồi." },
  { icon: <MessageCircleMore size={18} />, label: "Gia đình", body: "Công bố kết quả, lịch, học phí và thông báo." },
];

const teacherRoutine = [
  { time: "Trước buổi", title: "Mở lịch và giáo án", body: "Kiểm tra buổi học, sĩ số, học liệu và tổng thời lượng." },
  { time: "Trong buổi", title: "Ghi nhận lớp", body: "Cập nhật chuyên cần, bài tập và nhật ký thực dạy." },
  { time: "Cuối buổi", title: "Xem trước và phát hành", body: "Đọc lại tổng kết cho phụ huynh trước khi xác nhận." },
  { time: "Sau buổi", title: "Chấm và theo dõi", body: "Xử lý bài nộp, điểm số, phản hồi và trường hợp cần hỗ trợ." },
];

const troubleshooting = [
  { question: "Không thấy lớp hoặc học sinh cần thao tác?", answer: "Kiểm tra tài khoản đang dùng và phạm vi Teacher. Nếu lớp chưa được phân công, liên hệ Admin để gắn Teacher vào lớp hoặc khóa học." },
  { question: "Không tạo được giáo án cho buổi học?", answer: "Kiểm tra lớp đã có session, buổi chưa bị hủy và bạn có quyền trên lớp. Chọn lại đúng khóa, lớp và buổi trong workspace Buổi dạy." },
  { question: "Nút phát hành tổng kết bị khóa?", answer: "Mở danh sách điều kiện còn thiếu. Thường cần đủ trạng thái học sinh, nội dung đã dạy, tổng kết nhanh và xác nhận bài tập về nhà hoặc không giao bài." },
  { question: "Phụ huynh không thấy dữ liệu của con?", answer: "Kiểm tra tài khoản Viewer đã liên kết đúng studentIds, học sinh đã được ghi danh và dữ liệu đã được Teacher phát hành hoặc công bố." },
  { question: "Điểm danh hoặc điểm số hiển thị sai?", answer: "Đối chiếu đúng lớp, session, học sinh và thang điểm. Sửa tại dữ liệu nguồn, sau đó tải lại trang. Không tạo bản ghi mới để che bản ghi sai." },
  { question: "Không gửi được tin nhắn?", answer: "Kiểm tra học sinh đã liên kết người nhận, kết nối Messenger còn hoạt động, chủ đề và cách gửi phù hợp chính sách, sau đó theo dõi trạng thái gửi." },
];

export default function SystemGuidePage() {
  const { role: userRole, isSignedIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRole: GuideRole = searchParams.get("role") === "parent" ? "parent" : "teacher";
  const lockedRole = isSignedIn ? systemGuideRoleForUserRole(userRole) : null;
  const role: GuideRole = lockedRole ?? requestedRole;
  const roleLabel = role === "teacher" ? "Teacher" : "Phụ huynh";
  const returnHref = userRole === "viewer" ? ROUTES.VIEWER_DASHBOARD : ROUTES.STAFF_DASHBOARD;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lightbox, setLightbox] = useState<Screenshot | null>(null);
  const [query, setQuery] = useState("");

  const chapters = role === "teacher" ? teacherChapters : parentChapters;
  const guideActionCount = chapters.reduce((total, chapter) => total + chapter.actions.length, 0);
  const filteredChapters = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return chapters;
    return chapters.filter((chapter) =>
      [chapter.title, chapter.summary, ...chapter.actions.flatMap((action) => [action.title, action.body])]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(normalized),
    );
  }, [chapters, query]);
  const relevantTroubleshooting = role === "teacher"
    ? troubleshooting.filter((_, index) => index !== 3)
    : troubleshooting.slice(3, 5);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  useEffect(() => {
    if (!lockedRole || searchParams.get("role") === lockedRole) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("role", lockedRole);
    setSearchParams(nextParams, { replace: true });
  }, [lockedRole, searchParams, setSearchParams]);

  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (!anchor) return;
    requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }));
  }, [role]);

  function chooseRole(nextRole: GuideRole) {
    if (lockedRole && nextRole !== lockedRole) return;
    setSearchParams({ role: nextRole }, { replace: true });
    setQuery("");
    setMobileOpen(false);
    requestAnimationFrame(() => document.getElementById("role-guide")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-neutral-50 text-neutral-800">
      <a href="#guide-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-input focus:bg-neutral-0 focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-primary-700 focus:shadow-[var(--shadow-2)]">
        Bỏ qua đến nội dung hướng dẫn
      </a>

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-neutral-0/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to={ROUTES.LANDING} aria-label="Về trang Edumatrix" className="shrink-0">
            <Logo className="h-11 w-auto" />
          </Link>
          <span className="hidden h-6 w-px bg-neutral-200 sm:block" />
          <span className="hidden text-sm font-bold text-neutral-700 sm:block">Trung tâm hướng dẫn</span>

          <nav className="ml-auto hidden items-center gap-6 lg:flex" aria-label="Điều hướng hướng dẫn">
            {role === "teacher" && <a href="#system-flow" className="text-sm font-semibold text-neutral-600 hover:text-primary-700">Nghiệp vụ</a>}
            {lockedRole ? (
              <a href="#role-guide" className="text-sm font-semibold text-primary-700">Hướng dẫn {roleLabel}</a>
            ) : (
              <>
                <button type="button" onClick={() => chooseRole("teacher")} className="text-sm font-semibold text-neutral-600 hover:text-primary-700">Teacher</button>
                <button type="button" onClick={() => chooseRole("parent")} className="text-sm font-semibold text-neutral-600 hover:text-primary-700">Phụ huynh</button>
              </>
            )}
            <a href="#support" className="text-sm font-semibold text-neutral-600 hover:text-primary-700">Xử lý lỗi</a>
          </nav>
          <Link to={isSignedIn ? returnHref : ROUTES.LOGIN} className="ml-auto hidden min-h-touch shrink-0 items-center gap-2 rounded-input bg-primary-600 px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(51,102,240,.2)] transition hover:bg-primary-700 active:scale-[.98] lg:ml-2 lg:inline-flex">
            {isSignedIn ? "Về hệ thống" : "Đăng nhập"} <ExternalLink size={16} />
          </Link>
          <button type="button" aria-label={mobileOpen ? "Đóng menu" : "Mở menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} className="ml-auto grid min-h-touch min-w-touch place-items-center rounded-input border border-neutral-200 text-neutral-700 lg:hidden">
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="motion-dropdown border-t border-neutral-200 bg-neutral-0 px-4 py-3 lg:hidden" aria-label="Điều hướng hướng dẫn trên điện thoại">
            <div className="mx-auto grid max-w-7xl gap-1">
              {role === "teacher" && <a href="#system-flow" onClick={() => setMobileOpen(false)} className="rounded-input px-3 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Nghiệp vụ hệ thống</a>}
              {lockedRole ? (
                <a href="#role-guide" onClick={() => setMobileOpen(false)} className="rounded-input bg-primary-50 px-3 py-3 text-sm font-semibold text-primary-700">Hướng dẫn {roleLabel}</a>
              ) : (
                <>
                  <button type="button" onClick={() => chooseRole("teacher")} className="rounded-input px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Hướng dẫn Teacher</button>
                  <button type="button" onClick={() => chooseRole("parent")} className="rounded-input px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Hướng dẫn phụ huynh</button>
                </>
              )}
              <a href="#support" onClick={() => setMobileOpen(false)} className="rounded-input px-3 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Xử lý lỗi thường gặp</a>
              <Link to={isSignedIn ? returnHref : ROUTES.LOGIN} className="mt-1 flex min-h-touch items-center justify-center gap-2 rounded-input bg-primary-600 px-4 text-sm font-bold text-white">{isSignedIn ? "Về hệ thống" : "Đăng nhập hệ thống"} <ExternalLink size={16} /></Link>
            </div>
          </nav>
        )}
      </header>

      <main id="guide-main">
        <section className="relative overflow-hidden border-b border-neutral-200 bg-neutral-0">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-primary-50 lg:block" />
          <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:py-16 lg:grid-cols-[.86fr_1.14fr] lg:px-8 lg:py-20">
            <div className="min-w-0 max-w-xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-[.16em] text-primary-700">Sổ tay Edumatrix VN</p>
              <h1 className="text-3xl font-bold leading-[1.08] tracking-[-.035em] text-neutral-950 min-[390px]:text-4xl sm:text-5xl lg:text-6xl">
                {role === "teacher" ? "Vận hành lớp học từ giáo án đến phụ huynh" : "Theo dõi hành trình học tập của con"}
              </h1>
              <p className="mt-5 max-w-[46ch] text-base leading-7 text-neutral-600 sm:text-lg">
                {role === "teacher"
                  ? "Hướng dẫn thực hành dành cho Teacher trên web app Edumatrix."
                  : "Hướng dẫn phụ huynh xem lịch học, bài tập, kết quả và học phí trên Edumatrix."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => chooseRole(role)} className="inline-flex min-h-touch items-center justify-center gap-2 whitespace-nowrap rounded-input bg-primary-600 px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(51,102,240,.22)] transition hover:bg-primary-700 active:scale-[.98]">
                  Bắt đầu với {roleLabel} <ArrowRight size={17} />
                </button>
                {!lockedRole && (
                  <button type="button" onClick={() => chooseRole(role === "teacher" ? "parent" : "teacher")} className="inline-flex min-h-touch items-center justify-center gap-2 whitespace-nowrap rounded-input border border-neutral-300 bg-neutral-0 px-5 text-sm font-bold text-neutral-800 transition hover:border-primary-300 hover:bg-primary-50 active:scale-[.98]">
                    Xem hướng dẫn {role === "teacher" ? "Phụ huynh" : "Teacher"}
                  </button>
                )}
              </div>
              <div className="mt-9 grid grid-cols-3 gap-4 border-t border-neutral-200 pt-6">
                <HeroMetric value={String(chapters.length)} label={role === "teacher" ? "nhóm nghiệp vụ" : "nhóm chức năng"} />
                <HeroMetric value={String(guideActionCount)} label="bước hướng dẫn" />
                <HeroMetric value="1" label={`phạm vi ${roleLabel}`} />
              </div>
            </div>

            {role === "teacher" ? (
              <button type="button" onClick={() => setLightbox(teacherScreenshots.classroom)} aria-label="Mở ảnh màn hình Tương tác lớp học" className="group relative min-w-0 max-w-full overflow-hidden rounded-modal border border-primary-100 bg-neutral-0 p-2 text-left shadow-[0_24px_70px_rgba(28,51,137,.18)] transition hover:-translate-y-1 hover:shadow-[0_28px_78px_rgba(28,51,137,.24)]">
                <img src={teacherScreenshots.classroom.src} alt={teacherScreenshots.classroom.alt} className="aspect-[16/10] w-full rounded-card object-cover object-top" fetchPriority="high" />
                <span className="absolute bottom-5 right-5 inline-flex min-h-touch items-center gap-2 rounded-input bg-neutral-950/90 px-4 text-xs font-bold text-white shadow-[var(--shadow-2)]">
                  <Images size={16} /> Xem toàn màn hình
                </span>
              </button>
            ) : (
              <section aria-label="Nội dung chính dành cho phụ huynh" className="min-w-0 rounded-modal border border-primary-100 bg-neutral-0 p-5 shadow-[0_24px_70px_rgba(28,51,137,.14)] sm:p-7">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-5">
                  <span className="grid size-11 place-items-center rounded-input bg-primary-50 text-primary-700"><Users size={22} /></span>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">Cổng thông tin phụ huynh</h2>
                    <p className="mt-1 text-sm text-neutral-500">Các chức năng được sắp theo nhu cầu sử dụng hằng ngày.</p>
                  </div>
                </div>
                <ul className="mt-2 grid sm:grid-cols-2">
                  {parentChapters.slice(0, 4).map((chapter) => (
                    <li key={chapter.id} className="flex gap-3 border-b border-neutral-100 py-4 sm:odd:pr-4 sm:even:pl-4">
                      <span className="mt-0.5 text-primary-600">{chapter.icon}</span>
                      <span><strong className="block text-sm text-neutral-900">{chapter.title}</strong><span className="mt-1 block text-xs leading-5 text-neutral-500">{chapter.summary}</span></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </section>

        {role === "teacher" && <section id="system-flow" className="scroll-mt-24 border-b border-neutral-200 bg-neutral-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-[-.025em] text-neutral-950 sm:text-4xl">Một chuỗi nghiệp vụ, một nguồn dữ liệu</h2>
              <p className="mt-4 text-base leading-7 text-neutral-600">Mỗi module tạo dữ liệu đầu vào cho bước tiếp theo. Hãy sửa tại nguồn thay vì tạo dữ liệu thay thế ở module sau.</p>
            </div>
            <div className="mt-10 overflow-x-auto pb-3">
              <ol className="grid min-w-[1050px] grid-cols-7 gap-0" aria-label="Luồng nghiệp vụ Edumatrix">
                {businessFlow.map((step, index) => (
                  <li key={step.label} className="relative pr-5">
                    <div className="mb-4 flex items-center">
                      <span className="grid size-10 shrink-0 place-items-center rounded-input bg-primary-600 text-white shadow-[0_7px_16px_rgba(51,102,240,.18)]">{step.icon}</span>
                      {index < businessFlow.length - 1 && <span aria-hidden="true" className="h-px flex-1 bg-primary-200" />}
                    </div>
                    <h3 className="text-sm font-bold text-neutral-900">{step.label}</h3>
                    <p className="mt-2 text-xs leading-5 text-neutral-600">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>}

        {role === "teacher" && <section className="bg-neutral-0 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-[-.025em] text-neutral-950 sm:text-4xl">Nhịp làm việc của Teacher</h2>
                <p className="mt-4 max-w-md text-base leading-7 text-neutral-600">Bốn mốc này giúp giáo viên không bỏ sót dữ liệu trước, trong và sau buổi học.</p>
                <button type="button" onClick={() => chooseRole("teacher")} className="mt-7 inline-flex min-h-touch items-center gap-2 rounded-input border border-primary-200 bg-primary-50 px-4 text-sm font-bold text-primary-700 hover:bg-primary-100">
                  Mở quy trình chi tiết <ChevronRight size={17} />
                </button>
              </div>
              <ol className="grid gap-3 sm:grid-cols-2">
                {teacherRoutine.map((item, index) => (
                  <li key={item.time} className={`rounded-card border p-5 ${index === 0 || index === 3 ? "border-primary-200 bg-primary-50" : "border-neutral-200 bg-neutral-50"}`}>
                    <span className="text-xs font-bold text-primary-700">{item.time}</span>
                    <h3 className="mt-3 text-base font-bold text-neutral-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">{item.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>}

        <section id="role-guide" className="scroll-mt-24 border-y border-neutral-200 bg-neutral-50 py-14 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 border-b border-neutral-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-[-.025em] text-neutral-950 sm:text-4xl">Hướng dẫn dành cho {roleLabel}</h2>
                <p className="mt-3 text-base leading-7 text-neutral-600">{lockedRole ? "Nội dung được giới hạn theo vai trò của tài khoản đang đăng nhập." : "Chọn vai trò để xem đúng menu, quyền và trình tự thao tác."}</p>
              </div>
              {lockedRole ? (
                <div className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-card border border-primary-200 bg-primary-50 px-5 text-sm font-bold text-primary-800 sm:w-auto">
                  {role === "teacher" ? <GraduationCap size={18} /> : <Users size={18} />}
                  Phạm vi {roleLabel}
                  <ShieldCheck size={16} />
                </div>
              ) : (
                <div className="inline-grid w-full grid-cols-2 rounded-card border border-neutral-200 bg-neutral-0 p-1 sm:w-auto" role="group" aria-label="Chọn vai trò hướng dẫn">
                  <RoleButton active={role === "teacher"} onClick={() => chooseRole("teacher")} icon={<GraduationCap size={18} />} label="Teacher" />
                  <RoleButton active={role === "parent"} onClick={() => chooseRole("parent")} icon={<Users size={18} />} label="Phụ huynh" />
                </div>
              )}
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-28 lg:self-start">
                <label htmlFor="guide-search" className="mb-2 block text-xs font-bold text-neutral-700">Tìm trong hướng dẫn</label>
                <div className="flex min-h-touch items-center gap-2 rounded-input border border-neutral-300 bg-neutral-0 px-3 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
                  <Search size={17} className="shrink-0 text-neutral-400" />
                  <input id="guide-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: giáo án" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400" />
                </div>
                <nav className="mt-5 hidden lg:block" aria-label={`Mục lục ${role === "teacher" ? "Teacher" : "phụ huynh"}`}>
                  <p className="mb-2 text-xs font-bold text-neutral-500">Nội dung</p>
                  <ul className="space-y-1">
                    {chapters.map((chapter) => (
                      <li key={chapter.id}>
                        <a href={`#${chapter.id}`} className="flex min-h-touch items-center gap-2 rounded-input px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-0 hover:text-primary-700">
                          <span className="text-primary-600">{chapter.icon}</span>
                          <span>{chapter.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="mt-6 rounded-card border border-primary-200 bg-primary-50 p-4">
                  <ShieldCheck size={21} className="text-primary-700" />
                  <p className="mt-3 text-sm font-bold text-primary-900">Nguyên tắc an toàn</p>
                  <p className="mt-1 text-xs leading-5 text-primary-800">Chỉ thao tác trong đúng lớp hoặc học sinh được phân quyền. Kiểm tra người nhận trước khi phát hành hoặc gửi tin.</p>
                </div>
              </aside>

              <div className="min-w-0">
                {filteredChapters.length > 0 ? (
                  <div className="space-y-8">
                    {filteredChapters.map((chapter) => (
                      <GuideChapterSection key={chapter.id} chapter={chapter} onOpenImage={setLightbox} />
                    ))}
                  </div>
                ) : (
                  <div role="status" className="rounded-card border border-neutral-200 bg-neutral-0 px-6 py-14 text-center">
                    <CircleHelp size={30} className="mx-auto text-neutral-400" />
                    <h3 className="mt-4 text-lg font-bold text-neutral-900">Không tìm thấy nội dung phù hợp</h3>
                    <p className="mt-2 text-sm text-neutral-600">Thử từ khóa ngắn hơn như giáo án, học sinh, điểm danh hoặc học phí.</p>
                    <button type="button" onClick={() => setQuery("")} className="mt-5 min-h-touch rounded-input bg-primary-600 px-4 text-sm font-bold text-white">Xóa tìm kiếm</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {role === "teacher" && <section className="bg-neutral-0 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-[-.025em] text-neutral-950 sm:text-4xl">Các màn hình Teacher chính</h2>
              <p className="mt-4 text-base leading-7 text-neutral-600">Ảnh chụp từ giao diện web app và bản demo nghiệp vụ của Edumatrix. Dữ liệu trong ảnh là dữ liệu minh họa.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-12">
              <ScreenshotTile screenshot={teacherScreenshots.lessonPlan} onOpen={setLightbox} className="md:col-span-7" />
              <ScreenshotTile screenshot={teacherScreenshots.attendance} onOpen={setLightbox} className="md:col-span-5" />
              <ScreenshotTile screenshot={teacherScreenshots.learning} onOpen={setLightbox} className="md:col-span-5" />
              <ScreenshotTile screenshot={teacherScreenshots.chat} onOpen={setLightbox} className="md:col-span-7" />
            </div>
          </div>
        </section>}

        <section id="support" className="scroll-mt-24 border-t border-neutral-200 bg-neutral-50 py-16 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.68fr_1.32fr] lg:px-8">
            <div>
              <h2 className="text-3xl font-bold tracking-[-.025em] text-neutral-950 sm:text-4xl">Xử lý lỗi thường gặp</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-neutral-600">Ưu tiên kiểm tra quyền, liên kết dữ liệu và trạng thái nghiệp vụ trước khi nhập lại.</p>
              <div className="mt-7 rounded-card border border-warning-200 bg-warning-50 p-4 text-sm leading-6 text-warning-900">
                <strong className="block">Không tạo dữ liệu thay thế để chữa lỗi hiển thị.</strong>
                Sửa đúng lớp, session, học sinh hoặc bản ghi nguồn rồi tải lại trang.
              </div>
            </div>
            <div className="divide-y divide-neutral-200 border-y border-neutral-200">
              {relevantTroubleshooting.map((item) => (
                <details key={item.question} className="group py-1">
                  <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-bold text-neutral-900 marker:content-none">
                    {item.question}
                    <span className="grid size-8 shrink-0 place-items-center rounded-input bg-neutral-100 text-neutral-600 transition group-open:rotate-90 group-open:bg-primary-50 group-open:text-primary-700"><ChevronRight size={18} /></span>
                  </summary>
                  <p className="max-w-[72ch] pb-5 pr-12 text-sm leading-6 text-neutral-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary-900 py-14 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-[-.025em] text-white">Sẵn sàng vận hành đúng luồng</h2>
              <p className="mt-3 text-base leading-7 text-primary-100">Mở hệ thống, chọn đúng vai trò và bắt đầu từ công việc cần xử lý trong ngày.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={isSignedIn ? returnHref : ROUTES.LOGIN} className="inline-flex min-h-touch items-center justify-center gap-2 whitespace-nowrap rounded-input bg-neutral-0 px-5 text-sm font-bold text-primary-900 transition hover:bg-primary-50 active:scale-[.98]">
                {isSignedIn ? "Về hệ thống" : "Đăng nhập hệ thống"} <ExternalLink size={17} />
              </Link>
              <a href="#guide-main" className="inline-flex min-h-touch items-center justify-center whitespace-nowrap rounded-input border border-white/30 px-5 text-sm font-bold text-white hover:bg-white/10">Về đầu trang</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-neutral-0 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-xs text-neutral-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 EduMatrix VN. Sổ tay sử dụng hệ thống.</p>
          <div className="flex flex-wrap gap-5">
            <Link to={ROUTES.PRIVACY_POLICY} className="hover:text-primary-700">Chính sách bảo mật</Link>
            <Link to={ROUTES.DATA_DELETION} className="hover:text-primary-700">Xóa dữ liệu</Link>
          </div>
        </div>
      </footer>

      {lightbox && (
        <div role="dialog" aria-modal="true" aria-label={lightbox.title} className="modal-backdrop fixed inset-0 z-[60] grid place-items-center bg-neutral-950/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) setLightbox(null); }}>
          <div className="modal-panel flex max-h-[94dvh] w-full max-w-[1500px] flex-col overflow-hidden rounded-modal bg-neutral-0 shadow-[var(--shadow-4)]">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-neutral-900">{lightbox.title}</h2>
                <p className="mt-1 text-xs text-neutral-500">{lightbox.description}</p>
              </div>
              <button type="button" autoFocus onClick={() => setLightbox(null)} aria-label="Đóng ảnh" className="grid min-h-touch min-w-touch shrink-0 place-items-center rounded-input border border-neutral-200 text-neutral-600 hover:bg-neutral-100"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-neutral-100 p-2 sm:p-4">
              <img src={lightbox.src} alt={lightbox.alt} className="mx-auto h-auto max-w-full rounded-card border border-neutral-200 bg-neutral-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong className="block text-2xl font-bold tabular-nums text-neutral-950">{value}</strong>
      <span className="mt-1 block text-xs leading-5 text-neutral-500">{label}</span>
    </div>
  );
}

function RoleButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex min-h-touch items-center justify-center gap-2 rounded-input px-5 text-sm font-bold transition ${active ? "bg-primary-600 text-white shadow-[0_7px_16px_rgba(51,102,240,.2)]" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`}>
      {icon} {label}
    </button>
  );
}

function GuideChapterSection({ chapter, onOpenImage }: { chapter: GuideChapter; onOpenImage: (screenshot: Screenshot) => void }) {
  return (
    <article id={chapter.id} className="scroll-mt-28 overflow-hidden rounded-modal border border-neutral-200 bg-neutral-0 shadow-[var(--shadow-1)]">
      <header className="border-b border-neutral-200 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-input bg-primary-50 text-primary-700">{chapter.icon}</span>
          <div>
            <h3 className="text-xl font-bold tracking-[-.015em] text-neutral-950 sm:text-2xl">{chapter.title}</h3>
            <p className="mt-2 max-w-[70ch] text-sm leading-6 text-neutral-600">{chapter.summary}</p>
          </div>
        </div>
      </header>

      {chapter.screenshot && (
        <button type="button" onClick={() => onOpenImage(chapter.screenshot!)} className="group block w-full border-b border-neutral-200 bg-neutral-100 p-2 text-left sm:p-4">
          <img src={chapter.screenshot.src} alt={chapter.screenshot.alt} loading="lazy" className="aspect-[16/9] w-full rounded-card border border-neutral-200 bg-neutral-0 object-cover object-top transition group-hover:brightness-[.98]" />
          <span className="mt-3 flex items-start justify-between gap-4 px-1 pb-1">
            <span>
              <strong className="block text-sm text-neutral-900">{chapter.screenshot.title}</strong>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">{chapter.screenshot.description}</span>
            </span>
            <span className="inline-flex min-h-touch shrink-0 items-center gap-2 text-xs font-bold text-primary-700"><Images size={16} /> Mở ảnh</span>
          </span>
        </button>
      )}

      <div className="px-5 py-3 sm:px-7">
        <ol className="divide-y divide-neutral-100">
          {chapter.actions.map((action) => (
            <li key={action.title} className="grid gap-2 py-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
              <div className="flex items-start gap-2 text-sm font-bold text-neutral-900">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-50 text-success-700"><Check size={13} strokeWidth={3} /></span>
                <span>{action.title}</span>
              </div>
              <p className="text-sm leading-6 text-neutral-600">{action.body}</p>
            </li>
          ))}
        </ol>
      </div>

      {chapter.notes && chapter.notes.length > 0 && (
        <div className="border-t border-primary-100 bg-primary-50 px-5 py-4 sm:px-7">
          <p className="text-xs font-bold text-primary-900">Lưu ý vận hành</p>
          <ul className="mt-2 grid gap-2 text-xs leading-5 text-primary-800 sm:grid-cols-2">
            {chapter.notes.map((note) => <li key={note} className="flex gap-2"><ChevronRight size={14} className="mt-0.5 shrink-0" />{note}</li>)}
          </ul>
        </div>
      )}
    </article>
  );
}

function ScreenshotTile({ screenshot, onOpen, className }: { screenshot: Screenshot; onOpen: (screenshot: Screenshot) => void; className: string }) {
  return (
    <figure className={`overflow-hidden rounded-modal border border-neutral-200 bg-neutral-50 ${className}`}>
      <button type="button" onClick={() => onOpen(screenshot)} className="group block w-full bg-neutral-100 p-2 text-left">
        <img src={screenshot.src} alt={screenshot.alt} loading="lazy" className="aspect-[16/9] w-full rounded-card border border-neutral-200 bg-neutral-0 object-cover object-top transition duration-300 group-hover:scale-[1.01]" />
      </button>
      <figcaption className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">{screenshot.title}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{screenshot.description}</p>
          </div>
          <button type="button" onClick={() => onOpen(screenshot)} aria-label={`Mở ảnh ${screenshot.title}`} className="grid min-h-touch min-w-touch shrink-0 place-items-center rounded-input border border-neutral-200 bg-neutral-0 text-primary-700 hover:bg-primary-50"><Images size={18} /></button>
        </div>
      </figcaption>
    </figure>
  );
}
