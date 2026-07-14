import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LogOut, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase/client";
import { NAVIGATION_BY_ROLE, isNavGroup, type NavGroup, type NavLeaf } from "@/constants/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROLE_LABELS } from "@/constants/roles";
import { Logo } from "@/components/ui/Logo";

interface SidebarProps { collapsed: boolean; mobileOpen: boolean; onClose: () => void; onToggle: () => void }

function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.children.some((child) => !child.disabled && (pathname === child.to || pathname.startsWith(`${child.to}/`)));
}

/** 1 mục lá: link điều hướng hoặc mục "sắp có" (disabled). `variant`: cấp cha hay con trong nhóm. */
function Leaf({ item, collapsed, onClose, variant }: { item: NavLeaf; collapsed: boolean; onClose: () => void; variant: "top" | "child" }) {
  const pad = variant === "child" ? "pl-10 pr-3" : "px-3";
  const label = (
    <span className={`flex-1 whitespace-nowrap transition-opacity ${collapsed ? "lg:pointer-events-none lg:opacity-0" : "opacity-100"}`}>{item.label}</span>
  );
  if (item.disabled) {
    return (
      <span title={collapsed ? `${item.label} (sắp có)` : undefined} className={`flex min-h-touch cursor-not-allowed items-center gap-3 rounded-xl ${pad} text-sm font-medium text-neutral-400`}>
        <item.icon size={variant === "child" ? 17 : 19} className="shrink-0" aria-hidden="true" />
        {label}
        {!collapsed && <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">Sắp có</span>}
      </span>
    );
  }
  return (
    <NavLink to={item.to} onClick={onClose} title={collapsed ? item.label : undefined}
      className={({ isActive }) => `group relative flex min-h-touch items-center gap-3 overflow-hidden rounded-xl ${pad} text-sm font-medium transition-all active:scale-[.98] ${isActive ? "bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_8px_20px_rgba(35,72,214,.25)]" : "text-neutral-600 hover:bg-white/75 hover:text-primary-700"}`} style={{ transitionDuration: "var(--motion-duration)" }}>
      <item.icon size={variant === "child" ? 17 : 19} className="shrink-0" aria-hidden="true" />{label}
    </NavLink>
  );
}

/** Nhóm accordion: header gập/mở + danh sách con; khi thu gọn hiện flyout khi hover. */
function Group({ group, collapsed, open, onToggle, onClose }: { group: NavGroup; collapsed: boolean; open: boolean; onToggle: () => void; onClose: () => void }) {
  const hasActive = groupHasActive(group, useLocation().pathname);
  return (
    <li className="group/g relative">
      <button type="button" onClick={onToggle} aria-expanded={open} title={collapsed ? group.label : undefined}
        className={`flex min-h-touch w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${hasActive ? "text-primary-700" : "text-neutral-600 hover:bg-white/75 hover:text-primary-700"}`} style={{ transitionDuration: "var(--motion-duration)" }}>
        <group.icon size={19} className="shrink-0" aria-hidden="true" />
        <span className={`flex-1 whitespace-nowrap text-left transition-opacity ${collapsed ? "lg:pointer-events-none lg:opacity-0" : "opacity-100"}`}>{group.label}</span>
        <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""} ${collapsed ? "lg:hidden" : ""}`} style={{ transitionDuration: "var(--motion-duration)" }} />
      </button>

      {/* Accordion inline (ẩn khi thu gọn) */}
      <div className={`grid transition-[grid-template-rows] ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${collapsed ? "lg:hidden" : ""}`} style={{ transitionDuration: "var(--motion-duration)" }}>
        <ul className="mt-1 space-y-1 overflow-hidden">
          {group.children.map((child) => <li key={child.label}><Leaf item={child} collapsed={collapsed} onClose={onClose} variant="child" /></li>)}
        </ul>
      </div>

      {/* Flyout khi thu gọn (chỉ desktop) */}
      <div className={`${collapsed ? "hidden lg:block" : "hidden"} pointer-events-none invisible absolute left-full top-0 z-50 ml-2 w-56 opacity-0 transition group-hover/g:visible group-hover/g:pointer-events-auto group-hover/g:opacity-100`}>
        <div className="glass-panel rounded-2xl border border-white/80 p-2 shadow-[var(--shadow-3)]">
          <p className="px-2 py-1 text-xs font-semibold text-primary-700">{group.label}</p>
          <ul className="space-y-0.5">
            {group.children.map((child) => (
              <li key={child.label}>
                {child.disabled
                  ? <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-400">{child.label}<span className="rounded-full bg-neutral-200/80 px-1.5 text-[10px] font-semibold">Sắp có</span></span>
                  : <NavLink to={child.to} onClick={onClose} className={({ isActive }) => `block rounded-lg px-2 py-1.5 text-sm ${isActive ? "bg-primary-50 font-medium text-primary-700" : "text-neutral-700 hover:bg-white/75 hover:text-primary-700"}`}>{child.label}</NavLink>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

export function Sidebar({ collapsed, mobileOpen, onClose, onToggle }: SidebarProps) {
  const { role, userDoc } = useAuth();
  const nodes = role ? NAVIGATION_BY_ROLE[role] : [];
  // Các nhánh MẶC ĐỊNH mở hết; chỉ lưu nhánh người dùng CHỦ ĐỘNG thu gọn (bền qua điều hướng → không tự thu gọn khi đổi tác vụ).
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("edumatrix-nav-closed") ?? "[]") as string[]); } catch { return new Set(); }
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggleGroup = (label: string) => setClosedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    localStorage.setItem("edumatrix-nav-closed", JSON.stringify([...next]));
    return next;
  });

  return <>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-neutral-900/40 backdrop-blur-[2px] lg:hidden" aria-label="Đóng menu điều hướng" onClick={onClose} />}
    <aside className={`glass-panel fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-white/70 transition-[transform,width] lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${mobileOpen ? "translate-x-0" : ""} ${collapsed ? "lg:w-[74px]" : "lg:w-64"}`} style={{ transitionDuration: "var(--motion-duration)" }}>
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-neutral-200/70 px-3">
        <Logo className={`h-10 w-auto ${collapsed ? "lg:w-10 lg:object-cover lg:object-left" : ""}`} />
        <button type="button" onClick={onClose} aria-label="Đóng menu" className="icon-button lg:hidden"><X size={20} /></button>
        <button type="button" onClick={onToggle} aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"} className="icon-button hidden lg:flex">{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
      </div>

      <nav aria-label="Điều hướng chính" className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1.5">
          {nodes.map((node) => isNavGroup(node)
            ? <Group key={node.label} group={node} collapsed={collapsed} open={!closedGroups.has(node.label)} onToggle={() => toggleGroup(node.label)} onClose={onClose} />
            : <li key={node.label}><Leaf item={node} collapsed={collapsed} onClose={onClose} variant="top" /></li>)}
        </ul>
      </nav>

      {/* Thẻ tài khoản ở CHÂN sidebar (đã dời từ top bar) */}
      <div ref={accountRef} className="relative border-t border-neutral-200/70 p-3">
        {accountOpen && (
          <div className="glass-panel absolute inset-x-3 bottom-full mb-2 rounded-2xl border border-white/80 p-2 shadow-[var(--shadow-3)]">
            <button type="button" onClick={() => signOut(auth)} className="flex min-h-touch w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-danger-700 transition hover:bg-danger-50"><LogOut size={17} />Đăng xuất</button>
          </div>
        )}
        <button type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen((value) => !value)} title={collapsed ? userDoc?.displayName ?? "Tài khoản" : undefined}
          className="flex w-full items-center gap-3 rounded-xl border border-white/70 bg-white/60 p-2 text-left transition hover:bg-white/80">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(35,72,214,.22)]">{userDoc?.displayName?.trim().charAt(0).toUpperCase() || "E"}</span>
          <span className={`min-w-0 flex-1 transition-opacity ${collapsed ? "lg:pointer-events-none lg:opacity-0" : "opacity-100"}`}>
            <span className="block truncate text-sm font-semibold text-neutral-900">{userDoc?.displayName ?? "Tài khoản"}</span>
            <span className="block truncate text-[11px] text-neutral-500">{userDoc ? ROLE_LABELS[userDoc.role] : ""}</span>
          </span>
          <ChevronUp size={15} className={`shrink-0 text-neutral-400 ${collapsed ? "lg:hidden" : ""}`} />
        </button>
      </div>
    </aside>
  </>;
}
