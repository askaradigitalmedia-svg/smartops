import { NextResponse } from "next/server";

// Cloudflare Pages deployment saat ini masih memerlukan Edge Route Handler.
export const runtime = "edge";

type EzvizResponse<T> = {
  code?: string | number;
  msg?: string;
  data?: T;
};

type TokenData = {
  accessToken?: string;
  expireTime?: number;
};

type LiveAddressData = {
  url?: string;
  id?: string;
  expireTime?: string;
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

const EZVIZ_BASE_URL = (
  process.env.EZVIZ_API_BASE_URL || "https://open.ezvizlife.com"
).replace(/\/+$/, "");

let cachedToken: CachedToken | undefined;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
}

async function readEzvizResponse<T>(response: Response): Promise<EzvizResponse<T>> {
  try {
    return (await response.json()) as EzvizResponse<T>;
  } catch {
    throw new Error(`EZVIZ mengembalikan respons tidak valid (HTTP ${response.status}).`);
  }
}

async function getAccessToken(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && cachedToken && cachedToken.expiresAt - now > 5 * 60 * 1000) {
    return cachedToken.value;
  }

  const appKey = process.env.EZVIZ_APP_KEY?.trim();
  const appSecret = process.env.EZVIZ_APP_SECRET?.trim();

  if (!appKey || !appSecret) {
    throw new Error("EZVIZ_APP_KEY atau EZVIZ_APP_SECRET belum dikonfigurasi di server.");
  }

  const response = await fetch(`${EZVIZ_BASE_URL}/api/lapp/token/get`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ appKey, appSecret }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await readEzvizResponse<TokenData>(response);
  const code = String(payload.code ?? "");
  const accessToken = payload.data?.accessToken;

  if (code !== "200" || !accessToken) {
    throw new Error(payload.msg || `Gagal mengambil token EZVIZ (kode ${code || "unknown"}).`);
  }

  cachedToken = {
    value: accessToken,
    expiresAt: payload.data?.expireTime || now + 6 * 24 * 60 * 60 * 1000,
  };

  return accessToken;
}

async function requestLiveAddress(deviceSerial: string, accessToken: string) {
  const response = await fetch(`${EZVIZ_BASE_URL}/api/lapp/live/address/get`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      accessToken,
      deviceSerial,
      channelNo: "1",
      protocol: "2", // EZVIZ: 2 = HLS, format yang dapat diputar di browser.
      quality: "2",
      expireTime: "3600",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  return readEzvizResponse<LiveAddressData>(response);
}

function ezvizError(payload: EzvizResponse<LiveAddressData>) {
  const code = String(payload.code ?? "");
  const message = payload.msg || "EZVIZ gagal membuat alamat Live View.";
  const normalizedMessage = message.toLowerCase();

  if (
    code === "10031" ||
    code === "20018" ||
    normalizedMessage.includes("no permission") ||
    normalizedMessage.includes("sub-account")
  ) {
    return {
      status: 403,
      error: "Akun EZVIZ Open Platform tidak memiliki izin Live View untuk kamera ini.",
      action:
        "Pastikan kamera dimiliki (bukan hanya dibagikan) oleh akun EZVIZ yang terhubung ke App Key, lalu aktifkan izin/layanan Live Streaming pada aplikasi Open Platform.",
      code,
    };
  }

  if (code === "20007") {
    return {
      status: 409,
      error: "Kamera sedang offline.",
      action: "Pastikan kamera menyala dan terhubung ke internet, lalu coba lagi.",
      code,
    };
  }

  if (code === "20002" || code === "20014") {
    return {
      status: 404,
      error: "Serial kamera tidak ditemukan pada akun EZVIZ ini.",
      action: "Periksa serial number dan kepemilikan perangkat di aplikasi EZVIZ.",
      code,
    };
  }

  return {
    status: 502,
    error: message,
    action: "Periksa status perangkat dan hak akses aplikasi di EZVIZ Open Platform.",
    code,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { deviceSerial?: unknown };
    const deviceSerial =
      typeof body.deviceSerial === "string" ? body.deviceSerial.trim().toUpperCase() : "";

    if (!deviceSerial || deviceSerial.length > 50) {
      return NextResponse.json(
        { error: "Serial number kamera tidak valid." },
        { status: 400 },
      );
    }

    let accessToken = await getAccessToken();
    let livePayload = await requestLiveAddress(deviceSerial, accessToken);

    // Token EZVIZ berlaku tujuh hari. Segarkan sekali jika upstream menyatakan token invalid.
    if (String(livePayload.code ?? "") === "10002") {
      cachedToken = undefined;
      accessToken = await getAccessToken(true);
      livePayload = await requestLiveAddress(deviceSerial, accessToken);
    }

    if (String(livePayload.code ?? "") !== "200" || !livePayload.data?.url) {
      const detail = ezvizError(livePayload);
      return NextResponse.json(
        { error: detail.error, action: detail.action, code: detail.code },
        { status: detail.status },
      );
    }

    const streamUrl = new URL(livePayload.data.url);
    if (streamUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "EZVIZ mengembalikan URL stream yang tidak aman." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      url: streamUrl.toString(),
      expiresAt: livePayload.data.expireTime,
    });
  } catch (error: unknown) {
    const message = errorMessage(error);
    const isConfigurationError = message.includes("belum dikonfigurasi");

    return NextResponse.json(
      {
        error: isConfigurationError
          ? message
          : "Server gagal menghubungi EZVIZ. Silakan coba lagi.",
      },
      { status: isConfigurationError ? 500 : 502 },
    );
  }
}
