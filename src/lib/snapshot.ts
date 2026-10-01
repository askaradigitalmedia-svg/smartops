import { parseAnalysis, serializeAnalysis, type AnalysisResult } from "@/lib/analysis";
import { sendAnalysisNotifications } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

export type SnapshotInput = {
  deviceSerial: string;
  cameraId: string;
  period: string;
  task?: string;
  note?: string;
};

type EzvizResponse<T> = { code?: string; msg?: string; data?: T };

let tokenCache: { value: string; expiresAt: number } | undefined;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 32_768;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function postEzviz<T>(path: string, body: Record<string, string>) {
  const response = await fetch(`https://open.ezvizlife.com${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(20_000),
  });
  return (await response.json()) as EzvizResponse<T>;
}

async function getEzvizToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 5 * 60 * 1000) return tokenCache.value;

  const appKey = process.env.EZVIZ_APP_KEY;
  const appSecret = process.env.EZVIZ_APP_SECRET;
  if (!appKey || !appSecret) throw new Error("Kredensial EZVIZ belum dikonfigurasi.");

  const payload = await postEzviz<{ accessToken?: string; expireTime?: number }>(
    "/api/lapp/token/get",
    { appKey, appSecret },
  );
  if (payload.code !== "200" || !payload.data?.accessToken) {
    throw new Error(payload.msg || "Gagal mengambil token EZVIZ.");
  }

  tokenCache = {
    value: payload.data.accessToken,
    expiresAt: payload.data.expireTime || now + 6 * 24 * 60 * 60 * 1000,
  };
  return tokenCache.value;
}

function buildPrompt(task?: string, note?: string) {
  const base = `Analisis gambar CCTV ini. Jawab HANYA sebagai JSON valid tanpa markdown dengan struktur: {"title":"judul singkat","summary":"ringkasan jelas","findings":["temuan 1","temuan 2"],"status":"aman|perhatian|bahaya|informasi"}. Jangan gunakan tanda bintang.`;
  if (task === "hitung") return `${base} Hitung jumlah orang dengan teliti dan jelaskan aktivitas yang terlihat.`;
  if (task === "progress") return `${base} Analisis progres pekerjaan berdasarkan catatan admin: "${note || "Tidak ada catatan khusus"}".`;
  if (task === "keamanan") return `${base} Periksa keamanan, ketertiban, kondisi mencurigakan, dan potensi bahaya.`;
  return `${base} Berikan analisis kondisi umum area.`;
}

async function analyzeImage(imageBase64: string, mimeType: string, task?: string, note?: string) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY belum dikonfigurasi.");

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: buildPrompt(task, note) },
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            }],
            generationConfig: { responseMimeType: "application/json" },
          }),
          signal: AbortSignal.timeout(45_000),
        },
      );
      const payload = (await response.json()) as {
        error?: { message?: string };
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error?.message || "Gemini gagal memproses gambar.");
      }

      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
      return parseAnalysis(text);
    } catch (error: unknown) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini gagal memproses gambar.");
}

export async function runSnapshotAnalysis(input: SnapshotInput) {
  const deviceSerial = input.deviceSerial.trim().toUpperCase();
  if (!deviceSerial || !input.cameraId) throw new Error("Data kamera belum lengkap.");

  const accessToken = await getEzvizToken();
  const capture = await postEzviz<{ picUrl?: string }>("/api/lapp/device/capture", {
    accessToken,
    deviceSerial,
    channelNo: "1",
  });
  if (capture.code !== "200" || !capture.data?.picUrl) {
    throw new Error(capture.msg || "Kamera gagal mengambil gambar.");
  }

  const imageUrl = capture.data.picUrl;
  const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
  if (!imageResponse.ok) throw new Error("Gambar snapshot tidak dapat diunduh dari EZVIZ.");

  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = arrayBufferToBase64(imageBuffer);
  const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
  const analysis: AnalysisResult = await analyzeImage(imageBase64, mimeType, input.task, input.note);
  const capturedAt = new Date().toISOString();

  const [{ data: camera }, { data: snapshot, error: dbError }] = await Promise.all([
    supabase.from("cameras").select("name").eq("id", input.cameraId).maybeSingle(),
    supabase
      .from("snapshots")
      .insert({
        camera_id: input.cameraId,
        image_url: imageUrl,
        snapshot_period: input.period,
        ai_journal: serializeAnalysis(analysis, input.task),
      })
      .select("id,created_at")
      .single(),
  ]);
  if (dbError) throw dbError;

  const notifications = await sendAnalysisNotifications({
    cameraName: camera?.name || deviceSerial,
    imageUrl,
    imageBase64,
    mimeType,
    analysis,
    capturedAt: snapshot?.created_at || capturedAt,
  });

  return { imageUrl, analysis, snapshotId: snapshot?.id, notifications };
}
