"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Video, Camera, X, Settings2 } from "lucide-react";
import dynamic from "next/dynamic";
import { CameraScheduleEditor } from "@/components/CameraScheduleEditor";
import { NotificationSettingsPanel } from "@/components/NotificationSettingsPanel";
import { SnapshotJournal } from "@/components/SnapshotJournal";

// Mengimpor ReactPlayer secara dinamis agar aman dijalankan di Next.js (SSR = false)
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type CameraRecord = {
  id: string;
  name: string;
  device_serial: string;
  location?: string | null;
};

type SnapshotRecord = {
  id: string;
  camera_id: string;
  image_url: string;
  created_at: string;
  ai_journal: string;
  snapshot_period?: string | null;
  cameras: { name: string } | null;
};

type LiveApiResponse = {
  url?: string;
  error?: string;
  action?: string;
  code?: string;
};

type LiveError = {
  cameraId: string;
  message: string;
  action?: string;
  code?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
}

async function loadDashboardData() {
  const [cameraResult, snapshotResult] = await Promise.all([
    supabase.from("cameras").select("*"),
    supabase
      .from("snapshots")
      .select("*, cameras(name)")
      .order("created_at", { ascending: false }),
  ]);

  return {
    cameras: (cameraResult.data || []) as CameraRecord[],
    snapshots: (snapshotResult.data || []) as SnapshotRecord[],
  };
}

export default function CCTVPage() {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State interaksi
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingLiveCameraId, setLoadingLiveCameraId] = useState<string | null>(null);
  const [newCam, setNewCam] = useState({ name: "", device_serial: "", location: "Kantor" });
  
  // State untuk instruksi & jadwal dinamis
  const [tasks, setTasks] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  // State untuk Pop-up Live View
  const [liveData, setLiveData] = useState({
    isOpen: false,
    url: "",
    camName: "",
    cameraId: "",
  });
  const [liveError, setLiveError] = useState<LiveError | null>(null);

  const fetchData = useCallback(async () => {
    const data = await loadDashboardData();
    setCameras(data.cameras);
    setSnapshots(data.snapshots);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadDashboardData().then((data) => {
      if (cancelled) return;
      setCameras(data.cameras);
      setSnapshots(data.snapshots);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("cameras").insert([newCam]);
    if (!error) {
      setNewCam({ name: "", device_serial: "", location: "Kantor" });
      fetchData();
    } else {
      alert("Gagal menambah kamera!");
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if(!confirm("Yakin ingin menghapus riwayat analisa ini?")) return;
    const { error } = await supabase.from("snapshots").delete().eq("id", id);
    if (!error) fetchData();
  };

  const handleTriggerSnapshot = async (cameraId: string, deviceSerial: string, task: string, note: string) => {
    setIsCapturing(true);
    try {
      const res = await fetch("/api/camera/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId, deviceSerial, period: "manual", task, note }), 
      });
      const data = (await res.json()) as {
        error?: string;
        notifications?: Array<{ channel: string; sent: boolean }>;
      };
      if (data.error) throw new Error(data.error);
      const sentChannels = data.notifications?.filter((item) => item.sent).map((item) => item.channel) || [];
      const failedChannels = data.notifications?.filter((item) => !item.sent).map((item) => item.channel) || [];
      alert(
        sentChannels.length > 0
          ? `Snapshot dan analisis berhasil. Notifikasi terkirim melalui ${sentChannels.join(" & ")}.${failedChannels.length > 0 ? ` Gagal: ${failedChannels.join(" & ")}.` : ""}`
          : "Snapshot berhasil diambil dan dianalisis AI.",
      );
      fetchData();
    } catch (error: unknown) {
      alert("Error: " + getErrorMessage(error));
    } finally {
      setIsCapturing(false);
    }
  };

  // Fungsi untuk memanggil API Live View
  const handleLiveView = async (cam: CameraRecord) => {
    setLoadingLiveCameraId(cam.id);
    setLiveError(null);
    try {
      const res = await fetch("/api/camera/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceSerial: cam.device_serial })
      });
      const data = (await res.json()) as LiveApiResponse;

      if (!res.ok || data.error || !data.url) {
        setLiveError({
          cameraId: cam.id,
          message: data.error || "Live View tidak dapat dimuat.",
          action: data.action,
          code: data.code,
        });
        return;
      }
      
      // Buka Modal dan mainkan URL stream-nya
      setLiveData({ isOpen: true, url: data.url, camName: cam.name, cameraId: cam.id });
    } catch (error: unknown) {
      setLiveError({
        cameraId: cam.id,
        message: "Aplikasi gagal terhubung ke server Live View.",
        action: getErrorMessage(error),
      });
    } finally {
      setLoadingLiveCameraId(null);
    }
  };

  return (
    <div className="relative space-y-6 sm:space-y-8">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-5 py-5 sm:px-7 sm:py-6">
        <span className="inline-flex rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
          Monitoring Center
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">CCTV & Analitik AI</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Pantau Live View, kelola riwayat, dan jadwalkan analisa AI dari satu dashboard.</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(20rem,23rem)_minmax(0,1fr)] xl:items-start">
        
        {/* KOLOM KIRI: Daftar Kamera Aktif */}
        <div className="min-w-0 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-1 font-semibold text-slate-800">Tambah Kamera Baru</h3>
            <p className="mb-4 text-xs leading-5 text-slate-500">Daftarkan kamera menggunakan serial number EZVIZ.</p>
            <form onSubmit={handleAddCamera} className="space-y-3">
              <input type="text" required className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                value={newCam.name} onChange={e => setNewCam({...newCam, name: e.target.value})} placeholder="Nama (Cth: Gudang)" />
              <input type="text" required className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                value={newCam.device_serial} onChange={e => setNewCam({...newCam, device_serial: e.target.value})} placeholder="Serial Number" />
              <button type="submit" className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">Simpan Kamera</button>
            </form>
          </div>

          <NotificationSettingsPanel />

          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-800">Kamera Aktif</h3>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600">{cameras.length} kamera</span>
            </div>
            {cameras.map(cam => {
              const currentTask = tasks[cam.id] || "hitung";
              const currentNote = notes[cam.id] || "";
              const isLoadingLive = loadingLiveCameraId === cam.id;

              return (
                <div key={cam.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-bold text-slate-800 sm:text-lg">{cam.name}</h4>
                      <p className="mt-1 inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">SN: {cam.device_serial}</p>
                    </div>
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-50" title="Kamera terdaftar" />
                  </div>

                  {/* Pengaturan AI */}
                  <div className="mb-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings2 size={14} className="text-blue-600" />
                      <span className="text-xs font-bold text-slate-700">Instruksi AI</span>
                    </div>
                    <select 
                      className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-700"
                      value={currentTask} onChange={(e) => setTasks({ ...tasks, [cam.id]: e.target.value })}
                    >
                      <option value="hitung">Hitung Pekerja</option>
                      <option value="progress">Analisa Progress</option>
                      <option value="keamanan">Cek Keamanan & Ketertiban</option>
                    </select>

                    {currentTask === "progress" && (
                      <textarea 
                        rows={2} className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white resize-none text-slate-700"
                        placeholder="Catatan panduan AI..." value={currentNote} onChange={(e) => setNotes({ ...notes, [cam.id]: e.target.value })}
                      />
                    )}
                    
                    <CameraScheduleEditor cameraId={cam.id} task={currentTask} note={currentNote} />
                  </div>

                  {/* Tombol Aksi */}
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                    <button 
                      onClick={() => handleLiveView(cam)}
                      disabled={isLoadingLive}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 min-[420px]:col-span-1"
                    >
                      <Video size={16} /> {isLoadingLive ? "Loading..." : "Live"}
                    </button>
                    <button 
                      onClick={() => handleTriggerSnapshot(cam.id, cam.device_serial, currentTask, currentNote)}
                      disabled={isCapturing}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 min-[420px]:col-span-2"
                    >
                      <Camera size={16} /> {isCapturing ? "Proses..." : "Snapshot AI"}
                    </button>
                  </div>

                  {liveError?.cameraId === cam.id && (
                    <div
                      role="alert"
                      className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
                    >
                      <p className="font-semibold">Live View belum dapat dibuka</p>
                      <p className="mt-1">{liveError.message}</p>
                      {liveError.action && <p className="mt-1 text-amber-800">{liveError.action}</p>}
                      {liveError.code && (
                        <p className="mt-2 font-mono text-[11px] text-amber-700">
                          Kode EZVIZ: {liveError.code}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <SnapshotJournal cameras={cameras} snapshots={snapshots} loading={loading} onDelete={handleDeleteSnapshot} />
      </div>

      {/* POP-UP (MODAL) LIVE VIEW EKSKLUSIF */}
      {liveData.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-2 backdrop-blur-sm sm:p-6">
          <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-black shadow-2xl sm:rounded-2xl">
            <div className="absolute left-0 top-0 z-10 flex w-full items-center justify-between bg-gradient-to-b from-black/90 to-transparent p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                <h3 className="font-bold text-white tracking-wide">{liveData.camName}</h3>
              </div>
              <button onClick={() => setLiveData({ isOpen: false, url: "", camName: "", cameraId: "" })} className="text-slate-300 hover:text-white bg-slate-800/50 p-2 rounded-full backdrop-blur-sm transition-colors">
                <X size={18} />
              </button>
            </div>
            
            {/* Player HLS */}
            <div className="relative flex aspect-video w-full items-center justify-center bg-black">
              <ReactPlayer 
                src={liveData.url}
                playing={true}
                controls={true}
                muted={true}
                playsInline={true}
                width="100%"
                height="100%"
                style={{ width: "100%", height: "100%" }}
                onError={() => {
                  setLiveError({
                    cameraId: liveData.cameraId,
                    message: "Alamat stream diterima, tetapi browser gagal memutar video.",
                    action: "Tutup Live View, tunggu beberapa detik, lalu coba kembali.",
                  });
                  setLiveData({ isOpen: false, url: "", camName: "", cameraId: "" });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
