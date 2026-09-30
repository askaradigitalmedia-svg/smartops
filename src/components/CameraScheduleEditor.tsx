"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Schedule = {
  id: string;
  snapshot_time: string;
  task: string;
};

type CameraScheduleEditorProps = {
  cameraId: string;
  task: string;
  note: string;
};

const taskLabel: Record<string, string> = {
  hitung: "Hitung pekerja",
  progress: "Analisa progres",
  keamanan: "Cek keamanan",
};

export function CameraScheduleEditor({ cameraId, task, note }: CameraScheduleEditorProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [time, setTime] = useState("08:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSchedules = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("camera_schedules")
      .select("id,snapshot_time,task")
      .eq("camera_id", cameraId)
      .eq("enabled", true)
      .order("snapshot_time");
    if (queryError) {
      setError("Tabel jadwal belum tersedia. Jalankan migration Supabase terlebih dahulu.");
      return;
    }
    setSchedules((data || []) as Schedule[]);
    setError("");
  }, [cameraId]);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("camera_schedules")
      .select("id,snapshot_time,task")
      .eq("camera_id", cameraId)
      .eq("enabled", true)
      .order("snapshot_time")
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError("Tabel jadwal belum tersedia. Jalankan migration Supabase terlebih dahulu.");
        } else {
          setSchedules((data || []) as Schedule[]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cameraId]);

  const addSchedule = async () => {
    if (!time) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("camera_schedules").upsert(
      {
        camera_id: cameraId,
        snapshot_time: `${time}:00`,
        task,
        note,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "camera_id,snapshot_time" },
    );
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await loadSchedules();
  };

  const deleteSchedule = async (id: string) => {
    const { error: deleteError } = await supabase.from("camera_schedules").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else await loadSchedules();
  };

  return (
    <div className="border-t border-slate-200 pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Clock3 size={13} /> Jadwal snapshot (WIB)
      </div>
      <div className="flex gap-2">
        <input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={addSchedule}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <Plus size={13} /> Tambah
        </button>
      </div>

      {schedules.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {schedules.map((schedule) => (
            <span key={schedule.id} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {schedule.snapshot_time.slice(0, 5)} · {taskLabel[schedule.task] || schedule.task}
              <button type="button" onClick={() => deleteSchedule(schedule.id)} className="text-blue-400 hover:text-red-600" aria-label={`Hapus jadwal ${schedule.snapshot_time.slice(0, 5)}`}>
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-[11px] leading-4 text-red-600">{error}</p>}
    </div>
  );
}

