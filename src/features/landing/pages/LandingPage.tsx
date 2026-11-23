import { Link } from "react-router";
import {
  Monitor,
  Smartphone,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Bell,
  Star,
} from "lucide-react";
import { EduMatrixLogo } from "@/components/ui/EduMatrixLogo";
import { ROUTES } from "@/constants/routes";
import { PlatformShowcase } from "@/features/landing/components/PlatformShowcase";
import { RoleShowcase } from "@/features/landing/components/RoleShowcase";

export default function LandingPage() {
  return (
    <div className="theme-light min-h-screen bg-neutral-50 text-neutral-900 font-sans antialiased selection:bg-primary-600 selection:text-white overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* NAVBAR SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-neutral-0/90 backdrop-blur-md border-b border-neutral-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <EduMatrixLogo size="lg" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-neutral-700">
            <a href="#ecosystem" className="hover:text-neutral-900 transition-colors">
              Hệ Sinh Thái
            </a>
            <a href="#web-platform" className="hover:text-neutral-900 transition-colors">
              Nền Tảng Web
            </a>
            <a href="#mobile-app" className="hover:text-neutral-900 transition-colors">
              App Mobile
            </a>
            <a href="#smart-classroom" className="hover:text-neutral-900 transition-colors">
              Lớp Học Thực Tế
            </a>
            <Link to={ROUTES.SYSTEM_GUIDE} className="hover:text-neutral-900 transition-colors">
              Hướng Dẫn Sử Dụng
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              to={ROUTES.LOGIN}
              className="px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:text-primary-600 transition-colors"
            >
              Đăng Nhập
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95 flex items-center gap-1.5"
            >
              Trải Nghiệm Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 1. HERO SECTION                                               */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-neutral-50">
        {/* Subtle Brand Color Accent Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary-900/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-900/5 border border-primary-900/10 text-xs font-bold text-neutral-900 tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                Nền Tảng Quản Lý Giáo Dục Thế Hệ Mới
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.15]">
                Hệ Thống Quản Lý Giáo Dục Toàn Diện{" "}
                <span className="text-primary-600">
                  EduMatrix VN
                </span>
              </h1>

              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                Giải pháp số hóa ma trận điểm, lịch học và điểm danh tự động. Kết nối liền mạch giữa Ban Giám Hiệu, Giáo Viên, Học Sinh và Phụ Huynh trên cả <strong>Web & App Mobile</strong>.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to={ROUTES.LOGIN}
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl hover:shadow-xl transition-all duration-200 text-center flex items-center justify-center gap-2"
                >
                  Trải Nghiệm Hệ Thống
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-bold text-neutral-900 bg-neutral-0 border-2 border-neutral-200 hover:border-primary-900 rounded-xl shadow-sm transition-all duration-200 text-center flex items-center justify-center gap-2"
                >
                  Đăng Nhập Hệ Thống
                </Link>
              </div>

              {/* Quick Key Highlights */}
              <div className="pt-6 border-t border-neutral-200/80 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-bold text-neutral-900">100%</div>
                  <div className="text-xs font-semibold text-neutral-500">Đồng Bộ Real-time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary-600">2 Nền Tảng</div>
                  <div className="text-xs font-semibold text-neutral-500">Web & App Mobile</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-neutral-900">99.8%</div>
                  <div className="text-xs font-semibold text-neutral-500">Hài Lòng Phụ Huynh</div>
                </div>
              </div>
            </div>

            {/* Right Graphic Column: Dual Device Mockups (Web & Mobile) */}
            <div className="lg:col-span-6 relative">
              {/* Modern Card Frame Backdrop */}
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Laptop Web Showcase */}
                <div className="bg-neutral-900 rounded-2xl p-3 shadow-2xl border border-neutral-800 transform lg:rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800/80 rounded-t-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-success-500" />
                    <span className="text-3xs text-neutral-400 font-mono ml-2 truncate">edumatrix.vn/app/dashboard</span>
                  </div>
                  {/* Simulated Web Dashboard UI */}
                  <div className="bg-primary-900 rounded-b-lg p-4 sm:p-6 text-white space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-bold text-white text-xs">EM</div>
                        <div>
                          <div className="text-sm font-bold">EduMatrix Web Portal</div>
                          <div className="text-3xs text-neutral-400">Trường THPT Chuyên Chế Tạo</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-success-500/20 text-success-300 text-3xs font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-300 animate-pulse" />
                        Trực Tuyến
                      </span>
                    </div>

                    {/* Sample Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="bg-neutral-800/80 p-2.5 sm:p-3 rounded-xl border border-neutral-700/50">
                        <div className="text-3xs text-neutral-400">Lớp Học</div>
                        <div className="text-lg font-bold text-white">42 Lớp</div>
                      </div>
                      <div className="bg-neutral-800/80 p-2.5 sm:p-3 rounded-xl border border-neutral-700/50">
                        <div className="text-3xs text-neutral-400">Học Sinh</div>
                        <div className="text-lg font-bold text-white">1,540</div>
                      </div>
                      <div className="bg-primary-600/20 p-2.5 sm:p-3 rounded-xl border border-primary-600/40">
                        <div className="text-3xs text-primary-600 font-semibold">Điểm Danh</div>
                        <div className="text-lg font-bold text-primary-600">98.6%</div>
                      </div>
                    </div>

                    {/* Simulated Table Data */}
                    <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/40 space-y-2">
                      <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                        <span>Bảng Ma Trận Điểm Lớp 10A1</span>
                        <span className="text-3xs text-primary-600 hover:underline cursor-pointer">Xem tất cả</span>
                      </div>
                      <div className="space-y-1.5 text-3xs">
                        <div className="flex items-center justify-between p-1.5 bg-neutral-800 rounded">
                          <span className="font-semibold text-neutral-200">Nguyễn Văn An (HS001)</span>
                          <span className="px-2 py-0.5 bg-success-500/20 text-success-300 rounded font-bold">9.2 - Giỏi</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-neutral-800 rounded">
                          <span className="font-semibold text-neutral-200">Trần Thị Bình (HS002)</span>
                          <span className="px-2 py-0.5 bg-success-500/20 text-success-300 rounded font-bold">8.8 - Giỏi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlapping Mobile Device Mockup */}
                <div className="absolute -bottom-6 -right-2 sm:-right-6 w-48 sm:w-56 bg-neutral-900 rounded-[2.5rem] p-2.5 shadow-2xl border-4 border-neutral-700 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                  <div className="w-16 h-3 bg-neutral-800 rounded-full mx-auto mb-2" />
                  <div className="bg-neutral-0 rounded-[2rem] p-3 text-neutral-900 space-y-3 font-sans">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="text-xs font-bold text-neutral-900">EduMatrix Mobile</div>
                      <Bell className="w-3.5 h-3.5 text-primary-600" />
                    </div>
                    <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-200 text-3xs space-y-1">
                      <div className="font-bold text-neutral-900">🔔 Thông Báo Phụ Huynh</div>
                      <div className="text-neutral-600">Con Nguyễn Văn An đã hoàn thành bài tập Toán 10.</div>
                      <div className="text-3xs text-primary-600 font-semibold">10 phút trước</div>
                    </div>
                    <div className="bg-primary-900 text-white p-2.5 rounded-xl text-3xs space-y-1">
                      <div className="font-bold">Lịch Học Hôm Nay</div>
                      <div className="text-neutral-300">Tiết 1-2: Đại Số 10 (Phòng A201)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. ECOSYSTEM OVERVIEW SECTION                                 */}
      {/* ------------------------------------------------------------- */}
      <section id="ecosystem" className="py-20 bg-neutral-0 border-y border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-primary-600 uppercase">Hệ Sinh Thái Đồng Bộ</h2>
            <p className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
              Kết Nối Toàn Diện Ban Giám Hiệu, Thầy Cô & Phụ Huynh
            </p>
            <p className="text-neutral-600 text-base">
              EduMatrix VN liên kết dữ liệu mượt mà từ máy tính làm việc đến ứng dụng di động cầm tay.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200/80 hover:border-primary-900/30 hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary-900 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Web Dashboard Nhà Trường</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Quản lý toàn bộ danh mục lớp học, ma trận điểm số, tính điểm trung bình tự động và xuất báo cáo chuẩn định dạng Bộ Giáo Dục.
              </p>
              <ul className="mt-6 space-y-2 text-xs font-semibold text-neutral-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Ma trận điểm thông minh
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Quản lý học phí & hóa đơn
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200/80 hover:border-primary-600/30 hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">App Mobile 3 Trong 1</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Ứng dụng di động chuyên biệt dành cho Phụ Huynh theo dõi con, Học Sinh làm bài tập và Giáo Viên điểm danh theo thời gian thực.
              </p>
              <ul className="mt-6 space-y-2 text-xs font-semibold text-neutral-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Thông báo điểm danh tức thì
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Tra cứu lịch học & học phí
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200/80 hover:border-primary-900/30 hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary-900 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Đồng Bộ Cloud Tốc Độ Cao</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Mọi thao tác nhập điểm hay điểm danh của giáo viên được đồng bộ ngay tức khắc tới điện thoại của phụ huynh với độ trễ gần như bằng 0.
              </p>
              <ul className="mt-6 space-y-2 text-xs font-semibold text-neutral-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Hạ tầng bảo mật Google Firebase
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Hoạt động mượt trên mọi thiết bị
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. WEB PLATFORM DETAILED SHOWCASE                             */}
      {/* ------------------------------------------------------------- */}
      <PlatformShowcase />

      {/* ------------------------------------------------------------- */}
      {/* 4. MOBILE APP SHOWCASE SECTION                                */}
      {/* ------------------------------------------------------------- */}
      <RoleShowcase />

      {/* ------------------------------------------------------------- */}
      {/* 5. SMART CLASSROOM BENTO GRID                                 */}
      {/* ------------------------------------------------------------- */}
      <section id="smart-classroom" className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="text-xs font-bold tracking-widest text-primary-600 uppercase">Lớp Học Thông Minh Thực Tế</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">
              Ứng Dụng Thực Tế Tại Các Lớp Học Việt Nam
            </h2>
            <p className="text-neutral-600 text-base">
              EduMatrix VN biến các lớp học truyền thống thành môi trường giáo dục số tương tác cao.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cell 1: Large Visual Card */}
            <div className="md:col-span-2 bg-primary-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-lg">
              <div className="relative z-10 space-y-3 max-w-md">
                <span className="px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full inline-block">Bảng Tương Tác</span>
                <h3 className="text-2xl font-bold leading-tight">Đồng Bộ Bài Giảng Lên Bảng Điện Tử Lớp Học</h3>
                <p className="text-neutral-300 text-sm">
                  Thầy cô dễ dàng mở slide bài giảng, câu hỏi trắc nghiệm tương tác trực tiếp trên màn hình thông minh tại lớp.
                </p>
              </div>
              <div className="pt-6 relative z-10 flex items-center gap-4 text-xs font-semibold text-neutral-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary-600" /> Tích hợp Smart TV/Projector</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary-600" /> Chấm điểm tức thì</span>
              </div>
            </div>

            {/* Cell 2: Metric Stat Card */}
            <div className="bg-neutral-0 rounded-3xl p-8 border border-neutral-200/80 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-600 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                <div className="text-4xl font-extrabold text-neutral-900 pt-2">99.8%</div>
                <div className="text-sm font-bold text-neutral-700">Tỷ Lệ Tương Tác Lớp Học</div>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed pt-4 border-t border-neutral-100">
                Giúp học sinh hào hứng làm bài và tăng 35% khả năng ghi nhớ kiến thức tại lớp.
              </p>
            </div>

            {/* Cell 3: Security & Privacy */}
            <div className="bg-neutral-0 rounded-3xl p-8 border border-neutral-200/80 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary-900/10 text-neutral-900 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-neutral-900" />
                </div>
                <h4 className="text-lg font-bold text-neutral-900">Bảo Mật Chuẩn ISO/IEC</h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Dữ liệu điểm số và thông tin cá nhân của học sinh được mã hóa đầu cuối an toàn tuyệt đối.
                </p>
              </div>
            </div>

            {/* Cell 4: Medium Wide Feature */}
            <div className="md:col-span-2 bg-primary-900 rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
              <div className="space-y-2">
                <h4 className="text-xl font-bold">Hỗ Trợ Triển Khai Nhanh Trong 24-48 Giờ</h4>
                <p className="text-neutral-300 text-xs max-w-md">
                  Đội ngũ kỹ thuật EduMatrix VN hỗ trợ tải dữ liệu học sinh, phân quyền giáo viên và đào tạo sử dụng tận nơi.
                </p>
              </div>
              <Link
                to={ROUTES.LOGIN}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow transition-all flex-shrink-0"
              >
                Đăng Nhập Hệ Thống
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <EduMatrixLogo variant="light" size="md" />
              <p className="text-xs text-neutral-400 leading-relaxed">
                Nền tảng quản lý giáo dục thông minh EduMatrix VN - Đồng bộ dữ liệu real-time cho trường học hiện đại.
              </p>
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">Giải Pháp</div>
              <ul className="space-y-2 text-xs">
                <li><a href="#web-platform" className="hover:text-white transition-colors">Ma Trận Điểm Web</a></li>
                <li><a href="#mobile-app" className="hover:text-white transition-colors">Ứng Dụng Phụ Huynh</a></li>
                <li><a href="#mobile-app" className="hover:text-white transition-colors">App Điểm Danh Giáo Viên</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">Hệ Thống</div>
              <ul className="space-y-2 text-xs">
                <li><Link to={ROUTES.LOGIN} className="hover:text-white transition-colors">Đăng Nhập Quản Lý</Link></li>
                <li><Link to={ROUTES.SYSTEM_GUIDE} className="hover:text-white transition-colors">Hướng Dẫn Sử Dụng</Link></li>
                <li><Link to={ROUTES.PRIVACY_POLICY} className="hover:text-white transition-colors">Chính Sách Bảo Mật</Link></li>
                <li><Link to={ROUTES.DATA_DELETION} className="hover:text-white transition-colors">Hướng Dẫn Xóa Dữ Liệu</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">Liên Hệ</div>
              <div className="text-xs space-y-1.5">
                <div>Hotline: 1900 xxxx (Hỗ trợ 24/7)</div>
                <div>Email: hotro@edumatrix.vn</div>
                <div>Địa chỉ: Hà Nội & TP. Hồ Chí Minh</div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-900 text-center text-3xs text-neutral-500">
            © {new Date().getFullYear()} EduMatrix VN. Tất cả quyền được bảo lưu. Thiết kế giao diện theo chuẩn Art Direction.
          </div>
        </div>
      </footer>
    </div>
  );
}
