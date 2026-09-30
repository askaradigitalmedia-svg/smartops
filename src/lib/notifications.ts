import type { AnalysisResult } from "@/lib/analysis";
import { supabase } from "@/lib/supabase";

type NotificationSettings = {
  email_enabled: boolean;
  email_recipients: string[] | null;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
};

export type NotificationResult = {
  channel: "email" | "telegram";
  sent: boolean;
  message?: string;
};

type NotificationInput = {
  cameraName: string;
  imageUrl: string;
  imageBase64: string;
  mimeType: string;
  analysis: AnalysisResult;
  capturedAt: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

async function sendEmail(settings: NotificationSettings, input: NotificationInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = settings.email_recipients?.filter(Boolean) || [];

  if (!apiKey || recipients.length === 0) {
    return { channel: "email", sent: false, message: "Konfigurasi email belum lengkap." } satisfies NotificationResult;
  }

  const findings = input.analysis.findings
    .map((item) => `<li style="margin:0 0 8px">${escapeHtml(item)}</li>`)
    .join("");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_EMAIL_FROM || "SmartOps <onboarding@resend.dev>",
      to: recipients,
      subject: `[SmartOps] ${input.analysis.title} — ${input.cameraName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a">
          <div style="background:#0f172a;color:#fff;padding:24px;border-radius:16px 16px 0 0">
            <div style="font-size:12px;opacity:.75;text-transform:uppercase;letter-spacing:.08em">SmartOps CCTV</div>
            <h1 style="font-size:22px;margin:8px 0 4px">${escapeHtml(input.analysis.title)}</h1>
            <div style="font-size:14px;opacity:.8">${escapeHtml(input.cameraName)} · ${escapeHtml(formatDate(input.capturedAt))}</div>
          </div>
          <img src="${escapeHtml(input.imageUrl)}" alt="Snapshot ${escapeHtml(input.cameraName)}" style="display:block;width:100%;max-height:420px;object-fit:cover" />
          <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px">
            <div style="display:inline-block;background:#eff6ff;color:#1d4ed8;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700">${escapeHtml(input.analysis.status.toUpperCase())}</div>
            <p style="font-size:16px;line-height:1.7;margin:18px 0">${escapeHtml(input.analysis.summary)}</p>
            ${findings ? `<ul style="padding-left:20px;line-height:1.6">${findings}</ul>` : ""}
          </div>
        </div>`,
      attachments: [
        {
          content: input.imageBase64,
          filename: `snapshot-${input.cameraName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.jpg`,
          content_type: input.mimeType,
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || `Resend HTTP ${response.status}`);
  }

  return { channel: "email", sent: true } satisfies NotificationResult;
}

async function sendTelegram(settings: NotificationSettings, input: NotificationInput) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings.telegram_chat_id?.trim();

  if (!botToken || !chatId) {
    return { channel: "telegram", sent: false, message: "Konfigurasi Telegram belum lengkap." } satisfies NotificationResult;
  }

  const findings = input.analysis.findings.map((item) => `• ${item}`).join("\n");
  const caption = [
    `<b>${escapeHtml(input.analysis.title)}</b>`,
    `<b>Kamera:</b> ${escapeHtml(input.cameraName)}`,
    `<b>Waktu:</b> ${escapeHtml(formatDate(input.capturedAt))}`,
    `<b>Status:</b> ${escapeHtml(input.analysis.status.toUpperCase())}`,
    "",
    escapeHtml(input.analysis.summary),
    findings ? `\n${escapeHtml(findings)}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1024);

  const bytes = Uint8Array.from(atob(input.imageBase64), (character) => character.charCodeAt(0));
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);
  formData.append("parse_mode", "HTML");
  formData.append("photo", new Blob([bytes], { type: input.mimeType }), "snapshot.jpg");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description || `Telegram HTTP ${response.status}`);
  }

  return { channel: "telegram", sent: true } satisfies NotificationResult;
}

export async function sendAnalysisNotifications(input: NotificationInput) {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("email_enabled,email_recipients,telegram_enabled,telegram_chat_id")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return [];

  const settings = data as NotificationSettings;
  const jobs: Promise<NotificationResult>[] = [];
  if (settings.email_enabled) jobs.push(sendEmail(settings, input));
  if (settings.telegram_enabled) jobs.push(sendTelegram(settings, input));

  const results = await Promise.allSettled(jobs);
  return results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const channel = jobs.length === 2 ? (index === 0 ? "email" : "telegram") : settings.email_enabled ? "email" : "telegram";
    return {
      channel,
      sent: false,
      message: result.reason instanceof Error ? result.reason.message : "Gagal mengirim notifikasi.",
    } satisfies NotificationResult;
  });
}
