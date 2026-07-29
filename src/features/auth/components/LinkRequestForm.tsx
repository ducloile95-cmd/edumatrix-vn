import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { MAX_DECLARED_CHILDREN, RELATIONSHIPS, linkRequestSchema, type LinkRequestFormValues } from "@/schemas/linkRequest";
import { createLinkRequest, type LinkRequest } from "@/services/firestore/linkRequests";

interface LinkRequestFormProps {
  user: User;
  /** Ban ghi dang co khi phu huynh gui lai sau khi bi tu choi. */
  existing?: LinkRequest | null;
  onSent: () => void;
}

const inputClass =
  "min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100 disabled:text-neutral-400";

const sectionClass = "overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]";

const emptyChild = { dateOfBirth: "", fullName: "", nickname: "", note: "" };

export function LinkRequestForm({ existing, onSent, user }: LinkRequestFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<LinkRequestFormValues>({
    resolver: zodResolver(linkRequestSchema),
    defaultValues: { children: [emptyChild], parentName: "", phone: "", relationship: "Bố" },
  });

  const children = useFieldArray({ control, name: "children" });

  useEffect(() => {
    if (!existing) return;
    reset({
      children: existing.children.map((child) => ({
        dateOfBirth: child.dateOfBirth,
        fullName: child.fullName,
        nickname: child.nickname ?? "",
        note: child.note ?? "",
      })),
      parentName: existing.parentName,
      phone: existing.phone,
      relationship: (RELATIONSHIPS as readonly string[]).includes(existing.relationship)
        ? (existing.relationship as (typeof RELATIONSHIPS)[number])
        : "Bố",
    });
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (values: LinkRequestFormValues) => createLinkRequest(user, values, existing ?? undefined),
    onSuccess: onSent,
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-3">
      <section className={sectionClass}>
        <SectionHeader title="Tài khoản đăng nhập" description="Lấy từ Google, không thay đổi được." />
        <div className="p-4">
          <Field label="Email">
            <input type="email" readOnly value={user.email ?? ""} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeader title="Thông tin phụ huynh" description="Trung tâm dùng để liên hệ khi cần xác minh." />
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Field error={errors.parentName?.message} label="Họ tên phụ huynh">
            <input type="text" placeholder="Ngô Thanh Tâm" className={inputClass} {...register("parentName")} />
          </Field>
          <Field error={errors.phone?.message} label="Số điện thoại">
            <input type="tel" placeholder="0912 847 193" className={inputClass} {...register("phone")} />
          </Field>
          <Field error={errors.relationship?.message} label="Quan hệ với học sinh">
            <select className={inputClass} {...register("relationship")}>
              {RELATIONSHIPS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeader
          title="Thông tin con"
          description={`Khai đủ để trung tâm tìm đúng hồ sơ. Tối đa ${MAX_DECLARED_CHILDREN} con mỗi lần gửi.`}
        />
        <div className="p-4">
          {children.fields.map((field, index) => (
            <div key={field.id} className="mb-3 rounded-input border border-neutral-200 p-3">
              <div className="mb-3 flex items-center">
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  Con thứ {index + 1}
                </span>
                {children.fields.length > 1 && (
                  <Button
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => children.remove(index)}
                    className="ml-auto min-h-0 h-8"
                    aria-label={`Xoá con thứ ${index + 1}`}
                  >
                    Xoá
                  </Button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field error={errors.children?.[index]?.fullName?.message} label="Họ tên con">
                  <input type="text" placeholder="Nguyễn Minh Anh" className={inputClass} {...register(`children.${index}.fullName`)} />
                </Field>
                <Field error={errors.children?.[index]?.nickname?.message} label="Biệt danh">
                  <input type="text" placeholder="Bi" className={inputClass} {...register(`children.${index}.nickname`)} />
                </Field>
                <Field error={errors.children?.[index]?.dateOfBirth?.message} label="Ngày sinh">
                  <input type="date" className={inputClass} {...register(`children.${index}.dateOfBirth`)} />
                </Field>
                <Field error={errors.children?.[index]?.note?.message} label="Ghi chú đối chiếu">
                  <input type="text" placeholder="Đang học lớp cô Lan" className={inputClass} {...register(`children.${index}.note`)} />
                </Field>
              </div>
            </div>
          ))}

          <Button
            icon={<Plus size={15} />}
            onClick={() => children.append(emptyChild)}
            disabled={children.fields.length >= MAX_DECLARED_CHILDREN}
            className="w-full"
          >
            Thêm con ({children.fields.length}/{MAX_DECLARED_CHILDREN})
          </Button>
          {errors.children?.root?.message && (
            <p role="alert" className="mt-2 text-xs text-danger-700">{errors.children.root.message}</p>
          )}
        </div>
      </section>

      {mutation.isError && (
        <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">
          Không gửi được yêu cầu. Kiểm tra kết nối mạng rồi thử lại.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang gửi..." : "Gửi cho trung tâm"}
        </Button>
      </div>
    </form>
  );
}

function SectionHeader({ description, title }: { description: string; title: string }) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
    </div>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-neutral-500">{label}</span>
      {children}
      {error && <span role="alert" className="text-xs text-danger-700">{error}</span>}
    </label>
  );
}
