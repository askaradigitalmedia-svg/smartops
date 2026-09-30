const worker = {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(triggerScheduledSnapshots(env));
  },
};

export default worker;

async function triggerScheduledSnapshots(env) {
  if (!env.CRON_SECRET) throw new Error("CRON_SECRET belum dikonfigurasi di Worker.");

  const appUrl = (env.SMARTOPS_URL || "https://smartops.pages.dev").replace(/\/+$/, "");
  const response = await fetch(`${appUrl}/api/cron/snapshots`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Scheduler SmartOps gagal (HTTP ${response.status}): ${await response.text()}`);
  }

  console.log(await response.text());
}
