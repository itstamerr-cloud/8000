import { notFound } from "next/navigation";
import { Info, CheckCircle2 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmployeeCard, type EmployeeAttempt } from "@/components/employee-card";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Reserved root segments handled by their own routes — never treat as a token.
const RESERVED = new Set(["login", "accounts", "redistribute"]);

export default async function EmployeePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  if (RESERVED.has(token)) notFound();

  // Service-role lookup on the server. The secret key never reaches the browser.
  const supabase = createSupabaseAdminClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, name")
    .eq("token", token)
    .single();
  if (!employee) notFound();

  // Latest day this employee has tasks for.
  const { data: latest } = await supabase
    .from("attempts")
    .select("day")
    .eq("employee_id", employee.id)
    .order("day", { ascending: false })
    .limit(1);
  const latestDay = latest?.[0]?.day ?? null;

  let attempts: EmployeeAttempt[] = [];
  if (latestDay !== null) {
    const { data } = await supabase
      .from("attempts")
      .select("id, status, note, accounts ( name, region, sector, seq )")
      .eq("employee_id", employee.id)
      .eq("day", latestDay)
      .eq("status", "pending") // only accounts not yet answered are shown
      .order("id", { ascending: true })
      .limit(5); // hard ceiling — an employee sees at most 5
    attempts = (data ?? []).map((a: any) => ({
      id: a.id,
      accountName: a.accounts?.name ?? "—",
      region: a.accounts?.region ?? null,
      sector: a.accounts?.sector ?? null,
      status: a.status,
      note: a.note ?? "",
    }));
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">حسابات اليوم</p>
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          {latestDay !== null && (
            <p className="text-sm text-muted-foreground">اليوم {latestDay}</p>
          )}
        </div>
        <AutoRefresh hasData={latestDay !== null} />
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <Info className="h-4 w-4 shrink-0" />
        لكل حساب: اختر الحالة واكتب الملاحظة ثم «اعتماد الرد». بعد الاعتماد يُثبَّت الرد ويختفي الحساب.
      </div>

      {attempts.length > 0 ? (
        <div className="space-y-4">
          {attempts.map((a, i) => (
            <EmployeeCard key={a.id} token={token} attempt={a} index={i + 1} />
          ))}
        </div>
      ) : latestDay !== null ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-800">
          <CheckCircle2 className="h-8 w-8" />
          <p className="font-semibold">أنجزت كل حساباتك 🎉</p>
          <p className="text-sm">لا يوجد ما تبقّى لهذا اليوم.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-muted-foreground">
          لا توجد حسابات مُسندة إليك حالياً. تواصل مع المشرف.
        </div>
      )}
    </main>
  );
}
