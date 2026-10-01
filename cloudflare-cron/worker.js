const worker = {
  async fetch(request, env) {
    if (request.method === "GET") {
      return Response.json({
        service: "smartops-snapshot-scheduler",
        status: "ok",
      });
    }
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const result = await triggerScheduledSnapshots(env, Date.now());
      return Response.json({ success: true, result });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Scheduler gagal dijalankan." },
        { status: 500 },
      );
    }
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
  return result || responseBody;
}
