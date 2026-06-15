import Link from "next/link";
import { ChevronRight, ChevronLeft, Database, Send, Layers, Inbox } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DistributeButton } from "@/components/distribute-button";
import { PER_EMPLOYEE } from "@/lib/constants";

export const dynamic = "force-dynamic";

function Metric({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-lg p-3 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">
            {value.toLocaleString("en-US")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const supabase = createSupabaseServerClient();

  const [
    { count: total },
    { count: distributed },
    { count: remaining },
    { data: maxRow },
    { data: employees },
  ] = await Promise.all([
    supabase.from("accounts").select("*", { count: "exact", head: true }),
    supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("status", "distributed"),
    supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("assignments")
      .select("day")
      .order("day", { ascending: false })
      .limit(1),
    supabase
      .from("employees")
      .select("id, name, active")
      .order("created_at", { ascending: true }),
  ]);

  const maxDay = maxRow?.[0]?.day ?? 0;
  const selectedDay = Number(searchParams.day) || maxDay || 1;
  const nextDay = maxDay + 1;

  // Attempts for the selected day, to compute per-employee progress.
  const { data: dayAttempts } = await supabase
    .from("attempts")
    .select("employee_id, status")
    .eq("day", selectedDay);

  const byEmployee = new Map<string, { total: number; done: number }>();
  for (const a of dayAttempts ?? []) {
    const e = byEmployee.get(a.employee_id) ?? { total: 0, done: 0 };
    e.total += 1;
    if (a.status !== "pending") e.done += 1;
    byEmployee.set(a.employee_id, e);
  }
  const distributedToday = dayAttempts?.length ?? 0;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">لوحة التحكم</h1>
            <p className="text-sm text-muted-foreground">
              نظرة عامة على توزيع الحسابات وتقدّم الفريق
            </p>
          </div>
          <DistributeButton nextDay={nextDay} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="إجمالي الحسابات" value={total ?? 0} icon={Database} accent="bg-slate-100 text-slate-700" />
          <Metric label="المُوزّع تراكمياً" value={distributed ?? 0} icon={Layers} accent="bg-sky-100 text-sky-700" />
          <Metric label="المتبقّي" value={remaining ?? 0} icon={Inbox} accent="bg-amber-100 text-amber-700" />
          <Metric label={`المُوزّع (يوم ${selectedDay})`} value={distributedToday} icon={Send} accent="bg-emerald-100 text-emerald-700" />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>تقدّم الموظفين — يوم {selectedDay}</CardTitle>
            <div className="flex items-center gap-1">
              <Link
                href={`/?day=${Math.max(1, selectedDay - 1)}`}
                className="rounded-md border border-border p-1.5 hover:bg-muted"
                aria-label="اليوم السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
              <span className="min-w-12 text-center text-sm font-medium">
                يوم {selectedDay}
              </span>
              <Link
                href={`/?day=${selectedDay + 1}`}
                className="rounded-md border border-border p-1.5 hover:bg-muted"
                aria-label="اليوم التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {distributedToday === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                لا يوجد توزيع لهذا اليوم بعد.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>التقدّم</TableHead>
                    <TableHead className="w-1/2">النسبة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employees ?? [])
                    .filter((e) => byEmployee.has(e.id))
                    .map((e) => {
                      const stat = byEmployee.get(e.id)!;
                      const pct = Math.round((stat.done / (stat.total || PER_EMPLOYEE)) * 100);
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell className="tabular-nums">
                            {stat.done}/{stat.total}
                          </TableCell>
                          <TableCell>
                            <div className="h-2 w-full rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
