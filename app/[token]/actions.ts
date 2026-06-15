"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { STATUS_LABELS } from "@/lib/constants";
import type { AttemptStatus } from "@/lib/types";

type SaveResult = { ok: boolean; message: string };

/**
 * Save an attempt's status/note. Runs on the server with the service-role key.
 * Security: the update is scoped to the employee that owns `token`, so a
 * caller can never write to another employee's attempts.
 */
export async function saveAttemptAction(
  token: string,
  attemptId: string,
  status: AttemptStatus,
  note: string
): Promise<SaveResult> {
  if (!(status in STATUS_LABELS)) {
    return { ok: false, message: "حالة غير صحيحة" };
  }

  const supabase = createSupabaseAdminClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("token", token)
    .single();
  if (!employee) return { ok: false, message: "رابط غير صالح" };

  // The .eq("employee_id", employee.id) guard is the security boundary:
  // an attempt that belongs to another employee will not be matched.
  const { data, error } = await supabase
    .from("attempts")
    .update({ status, note, updated_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("employee_id", employee.id)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0)
    return { ok: false, message: "لا يمكن تعديل هذا الحساب" };

  revalidatePath(`/${token}`);
  return { ok: true, message: "تم الحفظ" };
}
