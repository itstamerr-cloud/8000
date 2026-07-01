"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { STATUS_LABELS } from "@/lib/constants";
import type { AttemptStatus } from "@/lib/types";

type SaveResult = { ok: boolean; message: string };

/**
 * Commit an attempt's answer (status + note). Runs on the server with the
 * service-role key.
 *
 * Rules enforced here (server-side, authoritative):
 *  - The answer must be a real status (not "pending").
 *  - The update is scoped to the employee that owns `token`, so a caller can
 *    never write to another employee's attempts.
 *  - It is FINAL: the `.eq("status","pending")` guard makes the update atomic,
 *    so an already-answered attempt can never be edited (and a double click /
 *    race commits exactly once).
 */
export async function saveAttemptAction(
  token: string,
  attemptId: string,
  status: AttemptStatus,
  note: string
): Promise<SaveResult> {
  if (!(status in STATUS_LABELS) || status === "pending") {
    return { ok: false, message: "اختر حالة الرد أولاً" };
  }

  const supabase = createSupabaseAdminClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("token", token)
    .single();
  if (!employee) return { ok: false, message: "رابط غير صالح" };

  const { data, error } = await supabase
    .from("attempts")
    .update({ status, note, updated_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("employee_id", employee.id)
    .eq("status", "pending") // finality: only an unanswered attempt can be committed
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0)
    return { ok: false, message: "تم اعتماد هذا الحساب مسبقاً ولا يمكن تعديله" };

  revalidatePath(`/${token}`);
  return { ok: true, message: "تم اعتماد الرد" };
}
