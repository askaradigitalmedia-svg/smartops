"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trash2, Video, Camera, Clock, X, Settings2 } from "lucide-react";
import dynamic from "next/dynamic";

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
  const [filterCam, setFilterCam] = useState("all");

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
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert("Snapshot berhasil diambil & dianalisa AI!");
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

  const filteredSnapshots = filterCam === "all" ? snapshots : snapshots.filter(s => s.camera_id === filterCam);

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard CCTV & Analitik</h2>
        <p className="text-slate-500 text-sm mt-1">Pantau Live View, kelola riwayat, dan jadwalkan analisa AI.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI: Daftar Kamera Aktif */}
        <div className="space-y-6 col-span-1">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4">Tambah Kamera Baru</h3>
            <form onSubmit={handleAddCamera} className="space-y-3">
              <input type="text" required className="border p-2 rounded-lg w-full text-sm outline-none focus:border-blue-500"
                value={newCam.name} onChange={e => setNewCam({...newCam, name: e.target.value})} placeholder="Nama (Cth: Gudang)" />
              <input type="text" required className="border p-2 rounded-lg w-full text-sm outline-none focus:border-blue-500"
                value={newCam.device_serial} onChange={e => setNewCam({...newCam, device_serial: e.target.value})} placeholder="Serial Number" />
              <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">Simpan Kamera</button>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700">Manajemen Kamera Aktif</h3>
            {cameras.map(cam => {
              const currentTask = tasks[cam.id] || "hitung";
              const currentNote = notes[cam.id] || "";
              const isLoadingLive = loadingLiveCameraId === cam.id;

              return (
                <div key={cam.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{cam.name}</h4>
                      <p className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-block mt-1">SN: {cam.device_serial}</p>
                    </div>
                  </div>

                  {/* Pengaturan AI */}
                  <div className="mb-4 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
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
                    
                    {/* UI Penjadwalan (Visual Layout) */}
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <div className="flex justify-between items-center text-xs">
                         <span className="flex items-center gap-1 font-medium text-slate-600"><Clock size={12}/> Jadwal Otomatis:</span>
                         <span className="text-blue-600 font-semibold cursor-pointer hover:underline">08:00 & 17:00</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleLiveView(cam)}
                      disabled={isLoadingLive}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <Video size={16} /> {isLoadingLive ? "Loading..." : "Live"}
                    </button>
                    <button 
                      onClick={() => handleTriggerSnapshot(cam.id, cam.device_serial, currentTask, currentNote)}
                      disabled={isCapturing}
                      className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

        {/* KOLOM KANAN: Galeri Riwayat */}
        <div className="col-span-1 xl:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="font-semibold text-slate-700">Jurnal Analitik AI</h3>
            <select 
              className="border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-700 font-medium"
              value={filterCam} onChange={(e) => setFilterCam(e.target.value)}
            >
              <option value="all">Tampilkan Semua Kamera</option>
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="animate-pulse flex gap-4">
               <div className="h-48 bg-slate-200 rounded-xl w-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSnapshots.map(snap => (
                <div key={snap.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="relative group">
                    <img src={snap.image_url} alt="CCTV" className="w-full h-52 object-cover bg-slate-100" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3">
                      <button 
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="bg-white/90 text-red-500 hover:text-red-700 p-2 rounded-lg shadow-sm backdrop-blur-sm"
                        title="Hapus Jurnal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-3">
                      <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md">
                        {snap.cameras?.name || "Kamera Dihapus"}
                      </span>
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Clock size={12}/> {new Date(snap.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-slate-700 flex-1">
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-600 border-l-2 border-slate-200 pl-3">{snap.ai_journal}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredSnapshots.length === 0 && (
                <p className="text-sm text-slate-500 col-span-full bg-white p-6 text-center rounded-xl border border-dashed border-slate-300">
                  Belum ada riwayat snapshot untuk filter ini.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* POP-UP (MODAL) LIVE VIEW EKSKLUSIF */}
      {liveData.isOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-slate-700">
            <div className="p-4 flex justify-between items-center bg-slate-900/50 absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                <h3 className="font-bold text-white tracking-wide">{liveData.camName}</h3>
              </div>
              <button onClick={() => setLiveData({ isOpen: false, url: "", camName: "", cameraId: "" })} className="text-slate-300 hover:text-white bg-slate-800/50 p-2 rounded-full backdrop-blur-sm transition-colors">
                <X size={18} />
              </button>
            </div>
            
            {/* Player HLS */}
            <div className="w-full aspect-video bg-black relative flex items-center justify-center">
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
