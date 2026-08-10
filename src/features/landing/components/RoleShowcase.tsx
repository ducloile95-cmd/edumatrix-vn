import { useState } from "react";
import { Tab, Tabs } from "@/components/ui/Tabs";

export function RoleShowcase() {
  const [activeRole, setActiveRole] = useState<"parent" | "student" | "teacher">("parent");

  return (
    <section id="mobile-app" className="py-20 bg-neutral-0 border-y border-slate-200/80">
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
          <Tabs label="Vai trò ứng dụng mobile" className="inline-flex gap-1 rounded-xl border-b-0 bg-slate-100 p-1">
            <Tab
              id="role-tab-parent"
              aria-controls="role-panel"
              active={activeRole === "parent"}
              onClick={() => setActiveRole("parent")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeRole === "parent" ? "bg-[#0F2942] text-white shadow" : "text-slate-600 hover:text-[#0F2942]"
              }`}
            >
              Dành Cho Phụ Huynh
            </Tab>
            <Tab
              id="role-tab-student"
              aria-controls="role-panel"
              active={activeRole === "student"}
              onClick={() => setActiveRole("student")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeRole === "student" ? "bg-[#0F2942] text-white shadow" : "text-slate-600 hover:text-[#0F2942]"
              }`}
            >
              Dành Cho Học Sinh
            </Tab>
            <Tab
              id="role-tab-teacher"
              aria-controls="role-panel"
              active={activeRole === "teacher"}
              onClick={() => setActiveRole("teacher")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeRole === "teacher" ? "bg-[#0F2942] text-white shadow" : "text-slate-600 hover:text-[#0F2942]"
              }`}
            >
              Dành Cho Giáo Viên
            </Tab>
          </Tabs>
        </div>
    
        <div id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${activeRole}`} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
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
                    <div className="p-3 bg-neutral-0 rounded-xl shadow-sm border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0F2942]">Con: Nguyễn Văn An</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Đã Có Mặt</span>
                      </div>
                      <div className="text-[11px] text-slate-600">Điểm danh tiết 1 lúc 07:15 sáng hôm nay.</div>
                    </div>
                    <div className="p-3 bg-neutral-0 rounded-xl shadow-sm border border-slate-200 space-y-1">
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
                    <div className="p-3 bg-neutral-0 rounded-xl shadow-sm border border-slate-200 space-y-1">
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
                    <div className="p-3 bg-neutral-0 rounded-xl shadow-sm border border-slate-200 space-y-2">
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
  );
}
