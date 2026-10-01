This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## SmartOps CCTV setup

Fitur jadwal snapshot dan notifikasi membutuhkan satu migration Supabase dan beberapa secret server.

1. Jalankan `supabase/migrations/20260930_cctv_schedules_notifications.sql` melalui Supabase SQL Editor.
   Jika tabel sudah dibuat tetapi muncul error RLS, jalankan juga
   `supabase/migrations/20261001_fix_cctv_rls_policies.sql`.
2. Salin variable yang diperlukan dari `.env.example` ke environment lokal dan Cloudflare Pages.
3. Untuk email, buat API key Resend dan verifikasi domain pengirim. Saat pengujian dapat memakai `onboarding@resend.dev`.
4. Untuk Telegram, buat bot melalui `@BotFather`, masukkan `TELEGRAM_BOT_TOKEN`, lalu isi Chat ID melalui dashboard.
5. Deploy Worker pada folder `cloudflare-cron` dan pasang Cron Trigger setiap menit. Instruksi lengkap ada di `cloudflare-cron/README.md`.

Secret `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, dan `CRON_SECRET` tidak boleh memakai prefix `NEXT_PUBLIC_`.
