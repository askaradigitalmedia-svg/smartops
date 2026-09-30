"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trash2, Video, Camera } from "lucide-react"; // Menggunakan icon modern

export default function CCTVPage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [newCam, setNewCam] = useState({ name: "", device_serial: "", location: "Kantor" });
  const [tasks, setTasks] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  
  // State untuk filter riwayat per CCTV
  const [filterCam, setFilterCam] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: camData } = await supabase.from("cameras").select("*");
    if (camData) setCameras(camData);

    const { data: snapData } = await supabase
      .from("snapshots")
      .select("*, cameras(name)")
      .order("created_at", { ascending: false });
    if (snapData) setSnapshots(snapData);

    setLoading(false);
  };

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

  // Fitur Hapus Riwayat (CRUD)
  const handleDeleteSnapshot = async (id: string) => {
    if(!confirm("Yakin ingin menghapus riwayat analisa ini?")) return;
    const { error } = await supabase.from("snapshots").delete().eq("id", id);
    if (!error) {
      fetchData();
    } else {
      alert("Gagal menghapus data!");
    }
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
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleLiveView = (serial: string) => {
    // Placeholder untuk fitur live view di tahap selanjutnya
    alert(`Membuka Live View untuk SN: ${serial}... (Fitur sedang disiapkan di tahap selanjutnya)`);
  };

  // Menyaring data riwayat berdasarkan filter
  const filteredSnapshots = filterCam === "all" 
    ? snapshots 
    : snapshots.filter(s => s.camera_id === filterCam);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard CCTV & Analitik</h2>
        <p className="text-slate-500 text-sm mt-1">Pantau lokasi, kelola riwayat, dan analisa menggunakan AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form & Daftar Kamera */}
        <div className="space-y-6 col-span-1">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4">Tambah Kamera Ezviz</h3>
            <form onSubmit={handleAddCamera} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Kamera</label>
                <input type="text" required className="border p-2 rounded-lg w-full text-sm outline-none focus:border-blue-500"
                  value={newCam.name} onChange={e => setNewCam({...newCam, name: e.target.value})} placeholder="Cth: Area Produksi" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Device Serial</label>
                <input type="text" required className="border p-2 rounded-lg w-full text-sm outline-none focus:border-blue-500"
                  value={newCam.device_serial} onChange={e => setNewCam({...newCam, device_serial: e.target.value})} placeholder="Cth: D12345678" />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                Simpan Kamera
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700">Daftar Kamera Aktif</h3>
            {cameras.map(cam => {
              const currentTask = tasks[cam.id] || "hitung";
              const currentNote = notes[cam.id] || "";

              return (
                <div key={cam.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="mb-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-800">{cam.name}</h4>
                      <p className="text-xs text-slate-500">SN: {cam.device_serial}</p>
                    </div>
                  </div>

                  <div className="mb-4 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Fokus Analisa AI:</label>
                      <select 
                        className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-700"
                        value={currentTask}
                        onChange={(e) => setTasks({ ...tasks, [cam.id]: e.target.value })}
                      >
                        <option value="hitung">Hitung Pekerja</option>
                        <option value="progress">Analisa Progress</option>
                        <option value="keamanan">Cek Keamanan & Ketertiban</option>
                      </select>
                    </div>

                    {currentTask === "progress" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Admin (Panduan AI):</label>
                        <textarea 
                          rows={2}
                          className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white resize-none text-slate-700"
                          placeholder="Cth: Pagar selesai dibuat progress 50%..."
                          value={currentNote}
                          onChange={(e) => setNotes({ ...notes, [cam.id]: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleLiveView(cam.device_serial)}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                    >
                      <Video size={16} /> Live
                    </button>
                    <button 
                      onClick={() => handleTriggerSnapshot(cam.id, cam.device_serial, currentTask, currentNote)}
                      disabled={isCapturing}
                      className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Camera size={16} /> {isCapturing ? "Proses..." : "Analisa AI"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Galeri Analitik AI */}
        <div className="col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700">Riwayat Analitik (Jurnal AI)</h3>
            <select 
              className="border p-1.5 rounded-lg text-sm outline-none focus:border-blue-500 bg-white text-slate-700"
              value={filterCam}
              onChange={(e) => setFilterCam(e.target.value)}
            >
              <option value="all">Semua Kamera</option>
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Memuat riwayat...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredSnapshots.map(snap => (
                <div key={snap.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <img src={snap.image_url} alt="CCTV" className="w-full h-48 object-cover bg-slate-100" />
                  <div className="p-4 flex-1 flex flex-col relative">
                    <button 
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 bg-white/80 rounded-full p-1.5 transition-colors"
                      title="Hapus riwayat ini"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="mb-3 pr-8">
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                        {snap.cameras?.name || "Kamera Dihapus"}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1.5">
                        {new Date(snap.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    
                    <div className="mt-1 text-sm text-slate-700 flex-1">
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-600">{snap.ai_journal}</p>
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
    </div>
  );
}