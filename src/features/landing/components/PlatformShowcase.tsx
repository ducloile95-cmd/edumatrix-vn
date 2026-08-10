import { useState } from "react";
import { Link } from "react-router";
import { BarChart3, BookOpen, Calendar, CheckSquare, ChevronRight } from "lucide-react";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { ROUTES } from "@/constants/routes";

export function PlatformShowcase() {
  const [activeWebTab, setActiveWebTab] = useState<"matrix" | "attendance" | "schedule" | "analytics">("matrix");

  return (
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
          <Tabs label="Tính năng nền tảng web" className="mt-6 flex-wrap gap-2 rounded-xl border-b-0 bg-slate-200/80 p-1.5 md:mt-0">
            <Tab
              id="web-tab-matrix"
              aria-controls="web-platform-panel"
              active={activeWebTab === "matrix"}
              onClick={() => setActiveWebTab("matrix")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeWebTab === "matrix" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
              }`}
            >
              Ma Trận Điểm
            </Tab>
            <Tab
              id="web-tab-attendance"
              aria-controls="web-platform-panel"
              active={activeWebTab === "attendance"}
              onClick={() => setActiveWebTab("attendance")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeWebTab === "attendance" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
              }`}
            >
              Điểm Danh Thông Minh
            </Tab>
            <Tab
              id="web-tab-schedule"
              aria-controls="web-platform-panel"
              active={activeWebTab === "schedule"}
              onClick={() => setActiveWebTab("schedule")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeWebTab === "schedule" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
              }`}
            >
              Thời Khóa Biểu
            </Tab>
            <Tab
              id="web-tab-analytics"
              aria-controls="web-platform-panel"
              active={activeWebTab === "analytics"}
              onClick={() => setActiveWebTab("analytics")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeWebTab === "analytics" ? "bg-[#0F2942] text-white shadow-sm" : "text-slate-700 hover:text-[#0F2942]"
              }`}
            >
              Báo Cáo Phân Tích
            </Tab>
          </Tabs>
        </div>
    
        {/* Web Dashboard Display Card */}
        <div id="web-platform-panel" role="tabpanel" aria-labelledby={`web-tab-${activeWebTab}`} className="bg-neutral-0 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-0 text-[#0F2942] font-bold text-sm hover:bg-slate-100 transition-colors"
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
  );
}
