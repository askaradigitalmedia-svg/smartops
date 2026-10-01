import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { runSnapshotAnalysis } from "@/lib/snapshot";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type DueSchedule = {
  id: string;
  camera_id: string;
  snapshot_time: string;
  task: string;
  note: string | null;
  cameras: { device_serial: string; name: string } | null;
};

type ScheduleResult = {
  scheduleId: string;
  scheduledTime: string;
  success: boolean;
  snapshotId?: string;
  error?: string;
  willRetry?: boolean;
};

function jakartaNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}:00`,
  };
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getCronSecret() {
  const cloudflareEnv = getOptionalRequestContext()?.env as { CRON_SECRET?: string } | undefined;
  return cloudflareEnv?.CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
}

export async function GET() {
  return noStoreJson({
    service: "smartops-snapshot-scheduler",
    configured: Boolean(getCronSecret()),
    checkedAt: jakartaNow(),
  });
}

export async function POST(request: Request) {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return noStoreJson({ error: "CRON_SECRET belum dikonfigurasi pada aplikasi." }, 503);
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return noStoreJson({ error: "CRON_SECRET Worker tidak cocok dengan aplikasi." }, 401);
  }

  const now = jakartaNow();
  const { data, error } = await supabase
    .from("camera_schedules")
    .select("id,camera_id,snapshot_time,task,note,cameras(device_serial,name)")
    .eq("enabled", true)
    .lte("snapshot_time", now.time)
    .or(`last_run_date.is.null,last_run_date.neq.${now.date}`)
    .order("snapshot_time")
    .limit(50);

  if (error) return noStoreJson({ error: error.message }, 500);

  const schedules = (data || []) as unknown as DueSchedule[];
  const results: ScheduleResult[] = [];

  for (const schedule of schedules) {
    const { data: claimed, error: claimError } = await supabase
      .from("camera_schedules")
      .update({ last_run_date: now.date })
      .eq("id", schedule.id)
      .or(`last_run_date.is.null,last_run_date.neq.${now.date}`)
      .select("id")
      .maybeSingle();

    if (claimError) {
      results.push({
        scheduleId: schedule.id,
        scheduledTime: schedule.snapshot_time,
        success: false,
        error: `Gagal mengunci jadwal: ${claimError.message}`,
        willRetry: true,
      });
      continue;
    }
    if (!claimed) continue;

    try {
      if (!schedule.cameras?.device_serial) throw new Error("Kamera atau serial number tidak ditemukan.");

      const result = await runSnapshotAnalysis({
        cameraId: schedule.camera_id,
        deviceSerial: schedule.cameras.device_serial,
        period: `terjadwal-${schedule.snapshot_time.slice(0, 5)}`,
        task: schedule.task,
        note: schedule.note || "",
      });
      results.push({
        scheduleId: schedule.id,
        scheduledTime: schedule.snapshot_time,
        success: true,
        snapshotId: result.snapshotId,
      });
    } catch (snapshotError: unknown) {
      const { error: releaseError } = await supabase
        .from("camera_schedules")
        .update({ last_run_date: null })
        .eq("id", schedule.id)
        .eq("last_run_date", now.date);

      results.push({
        scheduleId: schedule.id,
        scheduledTime: schedule.snapshot_time,
        success: false,
        error: snapshotError instanceof Error ? snapshotError.message : "Snapshot gagal.",
        willRetry: !releaseError,
      });
    }
  }

  return noStoreJson({
    success: results.every((result) => result.success),
    checkedAt: now,
    due: schedules.length,
    processed: results.length,
    succeeded: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  });
}
