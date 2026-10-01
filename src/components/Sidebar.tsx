"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Camera, Home, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/cctv", label: "CCTV & Analitik", icon: Camera },
  { href: "/inventory", label: "Keuangan & Stok", icon: Package },
];

type SidebarProps = {
  className?: string;
  mobile?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ className, mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex-col overflow-y-auto bg-slate-950 text-white", className)}>
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Link href="/" className="flex items-center gap-3" aria-label="SmartOps Dashboard">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 shadow-lg shadow-blue-950/30">
            <BarChart3 size={21} />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">SmartOps</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Control Center</span>
          </span>
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-4" aria-label="Menu utama">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Menu Utama</p>
        {navigation.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={19} className="shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold text-slate-200">Smart monitoring</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">Pantau kamera dan operasional dari satu workspace.</p>
      </div>
    </aside>
  );
}
