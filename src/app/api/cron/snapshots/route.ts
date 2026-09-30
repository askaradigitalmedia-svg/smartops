import { NextResponse } from "next/server";
import { runSnapshotAnalysis } from "@/lib/snapshot";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

type DueSchedule = {
  id: string;
  camera_id: string;
  snapshot_time: string;
  task: string;
  note: string | null;
  cameras: { device_serial: string; name: string } | null;
};

function jakartaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}:00`,
  };
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = jakartaNow();
  const { data, error } = await supabase
    .from("camera_schedules")
    .select("id,camera_id,snapshot_time,task,note,cameras(device_serial,name)")
    .eq("enabled", true)
    .eq("snapshot_time", now.time)
    .or(`last_run_date.is.null,last_run_date.neq.${now.date}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const schedules = (data || []) as unknown as DueSchedule[];
  const results = [];
  for (const schedule of schedules) {
    if (!schedule.cameras?.device_serial) continue;

    const { data: claimed } = await supabase
      .from("camera_schedules")
      .update({ last_run_date: now.date })
      .eq("id", schedule.id)
      .or(`last_run_date.is.null,last_run_date.neq.${now.date}`)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const result = await runSnapshotAnalysis({
        cameraId: schedule.camera_id,
        deviceSerial: schedule.cameras.device_serial,
        period: `terjadwal-${now.time.slice(0, 5)}`,
        task: schedule.task,
        note: schedule.note || "",
      });
      results.push({ scheduleId: schedule.id, success: true, snapshotId: result.snapshotId });
    } catch (snapshotError: unknown) {
      results.push({
        scheduleId: schedule.id,
        success: false,
        error: snapshotError instanceof Error ? snapshotError.message : "Snapshot gagal.",
      });
    }
  }

  return NextResponse.json({ success: true, checkedAt: now, processed: results.length, results });
}

