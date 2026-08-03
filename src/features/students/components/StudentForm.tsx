import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentFormSchema, type StudentFormValues } from "@/schemas/student";
import { listClasses } from "@/services/firestore/classes";
import { enrollStudent } from "@/services/firestore/enrollments";
import { createStudent, linkParentToStudent, updateStudent } from "@/services/firestore/students";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { StudentDoc } from "@/types/academic";

interface StudentFormProps {
  /** Neu co gia tri => form o che do sua, khong doi duoc ma hoc sinh (A13). */
  editingStudent?: (StudentDoc & { id: string }) | null;
  onDone?: () => void;
}

const inputClass =
  "min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100 disabled:text-neutral-400";

const sectionClass = "flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]";

export function StudentForm({ editingStudent, onDone }: StudentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingStudent;
  const { role } = useAuth();
  const isAdmin = role === USER_ROLES.ADMIN;
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses, staleTime: 60_000 });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      classId: "",
      dateOfBirth: "",
      fullName: "",
      nickname: "",
      parentAddress: "",
      parentEmail: "",
      parentFacebookUrl: "",
      parentName: "",
      parentPhone: "",
      staffNote: "",
      studentCode: "",
    },
  });

  useEffect(() => {
    if (editingStudent) {
      reset({
        classId: "",
        dateOfBirth: editingStudent.dateOfBirth,
        fullName: editingStudent.fullName,
        nickname: editingStudent.nickname ?? "",
        parentAddress: "",
        parentEmail: "",
        parentFacebookUrl: "",
        parentName: "",
        parentPhone: "",
        staffNote: editingStudent.staffNote ?? "",
        studentCode: editingStudent.studentCode,
      });
    } else {
      reset({
        classId: "",
        dateOfBirth: "",
        fullName: "",
        nickname: "",
        parentAddress: "",
        parentEmail: "",
        parentFacebookUrl: "",
        parentName: "",
        parentPhone: "",
        staffNote: "",
        studentCode: "",
      });
    }
  }, [editingStudent, reset]);

  const mutation = useMutation({
    mutationFn: async (values: StudentFormValues): Promise<string[]> => {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          dateOfBirth: values.dateOfBirth,
          fullName: values.fullName,
          nickname: values.nickname ?? "",
          staffNote: values.staffNote ?? "",
        });
        return [];
      }

      // Buoc bat buoc. That bai o day thi chua co gi duoc ghi, nem loi nhu cu.
      await createStudent({
        dateOfBirth: values.dateOfBirth,
        fullName: values.fullName,
        nickname: values.nickname ?? "",
        studentCode: values.studentCode,
      });

      // Ba buoc ben duoi chay SAU khi ho so da nam trong Firestore. Nem loi o day
      // se de lai hoc sinh mo coi va lan submit sau dinh student_code_exists (C1),
      // nen chung chi duoc bao cao mem qua danh sach warnings.
      const studentId = values.studentCode.trim().toUpperCase();
      const warnings: string[] = [];

      if (values.staffNote) {
        try {
          await updateStudent(studentId, {
            dateOfBirth: values.dateOfBirth,
            fullName: values.fullName,
            staffNote: values.staffNote,
          });
        } catch {
          warnings.push("staff_note_failed");
        }
      }

      if (isAdmin && values.parentEmail) {
        try {
          const result = await linkParentToStudent(studentId, values.parentEmail, {
            address: values.parentAddress ?? "",
            displayName: values.parentName ?? "",
            facebookUrl: values.parentFacebookUrl ?? "",
            phone: values.parentPhone ?? "",
          });
          if (!result.linked) warnings.push(`parent_${result.reason}`);
        } catch {
          warnings.push("parent_error");
        }
      }

      if (values.classId) {
        const selectedClass = classes.data?.find((item) => item.id === values.classId);
        if (!selectedClass) {
          warnings.push("class_not_found");
        } else {
          try {
            await enrollStudent(values.classId, selectedClass.courseId, studentId);
          } catch {
            warnings.push("enroll_failed");
          }
        }
      }

      return warnings;
    },
    onSuccess: (warnings) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      // Con canh bao thi giu form mo de Admin doc duoc, khong dong ngay.
      if (!warnings.length) onDone?.();
    },
  });

  const partialWarnings = mutation.data ?? [];
  const formLayoutClass = isAdmin
    ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.15fr)_minmax(260px,.7fr)]"
    : "lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]";

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className={`grid items-stretch gap-4 ${formLayoutClass}`}
    >
      <section className={sectionClass}>
        <SectionHeader title="Thông tin cơ bản" description="Thông tin định danh của học sinh trong hệ thống." />
        <div className="grid flex-1 gap-3 p-4 sm:grid-cols-2">
          <Field error={errors.studentCode?.message} label="Mã học sinh">
            <input
              type="text"
              placeholder="HS001"
              disabled={isEditing}
              className={inputClass}
              {...register("studentCode")}
            />
          </Field>
          <Field error={errors.fullName?.message} label="Tên học sinh">
            <input type="text" placeholder="Nguyễn Minh Anh" className={inputClass} {...register("fullName")} />
          </Field>
          <Field error={errors.nickname?.message} label="Biệt danh / tên gọi khác">
            <input type="text" placeholder="Bi (bỏ trống nếu không cần)" className={inputClass} {...register("nickname")} />
          </Field>
          <Field error={errors.dateOfBirth?.message} label="Ngày sinh">
            <input type="date" className={inputClass} {...register("dateOfBirth")} />
          </Field>
          <div className="sm:col-span-2">
            <Field error={errors.staffNote?.message} label="Ghi chú giáo viên/Admin">
              <textarea
                placeholder="Ghi chú nội bộ về tình hình học tập, trao đổi phụ huynh, lưu ý trong lớp..."
                className={`${inputClass} min-h-[84px] resize-none py-2 leading-6`}
                {...register("staffNote")}
              />
            </Field>
          </div>
        </div>
      </section>

      {isAdmin && <section className={sectionClass}>
        <SectionHeader title="Thông tin phụ huynh" description="Nhập email để liên kết tài khoản phụ huynh đã có trong hệ thống." />
        <div className="grid flex-1 gap-3 p-4 sm:grid-cols-2">
          <Field error={errors.parentName?.message} label="Tên phụ huynh">
            <input type="text" placeholder="Nguyễn Văn A" className={inputClass} {...register("parentName")} />
          </Field>
          <Field error={errors.parentPhone?.message} label="Số điện thoại">
            <input type="tel" placeholder="09xxxxxxxx" className={inputClass} {...register("parentPhone")} />
          </Field>
          <Field error={errors.parentEmail?.message} label="Email liên kết">
            <input type="email" placeholder="phuhuynh@example.com" className={inputClass} {...register("parentEmail")} />
          </Field>
          <Field error={errors.parentFacebookUrl?.message} label="Link Facebook liên kết">
            <input type="url" placeholder="https://facebook.com/..." className={inputClass} {...register("parentFacebookUrl")} />
          </Field>
          <div className="sm:col-span-2">
            <Field error={errors.parentAddress?.message} label="Địa chỉ">
              <input
                type="text"
                placeholder="Số nhà, đường, phường/xã, quận/huyện"
                className={inputClass}
                {...register("parentAddress")}
              />
            </Field>
          </div>
        </div>
      </section>}

      <section className={sectionClass}>
        <SectionHeader title="Đăng ký lớp học" description="Có thể chọn lớp ngay khi tạo hồ sơ hoặc bỏ trống để đăng ký sau." />
        <div className="grid content-start gap-3 p-4">
          <Field error={errors.classId?.message} label="Lớp học">
            <select className={inputClass} disabled={classes.isLoading || isEditing} {...register("classId")}>
              <option value="">Chưa đăng ký lớp</option>
              {classes.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {item.id}
                </option>
              ))}
            </select>
          </Field>
          <div className="rounded-input border border-neutral-200 bg-white px-3 py-2 text-xs leading-5 text-neutral-500">
            Khi chọn lớp, hệ thống tự tạo ghi danh, thêm học sinh vào lớp và đồng bộ giáo viên phụ trách.
          </div>
        </div>
      </section>

      {mutation.isError && (
        <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700 lg:col-span-full">
          {getMutationErrorMessage(mutation.error)}
        </p>
      )}

      {partialWarnings.length > 0 && (
        <div role="alert" className="rounded-input border border-warning-300 bg-warning-50 px-3 py-2 text-sm leading-6 text-warning-900 lg:col-span-full">
          <p className="font-semibold">Đã tạo hồ sơ học sinh, nhưng các bước sau chưa hoàn tất:</p>
          <ul className="mt-1 list-disc pl-5">
            {partialWarnings.map((warning) => (
              <li key={warning}>{getWarningMessage(warning)}</li>
            ))}
          </ul>
          <p className="mt-1">Hồ sơ đã được lưu an toàn. Đừng thêm lại học sinh từ đầu; làm theo hướng dẫn trên để hoàn tất phần còn thiếu.</p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 lg:col-span-full">
        <button
          type="button"
          onClick={() => onDone?.()}
          className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          {partialWarnings.length > 0 ? "Đóng" : "Hủy"}
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || partialWarnings.length > 0}
          className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Đang lưu..." : partialWarnings.length > 0 ? "Đã tạo học sinh" : isEditing ? "Lưu thay đổi" : "Thêm học sinh"}
        </button>
      </div>
    </form>
  );
}

function SectionHeader({ description, title }: { description: string; title: string }) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
    </div>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-neutral-500">{label}</span>
      {children}
      {error && (
        <span role="alert" className="text-xs text-danger-700">
          {error}
        </span>
      )}
    </label>
  );
}

function getMutationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "not_found") return "Không tìm thấy tài khoản phụ huynh theo email đã nhập.";
  if (message === "not_viewer") return "Email này không thuộc tài khoản phụ huynh/học sinh.";
  if (message === "class_not_found") return "Không tìm thấy lớp học đã chọn.";
  return "Không thể lưu học sinh. Kiểm tra mã học sinh, thông tin liên kết hoặc quyền truy cập.";
}

/** Cac buoc bo sung that bai SAU khi ho so da duoc tao - hoc sinh van ton tai (C1). */
function getWarningMessage(warning: string): string {
  if (warning === "staff_note_failed") return "Chưa lưu được ghi chú. Mở Thông tin học sinh, nhập lại ghi chú rồi lưu.";
  if (warning === "parent_not_found") return "Chưa liên kết phụ huynh: không tìm thấy tài khoản theo email đã nhập. Kiểm tra tài khoản rồi liên kết lại trong Thông tin học sinh.";
  if (warning === "parent_not_viewer") return "Chưa liên kết phụ huynh: email không thuộc tài khoản phụ huynh/học sinh. Kiểm tra đúng loại tài khoản rồi liên kết lại trong Thông tin học sinh.";
  if (warning === "parent_error") return "Chưa liên kết phụ huynh do lỗi ghi dữ liệu. Mở Thông tin học sinh và liên kết lại.";
  if (warning === "class_not_found") return "Chưa ghi danh: không tìm thấy lớp đã chọn. Vào Lớp học, mở lớp phù hợp và ghi danh học sinh.";
  if (warning === "enroll_failed") return "Chưa ghi danh do lỗi ghi dữ liệu. Vào Lớp học, mở lớp đã chọn và ghi danh học sinh.";
  return "Một bước bổ sung chưa hoàn tất.";
}
