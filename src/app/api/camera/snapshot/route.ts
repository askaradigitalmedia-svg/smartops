import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { deviceSerial, cameraId, period, task, note } = await request.json();

    // 1. AMBIL TOKEN EZVIZ
    const appKey = process.env.EZVIZ_APP_KEY!;
    const appSecret = process.env.EZVIZ_APP_SECRET!;
    
    const tokenRes = await fetch("https://open.ezvizlife.com/api/lapp/token/get", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ appKey, appSecret }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== "200") return NextResponse.json({ error: "Gagal ambil token Ezviz" }, { status: 400 });
    const accessToken = tokenData.data.accessToken;

    // 2. TRIGGER KAMERA EZVIZ
    const snapRes = await fetch("https://open.ezvizlife.com/api/lapp/device/capture", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ accessToken, deviceSerial, channelNo: "1" }).toString(),
    });
    const snapData = await snapRes.json();
    if (snapData.code !== "200") return NextResponse.json({ error: "Kamera gagal mengambil gambar." }, { status: 400 });
    const imageUrl = snapData.data.picUrl;

    // 3. SIAPKAN GAMBAR UNTUK GEMINI (Gemini butuh format Base64)
    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    // 4. MEMBUAT PROMPT AI DINAMIS BERDASARKAN PILIHAN ADMIN
    let promptInstruction = "Tolong analisa gambar ini.";
    if (task === "hitung") {
      promptInstruction = "Tugasmu adalah MENGHITUNG PEKERJA. Hitung dengan teliti jumlah orang yang terlihat di dalam gambar ini. Jelaskan secara singkat apa yang sedang mereka lakukan di area tersebut.";
    } else if (task === "progress") {
      promptInstruction = `Tugasmu adalah MENGANALISA PROGRESS. Terdapat catatan dari admin lapangan: "${note || 'Tidak ada catatan khusus'}". Tolong evaluasi gambar ini, apakah kondisinya sesuai dengan catatan admin? Berikan analisa visualmu terkait progresnya.`;
    } else if (task === "keamanan") {
      promptInstruction = "Tugasmu adalah MENGANALISA KEAMANAN & KETERTIBAN. Perhatikan gambar ini, apakah ada hal yang mencurigakan, berantakan, atau potensi bahaya?";
    }

    // 5. ANALISA MENGGUNAKAN GOOGLE GEMINI 1.5 FLASH (Gratis)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY belum disetel di .env.local");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
    
    const aiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptInstruction },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }]
      })
    });
    
    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error.message || "Gagal memproses dengan Gemini.");

    // Mengambil teks balasan dari struktur data Gemini
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini gagal memproses.";

    // 6. SIMPAN KE DATABASE
    const { error: dbError } = await supabase.from("snapshots").insert({
      camera_id: cameraId,
      image_url: imageUrl,
      snapshot_period: period,
      ai_journal: aiText,
    });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, imageUrl, aiText });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}