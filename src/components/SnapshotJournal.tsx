"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CalendarDays, Clock, Filter, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { parseAnalysis, type AnalysisStatus, type AnalysisTask } from "@/lib/analysis";

export type JournalCamera = {
  id: string;
  name: string;
};

export type JournalSnapshot = {
  id: string;
  camera_id: string;
  image_url: string;
  created_at: string;
  ai_journal: string;
  snapshot_period?: string | null;
  cameras: { name: string } | null;
};

type SortMode = "newest" | "oldest" | "priority";
type FilterTask = "all" | AnalysisTask;
type FilterStatus = "all" | AnalysisStatus;

const taskLabels: Record<AnalysisTask, string> = {
  hitung: "Hitung pekerja",
  progress: "Analisa progres",
  keamanan: "Keamanan & ketertiban",
  umum: "Analisis umum",
};

const statusLabels: Record<AnalysisStatus, string> = {
  bahaya: "Potensi bahaya",
  perhatian: "Perlu perhatian",
  aman: "Aman",
  informasi: "Informasi",
};

const priorityRank: Record<AnalysisStatus, number> = {
  bahaya: 0,
  perhatian: 1,
  aman: 2,
  informasi: 3,
};

function getJakartaDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00+07:00`);
  const label = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return dateKey === getJakartaDateKey(new Date()) ? `Hari ini · ${label}` : label;
}

function formatSnapshotTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function inferTask(snapshot: JournalSnapshot): AnalysisTask {
  const analysis = parseAnalysis(snapshot.ai_journal);
  if (analysis.task) return analysis.task;

  const text = `${analysis.title} ${analysis.summary} ${analysis.findings.join(" ")}`.toLowerCase();
  if (/keamanan|ketertiban|bahaya|mencurigakan|risiko/.test(text)) return "keamanan";
  if (/progres|progress|pekerjaan|pembangunan|penyelesaian/.test(text)) return "progress";
  if (/jumlah|pekerja|orang|aktivitas/.test(text)) return "hitung";
  return "umum";
}

function snapshotSource(period?: string | null) {
  return period?.startsWith("terjadwal-") ? "Terjadwal" : "Manual";
}

export function SnapshotJournal({
  cameras,
  snapshots,
  loading,
  onDelete,
}: {
  cameras: JournalCamera[];
  snapshots: JournalSnapshot[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  const [cameraFilter, setCameraFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState<FilterTask>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const enrichedSnapshots = useMemo(
    () => snapshots.map((snapshot) => {
      const analysis = parseAnalysis(snapshot.ai_journal);
      return {
        ...snapshot,
        dateKey: getJakartaDateKey(snapshot.created_at),
        timestamp: new Date(snapshot.created_at).getTime(),
        task: analysis.task || inferTask(snapshot),
        status: analysis.status,
      };
    }),
    [snapshots],
  );

  const availableDates = useMemo(() => {
    const dates = new Set(
      enrichedSnapshots
        .filter((snapshot) => cameraFilter === "all" || snapshot.camera_id === cameraFilter)
        .map((snapshot) => snapshot.dateKey),
    );
    return Array.from(dates).sort((left, right) => right.localeCompare(left));
  }, [cameraFilter, enrichedSnapshots]);

  const groupedSnapshots = useMemo(() => {
    const filtered = enrichedSnapshots.filter((snapshot) => (
      (cameraFilter === "all" || snapshot.camera_id === cameraFilter)
      && (dateFilter === "all" || snapshot.dateKey === dateFilter)
      && (taskFilter === "all" || snapshot.task === taskFilter)
      && (statusFilter === "all" || snapshot.status === statusFilter)
    ));

    filtered.sort((left, right) => {
      if (sortMode === "priority") {
        return priorityRank[left.status] - priorityRank[right.status] || right.timestamp - left.timestamp;
      }
      return sortMode === "oldest" ? left.timestamp - right.timestamp : right.timestamp - left.timestamp;
    });

    const groups = new Map<string, typeof filtered>();
    for (const snapshot of filtered) {
      const group = groups.get(snapshot.dateKey);
      if (group) group.push(snapshot);
      else groups.set(snapshot.dateKey, [snapshot]);
    }

    const dateKeys = Array.from(groups.keys()).sort((left, right) => (
      sortMode === "oldest" ? left.localeCompare(right) : right.localeCompare(left)
    ));
    return dateKeys.map((dateKey) => ({ dateKey, snapshots: groups.get(dateKey) || [] }));
  }, [cameraFilter, dateFilter, enrichedSnapshots, sortMode, statusFilter, taskFilter]);

  const shownCount = groupedSnapshots.reduce((total, group) => total + group.snapshots.length, 0);
  const hasActiveFilters = cameraFilter !== "all" || dateFilter !== "all" || taskFilter !== "all" || statusFilter !== "all" || sortMode !== "newest";

  const resetFilters = () => {
    setCameraFilter("all");
    setDateFilter("all");
    setTaskFilter("all");
    setStatusFilter("all");
    setSortMode("newest");
  };

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Jurnal Analitik AI</h3>
          <p className="mt-0.5 text-xs text-slate-500">Riwayat dikelompokkan per tanggal dengan filter analisis yang lebih rinci.</p>
        </div>
        {!loading ? (
          <span className="text-xs font-medium text-slate-500">Menampilkan {shownCount} dari {snapshots.length} snapshot</span>
        ) : null}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <SlidersHorizontal size={16} className="text-blue-600" /> Filter jurnal
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <label className="min-w-0">
            <span className="sr-only">Filter kamera</span>
            <select
              value={cameraFilter}
              onChange={(event) => {
                setCameraFilter(event.target.value);
                setDateFilter("all");
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="all">Semua kamera</option>
              {cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.name}</option>)}
            </select>
          </label>

          <label className="min-w-0">
            <span className="sr-only">Filter tanggal</span>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
              <option value="all">Semua tanggal</option>
              {availableDates.map((date) => <option key={date} value={date}>{formatDateHeading(date)}</option>)}
            </select>
          </label>

          <label className="min-w-0">
            <span className="sr-only">Filter instruksi AI</span>
            <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value as FilterTask)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
              <option value="all">Semua instruksi AI</option>
              {Object.entries(taskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="min-w-0">
            <span className="sr-only">Filter status analisis</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FilterStatus)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
              <option value="all">Semua status</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="min-w-0">
            <span className="sr-only">Urutkan jurnal</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
              <option value="newest">Terbaru dahulu</option>
              <option value="oldest">Terlama dahulu</option>
              <option value="priority">Prioritas bahaya</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : groupedSnapshots.length > 0 ? (
        <div className="space-y-7">
          {groupedSnapshots.map((group) => (
            <section key={group.dateKey} aria-labelledby={`journal-date-${group.dateKey}`}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={17} />
                </span>
                <div className="min-w-0">
                  <h4 id={`journal-date-${group.dateKey}`} className="capitalize text-sm font-bold text-slate-800 sm:text-base">{formatDateHeading(group.dateKey)}</h4>
                  <p className="text-[11px] text-slate-500">{group.snapshots.length} hasil analisis</p>
                </div>
                <div className="h-px min-w-4 flex-1 bg-slate-200" />
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {group.snapshots.map((snapshot) => (
                  <article key={snapshot.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="group relative">
                      <Image
                        src={snapshot.image_url}
                        alt={`Snapshot CCTV ${snapshot.cameras?.name || "kamera"}`}
                        width={640}
                        height={360}
                        sizes="(max-width: 640px) 100vw, (max-width: 1536px) 50vw, 33vw"
                        unoptimized
                        className="aspect-video h-auto w-full bg-slate-100 object-cover"
                      />
                      <div className="absolute inset-0 flex items-start justify-end bg-gradient-to-b from-black/40 via-transparent to-transparent p-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onDelete(snapshot.id)}
                          className="rounded-lg bg-white/95 p-2 text-red-500 shadow-sm backdrop-blur-sm hover:text-red-700"
                          aria-label={`Hapus jurnal ${snapshot.cameras?.name || "kamera"} pukul ${formatSnapshotTime(snapshot.created_at)}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {snapshot.cameras?.name || "Kamera dihapus"}
                        </span>
                        <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
                          {taskLabels[snapshot.task]}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                          {snapshotSource(snapshot.snapshot_period)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={12} /> {formatSnapshotTime(snapshot.created_at)} WIB
                      </div>
                      <div className="mt-3 flex-1 border-t border-slate-100 pt-3">
                        <AnalysisResultView value={snapshot.ai_journal} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <Filter size={22} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Tidak ada jurnal yang sesuai</p>
          <p className="mt-1 text-xs text-slate-500">Coba ubah filter tanggal, instruksi AI, atau status analisis.</p>
          {hasActiveFilters ? (
            <button type="button" onClick={resetFilters} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">Reset filter</button>
          ) : null}
        </div>
      )}
    </section>
  );
}
