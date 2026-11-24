"use server";

import { revalidatePath } from "next/cache";
import { getSnapshot } from "@/lib/data";
import { prisma } from "@/lib/db";
import { CURRENT_REVIEWER, DECISIONS, MAX_NOTE_LENGTH, type Decision } from "@/lib/review";

export type DecisionResult = { ok: true; orderId: string; status: Decision } | { ok: false; error: string };

/** Records a review decision as a new audit-trail entry (who, when, note, previous status). */
export async function recordDecision(orderId: string, status: Decision, note: string): Promise<DecisionResult> {
  if (!DECISIONS.includes(status)) return { ok: false, error: "Unknown decision." };
  const text = String(note ?? "").trim();
  if (!text) return { ok: false, error: "A note is required to record a decision." };
  if (text.length > MAX_NOTE_LENGTH) return { ok: false, error: `Notes are limited to ${MAX_NOTE_LENGTH} characters.` };

  const snapshot = await getSnapshot();
  const order = snapshot.getOrder(String(orderId));
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.reviewEvent.create({
    data: {
      orderId: order.id,
      fromStatus: snapshot.reviewStatus(order),
      toStatus: status,
      reviewer: CURRENT_REVIEWER,
      note: text,
      source: "app",
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, orderId: order.id, status };
}
