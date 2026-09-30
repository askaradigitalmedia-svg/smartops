import { NextResponse } from "next/server";
import { runSnapshotAnalysis } from "@/lib/snapshot";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      deviceSerial?: string;
      cameraId?: string;
      period?: string;
      task?: string;
      note?: string;
    };
    if (!body.deviceSerial || !body.cameraId) {
      return NextResponse.json({ error: "Data kamera belum lengkap." }, { status: 400 });
    }

    const result = await runSnapshotAnalysis({
      deviceSerial: body.deviceSerial,
      cameraId: body.cameraId,
      period: body.period || "manual",
      task: body.task,
      note: body.note,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Snapshot gagal diproses." },
      { status: 500 },
    );
  }
}
