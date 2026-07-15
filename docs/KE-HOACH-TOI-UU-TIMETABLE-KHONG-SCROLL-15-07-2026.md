# Ke hoach toi uu Nhánh 1 - Timetable khong can scroll-down

Ngay lap: 15/07/2026

Pham vi: Nhánh 1 - Timetable trong module Lich hoc, route Staff `/app/sessions`. Demo tinh: `docs/edumatrix-timetable-noscroll-demo-15-07-2026.html`.

## 1. Ket luan kha thi

Co the toi uu timetable de nhin du thong tin lop hoc ma khong can scroll-down, nhung khong nen giu nguyen time-grid 06:00-23:00 voi 17 hang cao 56px. Thiet ke hien tai tao chieu cao 952px, vuot vung nhin thong dung, nen bat buoc phai cuon noi bo.

Phuong an phu hop hon la them che do **Fit week** cho Nhánh 1:

- Van giu lich theo 7 ngay trong tuan.
- Bo truc gio dai 06:00-23:00 dang hang doc co dinh.
- Chia moi ngay thanh 3 khung: Sang, Chieu, Toi.
- Moi buoi hoc la mot card compact hien du thong tin can xem nhanh: lop, khoa/mon, gio, giao vien, phong, si so, trang thai.
- Buoi trung gio hien canh nhau trong cung khung, khong de len nhau.
- Khi can do chinh xac theo phut, van giu mode Time-grid hien tai nhu che do "Chinh xac".

## 2. Ly do khong nen chi ep chieu cao time-grid

Neu ep 17 gio vao mot man hinh 720px, moi gio chi con khoang 42px. Mot buoi 60-90 phut chi co 40-63px, khong du de hien day du ten lop, giao vien, phong, mon hoc, trang thai va ghi chu ma van doc tot.

Neu tiep tuc nhoi tat ca vao block time-grid, UI se gap 3 loi:

- Chu bi cat hoac phai giam font qua nho.
- Cac buoi trung gio nhanh chong mat kha nang doc.
- Mobile gan nhu khong kha thi neu khong doi model hien thi.

## 3. Phuong an de xuat

### Mode mac dinh: Fit week

Dung cho man hinh quan tri hang ngay. Muc tieu la tra loi nhanh: hom nay co lop nao, gio nao, ai day, phong nao, trang thai nao.

Thanh phan:

- Header gon: dieu huong tuan, nut Hom nay, toggle Fit week / Time-grid / Thang.
- KPI mini mot dong: lop hom nay, lop dang hoat dong, lop moi sap toi.
- Bang 7 cot ngay.
- Moi cot ngay co 3 band: Sang, Chieu, Toi.
- Card lop hoc hien du thong tin trong 4 dong ngan:
  - Ten lop va trang thai.
  - Khoa hoc / mon hoc.
  - Gio hoc va giao vien.
  - Phong va si so.

### Mode phu: Time-grid chinh xac

Giu lai grid 06:00-23:00 hien tai cho truong hop can xem vi tri thoi gian theo phut. Mode nay co the van can scroll noi bo, vi do la ban chat cua truc gio dai.

### Mode Thang

Giu month grid hien tai: dem so buoi theo ngay, bam vao ngay de vao Fit day hoac Time-grid day.

## 4. Dieu kien ap dung

Phuong an Fit week khong scroll hoat dong tot khi mat do lich moi ngay nam trong nguong van hanh thong thuong:

- 1-5 buoi moi ngay: hien du trong cot ngay.
- 6-8 buoi moi ngay: van hien du nhung can card compact hon.
- Tren 8 buoi moi ngay: can co canh bao "qua tai ngay" hoac chuyen rieng ngay do sang Fit day, vi bat ky UI khong scroll nao cung se phai danh doi kich thuoc chu hoac cat bot thong tin.

Voi trung tam lop hoc quy mo pilot/MVP, Fit week nen la mode mac dinh. Time-grid chi dung khi can do chinh xac lich theo truc gio.

## 5. Ke hoach trien khai vao code React

1. Tao component moi `FitWeekTimetable.tsx` trong `src/features/sessions/components/`.
2. Reuse data da co trong `SessionsPage.tsx`: `listSessions()`, `listClasses()`, `TimetableSession`.
3. Them type view moi: `"fit-week"` hoac doi label view `"week"` thanh 2 bien the: `fit` va `grid`.
4. Tach helper nhom buoi hoc theo ngay va khung gio vao `timetableLayout.ts`.
5. Card click van mo `SessionDetailModal`, khong doi service `updateSession()`.
6. Them test unit cho helper nhom band/trung gio neu du an da co test cho utils.
7. Chi sau khi duyet demo moi thay doi code that.

## 6. Tieu chi duyet demo

- Khong co scroll-down noi bo trong khu timetable o desktop 1280x720 tro len.
- Moi card lop hoc hien du: lop, mon/khoa, gio, giao vien, phong, si so, trang thai.
- Ngay co 2 buoi trung gio van doc duoc, khong de len nhau.
- Fit week khong lam mat mode Time-grid chinh xac hien tai.
- Mau sac, spacing, radius nhat quan voi `DESIGN-SYSTEM-v2.md` va cac demo UI da co.
