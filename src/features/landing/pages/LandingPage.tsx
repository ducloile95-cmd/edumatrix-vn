import React, { useState } from "react";
import { Link } from "react-router";
import {
  Monitor,
  Smartphone,
  ShieldCheck,
  Zap,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckSquare,
  Bell,
  ChevronRight,
  Star,
  BookOpen,
} from "lucide-react";
import { EduMatrixLogo } from "@/components/ui/EduMatrixLogo";
import { ROUTES } from "@/constants/routes";

export default function LandingPage() {
  const [activeWebTab, setActiveWebTab] = useState<"matrix" | "attendance" | "schedule" | "analytics">("matrix");
  const [activeRole, setActiveRole] = useState<"parent" | "student" | "teacher">("parent");
  const [demoForm, setDemoForm] = useState({ name: "", school: "", phone: "", role: "Quản lý trường" });
  const [submitted, setSubmitted] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoForm.name && demoForm.phone) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F2942] font-sans antialiased selection:bg-[#E54B4B] selection:text-white overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* NAVBAR SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <EduMatrixLogo size="lg" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-700">
            <a href="#ecosystem" className="hover:text-[#0F2942] transition-colors">
              Hệ Sinh Thái
            </a>
            <a href="#web-platform" className="hover:text-[#0F2942] transition-colors">
              Nền Tảng Web
            </a>
            <a href="#mobile-app" className="hover:text-[#0F2942] transition-colors">
              App Mobile
            </a>
            <a href="#smart-classroom" className="hover:text-[#0F2942] transition-colors">
              Lớp Học Thực Tế
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              to={ROUTES.LOGIN}
              className="px-4 py-2.5 text-sm font-semibold text-[#0F2942] hover:text-[#E54B4B] transition-colors"
            >
              Đăng Nhập
            </Link>
            <a
              href="#demo-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#E54B4B] hover:bg-[#c8321a] rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95 flex items-center gap-1.5"
            >
              Trải Nghiệm Demo
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 1. HERO SECTION                                               */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-[#F8FAFC]">
        {/* Subtle Brand Color Accent Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#0F2942]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-[#E54B4B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F2942]/5 border border-[#0F2942]/10 text-xs font-bold text-[#0F2942] tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#E54B4B]" />
                Nền Tảng Quản Lý Giáo Dục Thế Hệ Mới
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F2942] leading-[1.15]">
                Hệ Thống Quản Lý Giáo Dục Toàn Diện{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F2942] via-[#1B365D] to-[#E54B4B]">
                  EduMatrix VN
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                Giải pháp số hóa ma trận điểm, lịch học và điểm danh tự động. Kết nối liền mạch giữa Ban Giám Hiệu, Giáo Viên, Học Sinh và Phụ Huynh trên cả <strong>Web & App Mobile</strong>.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="#demo-form"
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-bold text-white bg-[#E54B4B] hover:bg-[#c8321a] rounded-xl shadow-lg shadow-[#E54B4B]/20 hover:shadow-xl transition-all duration-200 text-center flex items-center justify-center gap-2"
                >
                  Đăng Ký Khảo Sát & Demo
                  <ArrowRight className="w-5 h-5" />
                </a>
                <Link
                  to={ROUTES.LOGIN}
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-bold text-[#0F2942] bg-white border-2 border-slate-200 hover:border-[#0F2942] rounded-xl shadow-sm transition-all duration-200 text-center flex items-center justify-center gap-2"
                >
                  Đăng Nhập Hệ Thống
                </Link>
              </div>

              {/* Quick Key Highlights */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-bold text-[#0F2942]">100%</div>
                  <div className="text-xs font-semibold text-slate-500">Đồng Bộ Real-time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#E54B4B]">2 Nền Tảng</div>
                  <div className="text-xs font-semibold text-slate-500">Web & App Mobile</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0F2942]">99.8%</div>
                  <div className="text-xs font-semibold text-slate-500">Hài Lòng Phụ Huynh</div>
                </div>
              </div>
            </div>

            {/* Right Graphic Column: Dual Device Mockups (Web & Mobile) */}
            <div className="lg:col-span-6 relative">
              {/* Modern Card Frame Backdrop */}
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Laptop Web Showcase */}
                <div className="bg-slate-900 rounded-2xl p-3 shadow-2xl border border-slate-800 transform lg:rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 rounded-t-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-[11px] text-slate-400 font-mono ml-2 truncate">edumatrix.vn/app/dashboard</span>
                  </div>
                  {/* Simulated Web Dashboard UI */}
                  <div className="bg-[#0F2942] rounded-b-lg p-4 sm:p-6 text-white space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#E54B4B] flex items-center justify-center font-bold text-white text-xs">EM</div>
                        <div>
                          <div className="text-sm font-bold">EduMatrix Web Portal</div>
                          <div className="text-[10px] text-slate-400">Trường THPT Chuyên Chế Tạo</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Trực Tuyến
                      </span>
                    </div>

                    {/* Sample Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="bg-slate-800/80 p-2.5 sm:p-3 rounded-xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">Lớp Học</div>
                        <div className="text-lg font-bold text-white">42 Lớp</div>
                      </div>
                      <div className="bg-slate-800/80 p-2.5 sm:p-3 rounded-xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">Học Sinh</div>
                        <div className="text-lg font-bold text-white">1,540</div>
                      </div>
                      <div className="bg-[#E54B4B]/20 p-2.5 sm:p-3 rounded-xl border border-[#E54B4B]/40">
                        <div className="text-[10px] text-[#E54B4B] font-semibold">Điểm Danh</div>
                        <div className="text-lg font-bold text-[#E54B4B]">98.6%</div>
                      </div>
                    </div>

                    {/* Simulated Table Data */}
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40 space-y-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>Bảng Ma Trận Điểm Lớp 10A1</span>
                        <span className="text-[10px] text-[#E54B4B] hover:underline cursor-pointer">Xem tất cả</span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between p-1.5 bg-slate-800 rounded">
                          <span className="font-semibold text-slate-200">Nguyễn Văn An (HS001)</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">9.2 - Giỏi</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-slate-800 rounded">
                          <span className="font-semibold text-slate-200">Trần Thị Bình (HS002)</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">8.8 - Giỏi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlapping Mobile Device Mockup */}
                <div className="absolute -bottom-6 -right-2 sm:-right-6 w-48 sm:w-56 bg-slate-900 rounded-[2.5rem] p-2.5 shadow-2xl border-4 border-slate-700 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                  <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto mb-2" />
                  <div className="bg-white rounded-[2rem] p-3 text-slate-900 space-y-3 font-sans">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="text-xs font-bold text-[#0F2942]">EduMatrix Mobile</div>
                      <Bell className="w-3.5 h-3.5 text-[#E54B4B]" />
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-xl border border-slate-200 text-[10px] space-y-1">
                      <div className="font-bold text-[#0F2942]">🔔 Thông Báo Phụ Huynh</div>
                      <div className="text-slate-600">Con Nguyễn Văn An đã hoàn thành bài tập Toán 10.</div>
                      <div className="text-[9px] text-[#E54B4B] font-semibold">10 phút trước</div>
                    </div>
                    <div className="bg-[#0F2942] text-white p-2.5 rounded-xl text-[10px] space-y-1">
                      <div className="font-bold">Lịch Học Hôm Nay</div>
                      <div className="text-slate-300">Tiết 1-2: Đại Số 10 (Phòng A201)</div>
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
      <section id="ecosystem" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-[#E54B4B] uppercase">Hệ Sinh Thái Đồng Bộ</h2>
            <p className="text-3xl sm:text-4xl font-bold text-[#0F2942] tracking-tight">
              Kết Nối Toàn Diện Ban Giám Hiệu, Thầy Cô & Phụ Huynh
            </p>
            <p className="text-slate-600 text-base">
              EduMatrix VN liên kết dữ liệu mượt mà từ máy tính làm việc đến ứng dụng di động cầm tay.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-slate-200/80 hover:border-[#0F2942]/30 hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-[#0F2942] text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#0F2942] mb-3">Web Dashboard Nhà Trường</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Quản lý toàn bộ danh mục lớp học, ma trận điểm số, tính điểm trung bình tự động và xuất báo cáo chuẩn định dạng Bộ Giáo Dục.
              </p>
              <ul className="mt-6 space-y-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Ma trận điểm thông minh
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Quản lý học phí & hóa đơn
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-slate-200/80 hover:border-[#E54B4B]/30 hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-[#E54B4B] text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#0F2942] mb-3">App Mobile 3 Trong 1</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Ứng dụng di động chuyên biệt dành cho Phụ Huynh theo dõi con, Học Sinh làm bài tập và Giáo Viên điểm danh theo thời gian thực.
              </p>
              <ul className="mt-6 space-y-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Thông báo điểm danh tức thì
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Tra cứu lịch học & học phí
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-slate-200/80 hover:border-[#0F2942]/30 hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-[#0F2942] text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#0F2942] mb-3">Đồng Bộ Cloud Tốc Độ Cao</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Mọi thao tác nhập điểm hay điểm danh của giáo viên được đồng bộ ngay tức khắc tới điện thoại của phụ huynh với độ trễ gần như bằng 0.
              </p>
              <ul className="mt-6 space-y-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Hạ tầng bảo mật Google Firebase
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Hoạt động mượt trên mọi thiết bị
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. WEB PLATFORM DETAILED SHOWCASE                             */}
      {/* ------------------------------------------------------------- */}
      <section id="web-platform" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold tracking-widest text-[#E54B4B] uppercase">Quản Lý Chuyên Nghiệp</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0F2942] mt-2">
                Nền Tảng Web Dashboard EduMatrix VN
              </h2>
            </div>
            {/* Interactive Tab Controls */}
            <div className="mt-6 md:mt-0 flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-xl">
              <button
                onClick={() => setActiveWebTab("matrix")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeWebTab === "matrix" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
                }`}
              >
                Ma Trận Điểm
              </button>
              <button
                onClick={() => setActiveWebTab("attendance")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeWebTab === "attendance" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
                }`}
              >
                Điểm Danh Thông Minh
              </button>
              <button
                onClick={() => setActiveWebTab("schedule")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeWebTab === "schedule" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
                }`}
              >
                Thời Khóa Biểu
              </button>
              <button
                onClick={() => setActiveWebTab("analytics")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeWebTab === "analytics" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
                }`}
              >
                Báo Cáo Phân Tích
              </button>
            </div>
          </div>

          {/* Web Dashboard Display Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 bg-[#0F2942] text-white">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  {activeWebTab === "matrix" && (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E54B4B]/20 text-[#E54B4B] text-xs font-bold">
                        <BookOpen className="w-3.5 h-3.5" /> Quản Lý Ma Trận Điểm
                      </div>
                      <h3 className="text-2xl font-bold">Tự Động Tính Điểm Trung Bình & Phân Loại Học Sinh</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Hệ thống ma trận điểm hỗ trợ nhập điểm chi tiết từng môn, tự động tính tổng kết theo hệ số chuẩn và phân xếp loại tự động.
                      </p>
                    </>
                  )}

                  {activeWebTab === "attendance" && (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                        <CheckSquare className="w-3.5 h-3.5" /> Điểm Danh Nhanh
                      </div>
                      <h3 className="text-2xl font-bold">Quản Lý Chuyên Cần Theo Tiết Học</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Điểm danh danh sách lớp với 1 click, cảnh báo tự động về máy phụ huynh nếu học sinh vắng mặt không lý do.
                      </p>
                    </>
                  )}

                  {activeWebTab === "schedule" && (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                        <Calendar className="w-3.5 h-3.5" /> Lịch Học Thông Minh
                      </div>
                      <h3 className="text-2xl font-bold">Xếp Thời Khóa Biểu Tự Động Tránh Xung Đột</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Thuật toán sắp xếp phòng học, tiết dạy cho giáo viên trực quan, hạn chế tối đa việc trùng lịch phòng lab/sân tập.
                      </p>
                    </>
                  )}

                  {activeWebTab === "analytics" && (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                        <BarChart3 className="w-3.5 h-3.5" /> Biểu Đồ Thống Kê
                      </div>
                      <h3 className="text-2xl font-bold">Báo Cáo Trực Quan Cho Ban Giám Hiệu</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Thống kê phổ điểm toàn trường, so sánh hiệu quả giảng dạy giữa các lớp và theo dõi xu hướng chất lượng đào tạo theo kỳ.
                      </p>
                    </>
                  )}

                  <div className="pt-2">
                    <Link
                      to={ROUTES.LOGIN}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#0F2942] font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                      Xem Giao Diện Web Thật
                      <ChevronRight className="w-4 h-4 text-[#E54B4B]" />
                    </Link>
                  </div>
                </div>

                {/* Simulated UI Window */}
                <div className="lg:col-span-7 bg-slate-900 rounded-xl p-4 border border-slate-700/80 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-xs text-slate-400 font-mono ml-2">EduMatrix Web Dashboard v2.4</span>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700 flex justify-between items-center text-slate-200">
                      <div>
                        <div className="text-emerald-400 font-bold">Lớp 10A1 — Môn Toán Hóa</div>
                        <div className="text-[11px] text-slate-400">Giáo viên phụ trách: ThS. Trần Văn Hùng</div>
                      </div>
                      <span className="px-2.5 py-1 bg-[#E54B4B] text-white rounded font-sans text-xs font-bold">Tất Cả 35 HS</span>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 border border-slate-700/50 font-sans text-xs">
                      <div className="grid grid-cols-4 font-bold text-slate-400 border-b border-slate-700 pb-1">
                        <span>Học Sinh</span>
                        <span>Điểm 15P</span>
                        <span>Điểm 1 Tiết</span>
                        <span>TB Học Kỳ</span>
                      </div>
                      <div className="grid grid-cols-4 text-slate-200 items-center">
                        <span className="font-semibold">Lê Hoàng Nam</span>
                        <span className="text-slate-300">9.0, 9.5</span>
                        <span className="text-slate-300">8.8</span>
                        <span className="font-bold text-emerald-400">9.1 (Xuất Sắc)</span>
                      </div>
                      <div className="grid grid-cols-4 text-slate-200 items-center">
                        <span className="font-semibold">Phạm Minh Anh</span>
                        <span className="text-slate-300">8.5, 8.0</span>
                        <span className="text-slate-300">9.0</span>
                        <span className="font-bold text-emerald-400">8.7 (Giỏi)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. MOBILE APP SHOWCASE SECTION                                */}
      {/* ------------------------------------------------------------- */}
      <section id="mobile-app" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold tracking-widest text-[#E54B4B] uppercase">Trải Nghiệm Đỉnh Cao Trên Smartphone</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F2942]">
              Ứng Dụng EduMatrix Mobile Đa Năng
            </h2>
            <p className="text-slate-600 text-base">
              Thiết kế dành riêng cho từng vai trò người dùng với giao diện tối ưu trên cả iOS & Android.
            </p>

            {/* Role Switcher Pills */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
              <button
                onClick={() => setActiveRole("parent")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeRole === "parent" ? "bg-[#0F2942] text-white shadow" : "text-slate-600 hover:text-[#0F2942]"
                }`}
              >
                Dành Cho Phụ Huynh
              </button>
              <button
                onClick={() => setActiveRole("student")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeRole === "student" ? "bg-[#0F2942] text-white shadow" : "text-slate-600 hover:text-[#0F2942]"
                }`}
              >
                Dành Cho Học Sinh
              </button>
              <button
                onClick={() => setActiveRole("teacher")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeRole === "teacher" ? "bg-[#0F2942] text-white shadow" : "text-slate-600 hover:text-[#0F2942]"
                }`}
              >
                Dành Cho Giáo Viên
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Phone Renders */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-72 bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-700 relative">
                <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-3" />

                <div className="bg-[#F8FAFC] rounded-[2.2rem] p-4 text-slate-900 min-h-[420px] flex flex-col justify-between space-y-4">
                  {activeRole === "parent" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="font-bold text-sm text-[#0F2942]">EduMatrix Parent</span>
                        <span className="text-[10px] font-bold text-[#E54B4B] bg-[#E54B4B]/10 px-2 py-0.5 rounded-full">Phụ Huynh</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#0F2942]">Con: Nguyễn Văn An</span>
                          <span className="text-[10px] text-emerald-600 font-bold">Đã Có Mặt</span>
                        </div>
                        <div className="text-[11px] text-slate-600">Điểm danh tiết 1 lúc 07:15 sáng hôm nay.</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 space-y-1">
                        <div className="text-xs font-bold text-[#0F2942]">📊 Điểm Số Mới Cập Nhật</div>
                        <div className="text-[11px] text-slate-600">Kiểm tra Toán 15P: <strong className="text-[#E54B4B]">9.5 Điểm</strong></div>
                      </div>
                    </div>
                  )}

                  {activeRole === "student" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="font-bold text-sm text-[#0F2942]">EduMatrix Student</span>
                        <span className="text-[10px] font-bold text-[#0F2942] bg-[#0F2942]/10 px-2 py-0.5 rounded-full">Học Sinh</span>
                      </div>
                      <div className="p-3 bg-[#0F2942] text-white rounded-xl space-y-1">
                        <div className="text-xs font-bold">Lịch Học Hôm Nay</div>
                        <div className="text-[11px] text-slate-300">07:30 - Toán | 09:15 - Vật Lý</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 space-y-1">
                        <div className="text-xs font-bold text-[#0F2942]">📝 Bài Tập Cần Nộp</div>
                        <div className="text-[11px] text-slate-600">Đề ôn tập Vật Lý 10 (Hạn: 22:00 Hôm nay)</div>
                      </div>
                    </div>
                  )}

                  {activeRole === "teacher" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="font-bold text-sm text-[#0F2942]">EduMatrix Teacher</span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Giáo Viên</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 space-y-2">
                        <div className="text-xs font-bold text-[#0F2942]">Điểm Danh Lớp 10A1</div>
                        <div className="text-[11px] text-slate-600">Có mặt: 34/35 | Vắng có phép: 1</div>
                        <button className="w-full py-1.5 bg-[#E54B4B] text-white rounded-lg text-xs font-bold">Xác Nhận Sỉ Số</button>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-center text-[10px] text-slate-400 font-semibold border-t">
                    Tải Miễn Phí Trên App Store & Google Play
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-[#0F2942]">
                  {activeRole === "parent" && "Theo Dõi Hành Trình Học Tập Của Con Mọi Lúc Mọi Nơi"}
                  {activeRole === "student" && "Lịch Học & Bài Tập Gọn Gàng Trong Lòng Bàn Tay"}
                  {activeRole === "teacher" && "Giảm 70% Thời Gian Điểm Danh & Sổ Sách Giảng Dạy"}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {activeRole === "parent" && "Phụ huynh nhận thông báo tức thì khi con đến trường, kiểm tra bảng điểm môn học và theo dõi nhắc nhở học phí minh bạch."}
                  {activeRole === "student" && "Học sinh dễ dàng tra cứu lịch thi, xem điểm kiểm tra chi tiết và nộp bài tập trực tuyến tiện lợi."}
                  {activeRole === "teacher" && "Thầy cô thực hiện điểm danh tự động bằng thao tác vuốt nhanh, nhập điểm ngay trên điện thoại và gửi thông báo chung cho cả lớp."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200">
                  <div className="text-xl font-bold text-[#0F2942]">Instant Push</div>
                  <div className="text-xs text-slate-500 font-semibold">Thông Báo Đèn Nền</div>
                </div>
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200">
                  <div className="text-xl font-bold text-[#E54B4B]">Biometric Lock</div>
                  <div className="text-xs text-slate-500 font-semibold">Bảo Mật Vân Tay / FaceID</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. SMART CLASSROOM BENTO GRID                                 */}
      {/* ------------------------------------------------------------- */}
      <section id="smart-classroom" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="text-xs font-bold tracking-widest text-[#E54B4B] uppercase">Lớp Học Thông Minh Thực Tế</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F2942]">
              Ứng Dụng Thực Tế Tại Các Lớp Học Việt Nam
            </h2>
            <p className="text-slate-600 text-base">
              EduMatrix VN biến các lớp học truyền thống thành môi trường giáo dục số tương tác cao.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cell 1: Large Visual Card */}
            <div className="md:col-span-2 bg-[#0F2942] rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-lg">
              <div className="relative z-10 space-y-3 max-w-md">
                <span className="px-3 py-1 bg-[#E54B4B] text-white text-xs font-bold rounded-full inline-block">Bảng Tương Tác</span>
                <h3 className="text-2xl font-bold leading-tight">Đồng Bộ Bài Giảng Lên Bảng Điện Tử Lớp Học</h3>
                <p className="text-slate-300 text-sm">
                  Thầy cô dễ dàng mở slide bài giảng, câu hỏi trắc nghiệm tương tác trực tiếp trên màn hình thông minh tại lớp.
                </p>
              </div>
              <div className="pt-6 relative z-10 flex items-center gap-4 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Tích hợp Smart TV/Projector</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#E54B4B]" /> Chấm điểm tức thì</span>
              </div>
            </div>

            {/* Cell 2: Metric Stat Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#E54B4B]/10 text-[#E54B4B] flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                <div className="text-4xl font-extrabold text-[#0F2942] pt-2">99.8%</div>
                <div className="text-sm font-bold text-slate-700">Tỷ Lệ Tương Tác Lớp Học</div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pt-4 border-t border-slate-100">
                Giúp học sinh hào hứng làm bài và tăng 35% khả năng ghi nhớ kiến thức tại lớp.
              </p>
            </div>

            {/* Cell 3: Security & Privacy */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F2942]/10 text-[#0F2942] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#0F2942]" />
                </div>
                <h4 className="text-lg font-bold text-[#0F2942]">Bảo Mật Chuẩn ISO/IEC</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dữ liệu điểm số và thông tin cá nhân của học sinh được mã hóa đầu cuối an toàn tuyệt đối.
                </p>
              </div>
            </div>

            {/* Cell 4: Medium Wide Feature */}
            <div className="md:col-span-2 bg-gradient-to-r from-[#0F2942] to-[#1B365D] rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
              <div className="space-y-2">
                <h4 className="text-xl font-bold">Hỗ Trợ Triển Khai Nhanh Trong 24-48 Giờ</h4>
                <p className="text-slate-300 text-xs max-w-md">
                  Đội ngũ kỹ thuật EduMatrix VN hỗ trợ tải dữ liệu học sinh, phân quyền giáo viên và đào tạo sử dụng tận nơi.
                </p>
              </div>
              <a
                href="#demo-form"
                className="px-6 py-3 bg-[#E54B4B] hover:bg-[#c8321a] text-white font-bold text-xs rounded-xl shadow transition-all flex-shrink-0"
              >
                Tư Vấn Miễn Phí
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. CLOSING CTA & CONSULTATION FORM SECTION                    */}
      {/* ------------------------------------------------------------- */}
      <section id="demo-form" className="py-20 bg-[#0F2942] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <span className="px-3.5 py-1.5 rounded-full bg-[#E54B4B]/20 text-[#E54B4B] text-xs font-bold tracking-wide uppercase">
                Chuyển Đổi Số Giáo Dục
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
                Sẵn Sàng Nâng Tầm Quản Lý Trường Học Của Bạn?
              </h2>
              <p className="text-slate-300 text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
                Hãy để EduMatrix VN đồng hành cùng nhà trường trong lộ trình chuyển đổi số học đường thông minh, tiết kiệm và tối ưu nhất.
              </p>

              <div className="pt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <CheckCircle2 className="w-5 h-5 text-[#E54B4B]" />
                  <span>Dùng thử đầy đủ tính năng hoàn toàn miễn phí</span>
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <CheckCircle2 className="w-5 h-5 text-[#E54B4B]" />
                  <span>Đội ngũ tư vấn tận nơi cho Ban Giám Hiệu</span>
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <CheckCircle2 className="w-5 h-5 text-[#E54B4B]" />
                  <span>Cam kết hỗ trợ kỹ thuật 24/7 suốt quá trình vận hành</span>
                </div>
              </div>
            </div>

            {/* Right Form Component */}
            <div className="lg:col-span-6 bg-white text-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0F2942]">Đăng Ký Thành Công!</h3>
                  <p className="text-slate-600 text-sm max-w-sm mx-auto">
                    Cảm ơn quý thầy cô/nhà quản lý. Chuyên viên tư vấn EduMatrix VN sẽ liên hệ trong vòng 30 phút.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2.5 bg-[#0F2942] text-white text-xs font-bold rounded-xl"
                  >
                    Gửi Yêu Cầu Khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="text-center lg:text-left border-b pb-4">
                    <h3 className="text-xl font-bold text-[#0F2942]">Đăng Ký Trải Nghiệm Demo</h3>
                    <p className="text-xs text-slate-500">Điền thông tin để nhận tài khoản trải nghiệm hệ thống miễn phí</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Họ Và Tên *</label>
                    <input
                      type="text"
                      required
                      placeholder="ThS. Nguyễn Văn A"
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0F2942] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên Trường / Trung Tâm *</label>
                    <input
                      type="text"
                      required
                      placeholder="Trường THPT..."
                      value={demoForm.school}
                      onChange={(e) => setDemoForm({ ...demoForm, school: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0F2942] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Số Điện Thoại *</label>
                      <input
                        type="tel"
                        required
                        placeholder="0912 xxx xxx"
                        value={demoForm.phone}
                        onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0F2942] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Vai Trò</label>
                      <select
                        value={demoForm.role}
                        onChange={(e) => setDemoForm({ ...demoForm, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0F2942] text-sm bg-white"
                      >
                        <option>Quản lý trường</option>
                        <option>Giáo viên</option>
                        <option>Phụ huynh</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#E54B4B] hover:bg-[#c8321a] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#E54B4B]/20 transition-all duration-200 mt-2 flex items-center justify-center gap-2"
                  >
                    Gửi Yêu Cầu Demo Miễn Phí
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <EduMatrixLogo variant="light" size="md" />
              <p className="text-xs text-slate-400 leading-relaxed">
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

          <div className="pt-8 border-t border-slate-900 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} EduMatrix VN. Tất cả quyền được bảo lưu. Thiết kế giao diện theo chuẩn Art Direction.
          </div>
        </div>
      </footer>
    </div>
  );
}
