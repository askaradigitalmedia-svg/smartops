"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CCTVPage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  // State untuk form tambah kamera
  const [newCam, setNewCam] = useState({ name: "", device_serial: "", location: "Kantor" });

  // State untuk menyimpan pilihan task dan note dari masing-masing kamera
  const [tasks, setTasks] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

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

  // Fungsi memanggil API yang sudah di-update dengan task & note
  const handleTriggerSnapshot = async (cameraId: string, deviceSerial: string, task: string, note: string) => {
    setIsCapturing(true);
    try {
      const res = await fetch("/api/camera/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cameraId, 
          deviceSerial, 
          period: "pagi",
          task,
          note
        }), 
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard CCTV & Analitik</h2>
        <p className="text-slate-500 text-sm mt-1">Pilih instruksi AI, pantau lokasi, dan lihat hasil analisanya.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form & Daftar Kamera */}
        <div className="space-y-6 col-span-1">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-3">Tambah Kamera Ezviz</h3>
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
              <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800">
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
                  <div className="mb-4">
                    <h4 className="font-semibold text-slate-800">{cam.name}</h4>
                    <p className="text-xs text-slate-500">SN: {cam.device_serial}</p>
                  </div>

                  {/* Kontrol Instruksi AI Dinamis */}
                  <div className="mb-4 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Fokus Analisa AI:</label>
                      <select 
                        className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white"
                        value={currentTask}
                        onChange={(e) => setTasks({ ...tasks, [cam.id]: e.target.value })}
                      >
                        <option value="hitung">👥 Hitung Pekerja</option>
                        <option value="progress">🏗️ Analisa Progress</option>
                        <option value="keamanan">🚨 Cek Keamanan & Ketertiban</option>
                      </select>
                    </div>

                    {/* Munculkan input catatan HANYA jika task = progress */}
                    {currentTask === "progress" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Admin (Panduan AI):</label>
                        <textarea 
                          rows={2}
                          className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white resize-none"
                          placeholder="Cth: Pagar selesai dibuat progress 50%..."
                          value={currentNote}
                          onChange={(e) => setNotes({ ...notes, [cam.id]: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleTriggerSnapshot(cam.id, cam.device_serial, currentTask, currentNote)}
                    disabled={isCapturing}
                    className="w-full bg-blue-100 text-blue-700 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-200 disabled:opacity-50 transition-colors"
                  >
                    {isCapturing ? "Menganalisa..." : "📸 Trigger Snapshot AI"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Galeri Analitik AI */}
        <div className="col-span-1 lg:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4">Riwayat Analitik (Jurnal AI)</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat data...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {snapshots.map(snap => (
                <div key={snap.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <img src={snap.image_url} alt="CCTV" className="w-full h-48 object-cover bg-slate-100" />
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                        {snap.cameras?.name || "Kamera Dihapus"}
                      </span>
                      <span className="text-xs text-slate-400 text-right">
                        {new Date(snap.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-700 flex-1">
                      <span className="font-semibold text-blue-600">Hasil Analisa:</span>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{snap.ai_journal}</p>
                    </div>
                  </div>
                </div>
              ))}
              {snapshots.length === 0 && <p className="text-sm text-slate-500">Belum ada riwayat snapshot.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}