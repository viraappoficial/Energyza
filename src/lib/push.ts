import "server-only";
import webpush from "web-push";
import { sql } from "@/lib/db";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

export const pushConfigured = () => !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

// Envia a notificação para todos os aparelhos cadastrados; remove os que expiraram (404/410).
export async function notifyOwner(p: PushPayload) {
  if (!pushConfigured()) return { sent: 0, failed: 0 };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || "contato@energyzaeletrica.com.br"}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const subs = await sql<{ endpoint: string; p256dh: string; auth: string }[]>`select endpoint, p256dh, auth from push_subscriptions`;
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(p),
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`;
        else console.error("[push] falha:", status ?? (e as Error).message);
      }
    }),
  );
  return { sent, failed };
}
