// Shared review constants (safe for server and client).
import type { ReviewStatus } from "./types";

export type Decision = Exclude<ReviewStatus, "pending">;

export const DECISIONS: readonly Decision[] = ["approved", "held", "escalated"];

/** Demo user recorded as the reviewer for decisions made in the app. */
export const CURRENT_REVIEWER = "Compliance Officer";

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  held: "Held",
  escalated: "Escalated",
};

export const MAX_NOTE_LENGTH = 1000;
