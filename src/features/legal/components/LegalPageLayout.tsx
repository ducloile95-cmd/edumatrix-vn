import type { ReactNode } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants/routes";

type LegalPageLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function LegalPageLayout({
  title,
  description,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-6">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-8 sm:px-10">
          <Link
            to={ROUTES.LOGIN}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            EduMatrix
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">{description}</p>
          <p className="mt-4 text-sm text-slate-500">
            Cập nhật lần cuối: 28/07/2026
          </p>
        </header>

        <div className="space-y-8 px-6 py-8 leading-7 sm:px-10">{children}</div>

        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 px-6 py-5 text-sm sm:px-10">
          <Link
            to={ROUTES.PRIVACY_POLICY}
            className="font-medium text-blue-700 hover:text-blue-800"
          >
            Chính sách quyền riêng tư
          </Link>
          <Link
            to={ROUTES.DATA_DELETION}
            className="font-medium text-blue-700 hover:text-blue-800"
          >
            Hướng dẫn xóa dữ liệu
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-slate-600 hover:text-slate-900"
          >
            Đăng nhập
          </Link>
        </footer>
      </article>
    </main>
  );
}
