"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; message: string };

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("غير مصرّح");
  return supabase;
}

/** Distribute the next 70 `new` accounts into 14 groups of 5 for the given day. */
export async function distributeDayAction(day: number): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase.rpc("distribute_day", { p_day: day });
    if (error) return { ok: false, message: error.message };
    const res = data as { groups: number; accounts: number; day: number };
    if (res.accounts === 0)
      return { ok: false, message: "لا توجد حسابات جديدة متبقية للتوزيع" };
    revalidatePath("/");
    revalidatePath("/redistribute");
    return {
      ok: true,
      message: `تم توزيع اليوم ${res.day}: ${res.groups} مجموعة و${res.accounts} حساب`,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Move a whole 5-account group to another employee on a given day. */
export async function redistributeGroupAction(
  groupId: string,
  employeeId: string,
  day: number
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.rpc("redistribute_group", {
      p_group: groupId,
      p_employee: employeeId,
      p_day: day,
    });
    if (error) return { ok: false, message: error.message };
    revalidatePath("/redistribute");
    revalidatePath("/");
    return { ok: true, message: "تم تحويل المجموعة بنجاح" };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
