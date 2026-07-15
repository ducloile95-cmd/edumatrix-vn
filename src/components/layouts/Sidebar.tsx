import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LogOut,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase/authClient";
import { NAVIGATION_BY_ROLE, isNavGroup, type NavGroup, type NavLeaf, type NavNode } from "@/constants/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROLE_LABELS } from "@/constants/roles";
import { Logo } from "@/components/ui/Logo";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.children.some((child) => !child.disabled && (pathname === child.to || pathname.startsWith(`${child.to}/`)));
}

function filterNavigation(nodes: NavNode[], query: string): NavNode[] {
  const term = query.trim().toLowerCase();
  if (!term) return nodes;

  const result: NavNode[] = [];
  for (const node of nodes) {
    if (!isNavGroup(node)) {
      if (node.label.toLowerCase().includes(term)) result.push(node);
      continue;
    }

    if (node.label.toLowerCase().includes(term)) {
      result.push(node);
      continue;
    }

    const children = node.children.filter((child) => `${node.label} ${child.label}`.toLowerCase().includes(term));
    if (children.length) result.push({ ...node, children });
  }
  return result;
}

function Leaf({
  collapsed,
  item,
  onClose,
  variant,
}: {
  collapsed: boolean;
  item: NavLeaf;
  onClose: () => void;
  variant: "top" | "child";
}) {
  const pad = variant === "child" ? "pl-5 pr-2" : "px-2.5";
  const iconSize = variant === "child" ? 13 : 16;
  const textSize = variant === "child" ? "text-[10.75px]" : "text-[12.5px]";
  const rowHeight = variant === "child" ? "h-[30px]" : "h-8";
  const inactiveColor =
    variant === "child"
      ? "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
      : "text-primary-700 hover:bg-primary-50 hover:text-primary-800";
  const label = (
    <span className={`min-w-0 flex-1 truncate transition-opacity ${collapsed ? "lg:pointer-events-none lg:opacity-0" : "opacity-100"}`}>
      {item.label}
    </span>
  );

  if (item.disabled) {
    return (
      <span
        title={collapsed ? `${item.label} (sắp có)` : undefined}
        className={`flex ${rowHeight} cursor-not-allowed items-center gap-2 rounded-lg ${pad} ${textSize} font-medium text-neutral-400`}
      >
        <item.icon size={iconSize} className="shrink-0" aria-hidden="true" />
        {label}
        {!collapsed && <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">Sắp có</span>}
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex ${rowHeight} items-center gap-2 overflow-hidden rounded-lg ${pad} ${textSize} font-medium transition-all active:scale-[.98] ${
          isActive ? "bg-primary-50 text-primary-800 shadow-[inset_3px_0_0_#3366F0]" : inactiveColor
        }`
      }
      style={{ transitionDuration: "var(--motion-duration)" }}
    >
      <item.icon size={iconSize} className="shrink-0 text-current" aria-hidden="true" />
      {label}
    </NavLink>
  );
}

function Group({
  collapsed,
  group,
  onClose,
  onToggle,
  open,
}: {
  collapsed: boolean;
  group: NavGroup;
  onClose: () => void;
  onToggle: () => void;
  open: boolean;
}) {
  const { pathname } = useLocation();
  const hasActive = groupHasActive(group, pathname);

  return (
    <li className="group/g relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={collapsed ? group.label : undefined}
        className={`flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[12.5px] font-semibold transition-colors ${
          hasActive ? "bg-primary-50 text-primary-800" : "text-primary-700 hover:bg-primary-50 hover:text-primary-800"
        }`}
        style={{ transitionDuration: "var(--motion-duration)" }}
      >
        <group.icon size={16} className="shrink-0" aria-hidden="true" />
        <span className={`min-w-0 flex-1 truncate text-left transition-opacity ${collapsed ? "lg:pointer-events-none lg:opacity-0" : "opacity-100"}`}>
          {group.label}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""} ${collapsed ? "lg:hidden" : ""}`}
          style={{ transitionDuration: "var(--motion-duration)" }}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${collapsed ? "lg:hidden" : ""}`}
        style={{ transitionDuration: "var(--motion-duration)" }}
      >
        <ul className="ml-[18px] mt-1 space-y-0.5 overflow-hidden border-l border-neutral-200 pl-2">
          {group.children.map((child) => (
            <li key={child.label}>
              <Leaf item={child} collapsed={collapsed} onClose={onClose} variant="child" />
            </li>
          ))}
        </ul>
      </div>

      <div className={`${collapsed ? "hidden lg:block" : "hidden"} pointer-events-none invisible absolute left-full top-0 z-50 ml-2 w-56 opacity-0 transition group-hover/g:visible group-hover/g:pointer-events-auto group-hover/g:opacity-100`}>
        <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-[var(--shadow-3)]">
          <p className="px-2 py-1 text-xs font-semibold text-primary-700">{group.label}</p>
          <ul className="space-y-0.5">
            {group.children.map((child) => (
              <li key={child.label}>
                {child.disabled ? (
                  <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-neutral-400">
                    {child.label}
                    <span className="rounded-full bg-neutral-200/80 px-1.5 text-[10px] font-semibold">Sắp có</span>
                  </span>
                ) : (
                  <NavLink
                    to={child.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `block rounded-lg px-2 py-1.5 text-[11px] ${
                        isActive ? "bg-primary-50 font-medium text-primary-700" : "text-neutral-700 hover:bg-neutral-100 hover:text-primary-700"
                      }`
                    }
                  >
                    {child.label}
                  </NavLink>
                )}
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
  const nodes = useMemo(() => (role ? NAVIGATION_BY_ROLE[role] : []), [role]);
  const [query, setQuery] = useState("");
  const visibleNodes = useMemo(() => filterNavigation(nodes, query), [nodes, query]);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("edumatrix-nav-closed") ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onClose]);

  const toggleGroup = (label: string) => {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      localStorage.setItem("edumatrix-nav-closed", JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-neutral-900/40 backdrop-blur-[2px] lg:hidden" aria-label="Đóng menu điều hướng" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[244px] -translate-x-full flex-col border-r border-neutral-200 bg-white transition-[transform,width] lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : ""
        } ${collapsed ? "lg:w-[76px]" : "lg:w-[244px]"}`}
        style={{ transitionDuration: "var(--motion-duration)" }}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between px-4">
          <Logo className={`h-10 w-auto ${collapsed ? "lg:w-10 lg:object-cover lg:object-left" : ""}`} />
          <button type="button" onClick={onClose} aria-label="Đóng menu" className="icon-button lg:hidden">
            <X size={20} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 lg:flex"
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        <div className={`px-4 pb-3 transition-opacity ${collapsed ? "lg:pointer-events-none lg:h-0 lg:overflow-hidden lg:px-2 lg:pb-0 lg:opacity-0" : "opacity-100"}`}>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-neutral-500 shadow-[0_1px_2px_rgba(15,23,42,.04)] focus-within:border-primary-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100">
            <Search size={16} className="shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm..."
              className="min-w-0 flex-1 bg-transparent text-xs font-medium text-neutral-800 outline-none placeholder:text-neutral-400 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="rounded-md bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">F</span>
            <SlidersHorizontal size={15} className="shrink-0 rounded-md bg-neutral-200/70 p-0.5 text-neutral-500" />
          </label>
        </div>

        <nav aria-label="Điều hướng chính" className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          <ul className="space-y-1">
            {visibleNodes.map((node) =>
              isNavGroup(node) ? (
                <Group key={node.label} group={node} collapsed={collapsed} open={!closedGroups.has(node.label)} onToggle={() => toggleGroup(node.label)} onClose={onClose} />
              ) : (
                <li key={node.label}>
                  <Leaf item={node} collapsed={collapsed} onClose={onClose} variant="top" />
                </li>
              ),
            )}
          </ul>
        </nav>

        <div ref={accountRef} className="relative p-3">
          {accountOpen && (
            <div className="absolute inset-x-3 bottom-full mb-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-[var(--shadow-3)]">
              <button type="button" onClick={() => signOut(auth)} className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-danger-700 transition hover:bg-danger-50">
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}
          <button
            type="button"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((value) => !value)}
            title={collapsed ? userDoc?.displayName ?? "Tài khoản" : undefined}
            className="flex w-full items-center gap-2.5 rounded-lg bg-neutral-100 p-2 text-left transition hover:bg-neutral-200/70"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(35,72,214,.18)]">
              {userDoc?.displayName?.trim().charAt(0).toUpperCase() || "E"}
            </span>
            <span className={`min-w-0 flex-1 transition-opacity ${collapsed ? "lg:pointer-events-none lg:opacity-0" : "opacity-100"}`}>
              <span className="block truncate text-[13px] font-semibold text-neutral-900">{userDoc?.displayName ?? "Tài khoản"}</span>
              <span className="block truncate text-[11px] text-neutral-500">{userDoc ? ROLE_LABELS[userDoc.role] : ""}</span>
            </span>
            {accountOpen ? <ChevronUp size={15} className={`shrink-0 text-neutral-400 ${collapsed ? "lg:hidden" : ""}`} /> : <MoreHorizontal size={16} className={`shrink-0 text-neutral-400 ${collapsed ? "lg:hidden" : ""}`} />}
          </button>
        </div>
      </aside>
    </>
  );
}
