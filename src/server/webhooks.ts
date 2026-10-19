import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
/** Call only after PayPal signature verification. Durable ingestion precedes acknowledgement. */
export async function persistVerifiedWebhook(event: {
  id: string;
  event_type: string;
  resource: { id?: string };
  [key: string]: unknown;
}) {
  return db.$transaction(async (tx) => {
    await tx.webhookEvent.createMany({
      skipDuplicates: true,
      data: [
        {
          id: event.id,
          eventType: event.event_type,
          resourceId: event.resource.id,
          payload: event as Prisma.InputJsonValue,
        },
      ],
    });
    await tx.job.createMany({
      skipDuplicates: true,
      data: [
        {
          key: `webhook:${event.id}:`,
          type: "webhook",
          resourceId: event.id,
        },
      ],
    });
  });
}
