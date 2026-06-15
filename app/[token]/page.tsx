import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmployeeCard, type EmployeeAttempt } from "@/components/employee-card";

export const dynamic = "force-dynamic";

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
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">حسابات اليوم</p>
        <h1 className="text-2xl font-bold">{employee.name}</h1>
        {latestDay !== null && (
          <p className="text-sm text-muted-foreground">اليوم {latestDay}</p>
        )}
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <Info className="h-4 w-4 shrink-0" />
        تشاهد 5 حسابات فقط — حدّث الحالة وأضف ملاحظتك لكل حساب.
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-muted-foreground">
          لا توجد حسابات مُسندة إليك حالياً. تواصل مع المشرف.
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((a, i) => (
            <EmployeeCard key={a.id} token={token} attempt={a} index={i + 1} />
          ))}
        </div>
      )}
    </main>
  );
}
