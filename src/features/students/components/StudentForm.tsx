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

const sectionClass = "overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]";

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
    mutationFn: async (values: StudentFormValues) => {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          dateOfBirth: values.dateOfBirth,
          fullName: values.fullName,
          staffNote: values.staffNote ?? "",
        });
        return;
      }

      await createStudent({
        dateOfBirth: values.dateOfBirth,
        fullName: values.fullName,
        studentCode: values.studentCode,
      });

      const studentId = values.studentCode.trim().toUpperCase();
      if (values.staffNote) {
        await updateStudent(studentId, {
          dateOfBirth: values.dateOfBirth,
          fullName: values.fullName,
          staffNote: values.staffNote,
        });
      }

      if (isAdmin && values.parentEmail) {
        const result = await linkParentToStudent(studentId, values.parentEmail, {
          address: values.parentAddress ?? "",
          displayName: values.parentName ?? "",
          facebookUrl: values.parentFacebookUrl ?? "",
          phone: values.parentPhone ?? "",
        });
        if (!result.linked) throw new Error(result.reason);
      }

      if (values.classId) {
        const selectedClass = classes.data?.find((item) => item.id === values.classId);
        if (!selectedClass) throw new Error("class_not_found");
        await enrollStudent(values.classId, selectedClass.courseId, studentId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      onDone?.();
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-4">
      <section className={sectionClass}>
        <SectionHeader title="Thông tin cơ bản" description="Thông tin định danh của học sinh trong hệ thống." />
        <div className="grid gap-3 p-4 md:grid-cols-3">
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
          <Field error={errors.dateOfBirth?.message} label="Ngày sinh">
            <input type="date" className={inputClass} {...register("dateOfBirth")} />
          </Field>
          <div className="md:col-span-3">
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
        <div className="grid gap-3 p-4 md:grid-cols-2">
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
          <div className="md:col-span-2">
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
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr]">
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
        <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {getMutationErrorMessage(mutation.error)}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={() => onDone?.()}
          className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm học sinh"}
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
