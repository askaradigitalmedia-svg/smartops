"use client";

import { useEffect, useState } from "react";
import { BellRing, Mail, Save, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Settings = {
  email_enabled: boolean;
  email_recipients: string[];
  telegram_enabled: boolean;
  telegram_chat_id: string;
};

const defaultSettings: Settings = {
  email_enabled: false,
  email_recipients: [],
  telegram_enabled: false,
  telegram_chat_id: "",
};

export function NotificationSettingsPanel() {
  const [settings, setSettings] = useState(defaultSettings);
  const [emails, setEmails] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("notification_settings")
      .select("email_enabled,email_recipients,telegram_enabled,telegram_chat_id")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMessage("Jalankan migration Supabase untuk mengaktifkan notifikasi.");
          return;
        }
        if (data) {
          const loaded = {
            email_enabled: Boolean(data.email_enabled),
            email_recipients: Array.isArray(data.email_recipients) ? data.email_recipients : [],
            telegram_enabled: Boolean(data.telegram_enabled),
            telegram_chat_id: data.telegram_chat_id || "",
          };
          setSettings(loaded);
          setEmails(loaded.email_recipients.join(", "));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    const recipients = emails.split(",").map((email) => email.trim()).filter(Boolean);
    if (settings.email_enabled && recipients.length === 0) {
      setMessage("Masukkan minimal satu alamat email.");
      return;
    }
    if (settings.telegram_enabled && !settings.telegram_chat_id.trim()) {
      setMessage("Masukkan Telegram Chat ID.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("notification_settings").upsert({
      id: 1,
      ...settings,
      email_recipients: recipients,
      telegram_chat_id: settings.telegram_chat_id.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setMessage(error ? error.message : "Pengaturan notifikasi tersimpan.");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-violet-50 p-2 text-violet-600"><BellRing size={18} /></div>
        <div>
          <h3 className="font-semibold text-slate-800">Notifikasi Analisis</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">Kirim hasil AI dan gambar snapshot secara otomatis.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-2"><Mail size={15} /> Email</span>
            <input type="checkbox" checked={settings.email_enabled} onChange={(event) => setSettings({ ...settings, email_enabled: event.target.checked })} className="h-4 w-4 accent-blue-600" />
          </label>
          {settings.email_enabled && (
            <input type="text" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="admin@contoh.com, owner@contoh.com" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" />
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-2"><Send size={15} /> Telegram</span>
            <input type="checkbox" checked={settings.telegram_enabled} onChange={(event) => setSettings({ ...settings, telegram_enabled: event.target.checked })} className="h-4 w-4 accent-blue-600" />
          </label>
          {settings.telegram_enabled && (
            <input type="text" value={settings.telegram_chat_id} onChange={(event) => setSettings({ ...settings, telegram_chat_id: event.target.value })} placeholder="Chat ID, contoh: -1001234567890" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" />
          )}
        </div>

        <button type="button" onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
          <Save size={15} /> {saving ? "Menyimpan..." : "Simpan Notifikasi"}
        </button>
        {message && <p className="text-center text-[11px] leading-4 text-slate-500">{message}</p>}
      </div>
    </div>
  );
}

