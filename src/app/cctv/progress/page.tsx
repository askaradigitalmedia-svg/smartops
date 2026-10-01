"use client";

import Image from "next/image";
import { ArrowLeftRight, CalendarDays } from "lucide-react";
import { useState } from "react";

export default function ProgressProyekPage() {
  const [position, setPosition] = useState(50);
  const imagePagi = "https://picsum.photos/id/1018/800/600";
  const imageSore = "https://picsum.photos/id/1015/800/600";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8">
        <div className="mb-4 inline-flex rounded-xl bg-white/10 p-2.5 text-blue-200 ring-1 ring-white/10">
          <ArrowLeftRight size={20} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Progres Proyek Harian</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Geser pembanding untuk melihat perubahan kondisi kamera dari pagi hingga sore.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 lg:p-6">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 sm:aspect-video">
          <Image
            src={imageSore}
            alt="Kondisi proyek pada sore hari"
            fill
            sizes="(max-width: 1024px) 100vw, 80vw"
            className="object-cover"
            unoptimized
          />
          <Image
            src={imagePagi}
            alt="Kondisi proyek pada pagi hari"
            fill
            sizes="(max-width: 1024px) 100vw, 80vw"
            className="object-cover"
            style={{ clipPath: `polygon(0% 0%, ${position}% 0%, ${position}% 100%, 0% 100%)` }}
            unoptimized
          />

          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)]"
            style={{ left: `calc(${position}% - 1px)` }}
          >
            <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-xl">
              <ArrowLeftRight size={16} />
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            aria-label="Posisi pembanding foto pagi dan sore"
            className="absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold sm:text-sm">
          <span className="inline-flex items-center gap-1.5 text-blue-700">
            <CalendarDays size={14} /> Pagi
          </span>
          <span className="inline-flex items-center justify-end gap-1.5 text-emerald-700">
            Sore <CalendarDays size={14} />
          </span>
        </div>
      </section>
    </div>
  );
}
