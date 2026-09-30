"use client";

import { useState } from "react";

export default function ProgressProyekPage() {
  // State untuk menyimpan posisi slider (0 - 100%)
  const [position, setPosition] = useState(50);

  // URL gambar contoh yang sudah diganti agar lebih stabil dan terlihat perbedaannya
  const imagePagi = "https://picsum.photos/id/1018/800/600"; // Gambar pemandangan gunung (Before)
  const imageSore = "https://picsum.photos/id/1015/800/600"; // Gambar pemandangan sungai (After)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Progress Proyek Harian</h2>
        <p className="text-slate-500 text-sm mt-1">Bandingkan kondisi jepretan kamera Pagi vs Sore hari secara interaktif.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
          
          {/* 1. Gambar After (Sore - Lapis Bawah) */}
          <img src={imageSore} alt="Sore" className="absolute inset-0 w-full h-full object-cover" />

          {/* 2. Gambar Before (Pagi - Lapis Atas dengan efek Clip-Path) */}
          <img
            src={imagePagi}
            alt="Pagi"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ clipPath: `polygon(0% 0%, ${position}% 0%, ${position}% 100%, 0% 100%)` }}
          />

          {/* 3. Garis Indikator & Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.3)]"
            style={{ left: `calc(${position}% - 2px)` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg pointer-events-none font-bold text-xs tracking-tighter">
              &lt;|&gt;
            </div>
          </div>

          {/* 4. Input Range Invisible (Yang menangkap geseran mouse/sentuhan) */}
          <input
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
          />
        </div>

        {/* Label Bawah */}
        <div className="flex justify-between mt-4 text-sm font-semibold text-slate-700 px-2">
          <span className="text-blue-600">⬅️ Pagi (Before)</span>
          <span className="text-emerald-600">Sore (After) ➡️</span>
        </div>
      </div>
    </div>
  );
}