import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { deviceSerial } = await request.json();

    // 1. Ambil Token Ezviz
    const appKey = process.env.EZVIZ_APP_KEY!;
    const appSecret = process.env.EZVIZ_APP_SECRET!;
    
    const tokenRes = await fetch("https://open.ezvizlife.com/api/lapp/token/get", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ appKey, appSecret }).toString(),
    });
    const tokenData = await tokenRes.json();
    
    if (tokenData.code !== "200") {
      return NextResponse.json({ error: "Gagal ambil token Ezviz" }, { status: 400 });
    }
    const accessToken = tokenData.data.accessToken;

    // 2. Minta URL Live Stream (Format HLS untuk Web)
    const liveRes = await fetch("https://open.ezvizlife.com/api/lapp/v2/live/address/get", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ 
        accessToken, 
        deviceSerial, 
        channelNo: "1", 
        protocol: "3", // 3 = Protokol HLS (Bisa diputar di browser)
        quality: "2"   // 2 = Fluent/Standar (Agar ringan di-load), 1 = HD
      }).toString(),
    });
    const liveData = await liveRes.json();
    
    if (liveData.code !== "200") {
      return NextResponse.json({ error: liveData.msg || "Gagal mendapatkan URL Live dari kamera." }, { status: 400 });
    }

    // Mengirimkan URL HLS kembali ke frontend
    return NextResponse.json({ success: true, url: liveData.data.url });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}