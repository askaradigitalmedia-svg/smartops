import { NextResponse } from "next/server";
export const runtime = "edge";
export async function POST() {
  const appKey = process.env.EZVIZ_APP_KEY;
  const appSecret = process.env.EZVIZ_APP_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json(
      { error: "Kredensial Ezviz belum disetel di .env.local" },
      { status: 500 }
    );
  }

  try {
    // Ezviz API menggunakan x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("appKey", appKey);
    formData.append("appSecret", appSecret);

    const res = await fetch("https://open.ezvizlife.com/api/lapp/token/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await res.json();

    // Code "200" artinya sukses dari API Ezviz
    if (data.code === "200") {
      return NextResponse.json({ accessToken: data.data.accessToken });
    } else {
      return NextResponse.json({ error: data.msg || "Gagal mendapatkan token" }, { status: 400 });
    }
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menghubungi Ezviz" },
      { status: 500 }
    );
  }
}
