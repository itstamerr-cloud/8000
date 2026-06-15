import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { RedistributeCard, type GroupCardData } from "@/components/redistribute-card";

export const dynamic = "force-dynamic";

export default async function RedistributePage() {
  const supabase = createSupabaseServerClient();

  const [{ data: groups }, { data: employees }, { data: groupAccounts }, { data: assignments }] =
    await Promise.all([
      supabase.from("groups").select("id, number").order("number", { ascending: true }),
      supabase
        .from("employees")
        .select("id, name")
        .eq("active", true)
        .order("created_at", { ascending: true }),
      supabase.from("group_accounts").select("group_id, accounts ( name, region, seq )"),
      supabase
        .from("assignments")
        .select("group_id, employee_id, day, employees ( name )")
        .order("day", { ascending: true }),
    ]);

  const maxDay = (assignments ?? []).reduce((m, a: any) => Math.max(m, a.day), 0);
  const defaultDay = maxDay + 1;

  const accountsByGroup = new Map<string, { name: string; region: string | null; seq: number }[]>();
  for (const ga of (groupAccounts ?? []) as any[]) {
    const list = accountsByGroup.get(ga.group_id) ?? [];
    if (ga.accounts)
      list.push({ name: ga.accounts.name, region: ga.accounts.region, seq: ga.accounts.seq });
    accountsByGroup.set(ga.group_id, list);
  }

  const trailByGroup = new Map<string, { employee: string; day: number }[]>();
  const triedByGroup = new Map<string, string[]>();
  for (const a of (assignments ?? []) as any[]) {
    const trail = trailByGroup.get(a.group_id) ?? [];
    trail.push({ employee: a.employees?.name ?? "—", day: a.day });
    trailByGroup.set(a.group_id, trail);

    const tried = triedByGroup.get(a.group_id) ?? [];
    tried.push(a.employee_id);
    triedByGroup.set(a.group_id, tried);
  }

  const cards: GroupCardData[] = (groups ?? []).map((g) => ({
    id: g.id,
    number: g.number,
    accounts: (accountsByGroup.get(g.id) ?? []).sort((a, b) => a.seq - b.seq),
    trail: trailByGroup.get(g.id) ?? [],
    triedEmployeeIds: triedByGroup.get(g.id) ?? [],
  }));

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-6">
        <div>
          <h1 className="text-xl font-bold">إعادة التوزيع</h1>
          <p className="text-sm text-muted-foreground">
            تتحرّك المجموعة (٥ حسابات) ككتلة واحدة لموظف جديد. الموظف الذي جرّب المجموعة
            معطّل، ولا يمكن إعطاء موظف مجموعتين في اليوم نفسه.
          </p>
        </div>

        {cards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد مجموعات بعد. وزّع خمسات اليوم من لوحة التحكم أولاً.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cards.map((g) => (
              <RedistributeCard
                key={g.id}
                group={g}
                employees={employees ?? []}
                defaultDay={defaultDay}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
