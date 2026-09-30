export default {
    // Fungsi ini otomatis dijalankan oleh Cloudflare sesuai jadwal Cron yang diatur
    async scheduled(event, env, ctx) {
      // Menyesuaikan waktu Cloudflare (UTC) ke WIB (UTC+7)
      const date = new Date(event.scheduledTime);
      const hour = date.getUTCHours() + 7; 
      const period = hour < 12 ? "pagi" : "sore";
  
      // PENTING: Ganti dengan URL aplikasi Next.js kamu setelah di-deploy online (misal Vercel)
      // Jika masih di komputer lokal (localhost), Cloudflare tidak bisa mengaksesnya 
      // kecuali kamu menggunakan layanan seperti ngrok.
      const API_URL = "https://smartops-app-kamu.vercel.app/api/camera/snapshot";
  
      // Masukkan ID kamera dari Supabase dan Serial Number Ezviz-nya
      const cameras = [
        { cameraId: "masukkan-id-uuid-dari-supabase", deviceSerial: "masukkan-serial-ezviz" }
        // Bisa tambah kamera lain di sini jika jumlahnya banyak
      ];
  
      for (const cam of cameras) {
        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cameraId: cam.cameraId,
              deviceSerial: cam.deviceSerial,
              period: period
            })
          });
          
          if (response.ok) {
            console.log(`Sukses trigger ${period} untuk kamera ${cam.deviceSerial}`);
          } else {
            console.error("Gagal:", await response.text());
          }
        } catch (err) {
          console.error("Error jaringan:", err.message);
        }
      }
    }
  };