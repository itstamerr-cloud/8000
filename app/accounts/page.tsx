import Link from "next/link";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AccountDrawer,
  type AccountDetail,
  type TimelineItem,
  type TrailHop,
} from "@/components/account-drawer";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function loadDetail(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  accountId: string
): Promise<AccountDetail | null> {
  const { data: account } = await supabase
    .from("accounts")
    .select("seq, name, region, sector, phone, status")
    .eq("id", accountId)
    .single();
  if (!account) return null;

  const { data: ga } = await supabase
    .from("group_accounts")
    .select("group_id")
    .eq("account_id", accountId)
    .limit(1);
  const groupId = ga?.[0]?.group_id;

  let trail: TrailHop[] = [];
  if (groupId) {
    const { data: assignments } = await supabase
      .from("assignments")
      .select("day, assigned_date, employees ( name )")
      .eq("group_id", groupId)
      .order("day", { ascending: true });
    trail = (assignments ?? []).map((a: any) => ({
      day: a.day,
      employee: a.employees?.name ?? "—",
      date: a.assigned_date,
    }));
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select("day, status, note, updated_at, employees ( name )")
    .eq("account_id", accountId)
    .order("day", { ascending: true })
    .order("updated_at", { ascending: true });
  const timeline: TimelineItem[] = (attempts ?? []).map((a: any) => ({
    day: a.day,
    employee: a.employees?.name ?? "—",
    status: a.status,
    note: a.note ?? "",
    updated_at: a.updated_at,
  }));

  return { ...account, trail, timeline };
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { q?: string; account?: string; page?: string };
}) {
  const supabase = createSupabaseServerClient();
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("accounts")
    .select("id, seq, name, region, sector, status", { count: "exact" })
    .order("seq", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data: accounts, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const detail = searchParams.account
    ? await loadDetail(supabase, searchParams.account)
    : null;

  function pageLink(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/accounts?${params.toString()}`;
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-6">
        <div>
          <h1 className="text-xl font-bold">الحسابات</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString("en-US")} حساب — انقر على أي حساب لعرض مساره وسجل محاولاته
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <form className="flex gap-2" action="/accounts">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="ابحث برقم الخدمة…"
                  className="pr-9"
                />
              </div>
              <Button type="submit">بحث</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>رقم الخدمة</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(accounts ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      لا توجد نتائج
                    </TableCell>
                  </TableRow>
                ) : (
                  (accounts ?? []).map((a) => {
                    const params = new URLSearchParams();
                    if (q) params.set("q", q);
                    params.set("page", String(page));
                    params.set("account", a.id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {a.seq}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accounts?${params.toString()}`}
                            className="font-medium text-primary hover:underline"
                            scroll={false}
                          >
                            {a.name}
                          </Link>
                        </TableCell>
                        <TableCell>{a.region ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{a.sector ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              a.status === "distributed"
                                ? "border-sky-200 bg-sky-100 text-sky-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }
                          >
                            {a.status === "distributed" ? "موزّع" : "جديد"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <div className="flex gap-1">
            <Link
              href={pageLink(Math.max(1, page - 1))}
              className="rounded-md border border-border p-2 hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40"
              aria-disabled={page <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href={pageLink(Math.min(totalPages, page + 1))}
              className="rounded-md border border-border p-2 hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40"
              aria-disabled={page >= totalPages}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <AccountDrawer detail={detail} />
    </>
  );
}
