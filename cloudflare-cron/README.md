# SmartOps Snapshot Scheduler

Worker ini cukup dijalankan setiap menit. Jam snapshot yang sebenarnya dibaca dari tabel
`camera_schedules`, menggunakan zona waktu `Asia/Jakarta`.

## Konfigurasi Cloudflare Worker

1. Deploy `worker.js` sebagai Worker.
2. Tambahkan Cron Trigger `* * * * *`.
3. Tambahkan variable `SMARTOPS_URL=https://smartops.pages.dev`.
4. Tambahkan secret `CRON_SECRET` dengan nilai yang sama seperti environment aplikasi Next.js.

Worker tidak menyimpan serial kamera atau jadwal. Semua jadwal dikelola dari dashboard admin.

