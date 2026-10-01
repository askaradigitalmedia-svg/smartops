"use client";

import { useEffect, useState, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <Sidebar className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:flex" />

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigasi utama">
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          />
          <Sidebar
            mobile
            onClose={() => setIsMenuOpen(false)}
            className="relative z-10 flex h-dvh w-[min(20rem,calc(100vw-3rem))] shadow-2xl"
          />
        </div>
      ) : null}

      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-72">
        <Navbar onMenuClick={() => setIsMenuOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 xl:px-8 xl:py-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
