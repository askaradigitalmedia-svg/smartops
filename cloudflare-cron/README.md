# SmartOps Snapshot Scheduler

Worker ini berjalan setiap menit dan memanggil endpoint scheduler SmartOps. Jam snapshot tetap dibaca dari tabel `camera_schedules` menggunakan zona waktu `Asia/Jakarta`.

## Deploy

1. Login ke Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Pastikan `CRON_SECRET` di Cloudflare Pages project `smartops` sama dengan nilai lokal. Jika belum, pasang melalui dashboard **Workers & Pages → smartops → Settings → Variables and Secrets**, lalu lakukan deploy ulang Pages.

3. Pasang nilai yang sama pada Worker:

   ```bash
   npm run cron:secret
   ```

4. Deploy Worker beserta Cron Trigger setiap menit:

   ```bash
   npm run cron:deploy
   ```

5. Pantau eksekusi Worker:

   ```bash
   npm run cron:tail
   ```

Konfigurasi `wrangler.jsonc` sudah menyertakan trigger `* * * * *`, URL aplikasi produksi, dan observability. Jangan menyimpan nilai `CRON_SECRET` di Git.

## Pemeriksaan cepat

`GET https://smartops.pages.dev/api/cron/snapshots` mengembalikan `configured: true` jika secret sudah terbaca oleh aplikasi. Request Worker yang memakai secret berbeda akan menerima pesan `CRON_SECRET Worker tidak cocok dengan aplikasi`.

Endpoint memproses semua jadwal hari ini yang waktunya sudah lewat dan belum berhasil dijalankan. Jika proses snapshot gagal, klaim jadwal dilepas agar dapat dicoba lagi pada pemanggilan berikutnya.
