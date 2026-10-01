const worker = {
  async fetch() {
    return Response.json({
      service: "smartops-snapshot-scheduler",
      status: "ok",
    });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(triggerScheduledSnapshots(env, controller.scheduledTime));
  },
};

export default worker;

async function triggerScheduledSnapshots(env, scheduledTime) {
  if (!env.CRON_SECRET) throw new Error("CRON_SECRET belum dikonfigurasi di Worker.");

  const appUrl = (env.SMARTOPS_URL || "https://smartops.pages.dev").replace(/\/+$/, "");
  const response = await fetch(`${appUrl}/api/cron/snapshots`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "Content-Type": "application/json",
      "X-SmartOps-Scheduled-At": new Date(scheduledTime).toISOString(),
    },
  });
  const responseBody = await response.text();
  let result;
  try {
    result = JSON.parse(responseBody);
  } catch {
    result = null;
  }

  if (!response.ok || result?.success === false) {
    throw new Error(`Scheduler SmartOps gagal (HTTP ${response.status}): ${responseBody}`);
  }

  console.log(responseBody);
}
