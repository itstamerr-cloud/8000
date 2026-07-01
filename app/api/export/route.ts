import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/constants";
import type { AttemptStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface AttemptRow {
  day: number;
  status: AttemptStatus;
  note: string | null;
  updated_at: string | null;
  accounts: { seq: number; name: string; region: string | null; sector: string | null } | null;
  employees: { name: string } | null;
  groups: { number: number } | null;
}

const statusLabel = (s: AttemptStatus) => STATUS_LABELS[s] ?? s;

/**
 * Admin-only Excel export of every targeted account. Two sheets:
 *  1) "حسب الحساب" — one row per account with dynamic per-day columns
 *     (employee / status / note for day 1, day 2, …). This is the view the
 *     admin reads: for each account, who targeted it each day and the notes.
 *  2) "كل المحاولات" — raw long format, one row per attempt.
 */
export async function GET(_request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pull every attempt, paginating past the 1000-row PostgREST cap.
  const pageSize = 1000;
  let fromIdx = 0;
  const rows: AttemptRow[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("attempts")
      .select(
        "day, status, note, updated_at, accounts ( seq, name, region, sector ), employees ( name ), groups ( number )"
      )
      .order("day", { ascending: true })
      .range(fromIdx, fromIdx + pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const batch = (data ?? []) as unknown as AttemptRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    fromIdx += pageSize;
  }

  const wb = XLSX.utils.book_new();

  // ---------- Sheet 1: per-account pivot ----------
  interface Cell {
    emp: string;
    status: string;
    note: string;
  }
  interface AccountAgg {
    seq: number;
    name: string;
    region: string;
    sector: string;
    group: number | "";
    count: number;
    days: Map<number, Cell[]>;
  }
  const byAccount = new Map<number, AccountAgg>();
  const daySet = new Set<number>();

  for (const r of rows) {
    if (!r.accounts) continue;
    daySet.add(r.day);
    const seq = r.accounts.seq;
    let agg = byAccount.get(seq);
    if (!agg) {
      agg = {
        seq,
        name: r.accounts.name,
        region: r.accounts.region ?? "",
        sector: r.accounts.sector ?? "",
        group: r.groups?.number ?? "",
        count: 0,
        days: new Map(),
      };
      byAccount.set(seq, agg);
    }
    agg.count += 1;
    const list = agg.days.get(r.day) ?? [];
    list.push({
      emp: r.employees?.name ?? "—",
      status: statusLabel(r.status),
      note: r.note ?? "",
    });
    agg.days.set(r.day, list);
  }

  const days = Array.from(daySet).sort((a, b) => a - b);
  const join = (xs: string[]) => xs.filter((x) => x !== "").join(" ؛ ");

  const pivotHeader = ["#", "رقم الخدمة", "المنطقة", "المنتج", "المجموعة", "مرات الاستهداف"];
  for (const d of days) {
    pivotHeader.push(`يوم ${d} — الموظف`, `يوم ${d} — الحالة`, `يوم ${d} — الملاحظة`);
  }

  const pivotBody = Array.from(byAccount.values())
    .sort((a, b) => a.seq - b.seq)
    .map((agg) => {
      const row: (string | number)[] = [
        agg.seq,
        agg.name,
        agg.region,
        agg.sector,
        agg.group,
        agg.count,
      ];
      for (const d of days) {
        const cells = agg.days.get(d) ?? [];
        row.push(
          join(cells.map((c) => c.emp)),
          join(cells.map((c) => c.status)),
          join(cells.map((c) => c.note))
        );
      }
      return row;
    });

  const wsPivot = XLSX.utils.aoa_to_sheet([pivotHeader, ...pivotBody]);
  wsPivot["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    ...days.flatMap(() => [{ wch: 18 }, { wch: 16 }, { wch: 40 }]),
  ];
  (wsPivot as unknown as { "!views": unknown[] })["!views"] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsPivot, "حسب الحساب");

  // ---------- Sheet 2: raw long format ----------
  const longSorted = rows.slice().sort((a, b) => {
    const sa = a.accounts?.seq ?? 0;
    const sb = b.accounts?.seq ?? 0;
    if (sa !== sb) return sa - sb;
    return a.day - b.day;
  });
  const longHeader = [
    "#",
    "رقم الخدمة",
    "المنطقة",
    "المنتج",
    "المجموعة",
    "اليوم",
    "الموظف (مدير الحساب)",
    "الحالة",
    "الملاحظة",
    "آخر تحديث",
  ];
  const longBody = longSorted.map((r) => [
    r.accounts?.seq ?? "",
    r.accounts?.name ?? "",
    r.accounts?.region ?? "",
    r.accounts?.sector ?? "",
    r.groups?.number ?? "",
    r.day,
    r.employees?.name ?? "",
    statusLabel(r.status),
    r.note ?? "",
    r.updated_at ? r.updated_at.replace("T", " ").slice(0, 16) : "",
  ]);
  const wsLong = XLSX.utils.aoa_to_sheet([longHeader, ...longBody]);
  wsLong["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 6 },
    { wch: 22 },
    { wch: 16 },
    { wch: 45 },
    { wch: 18 },
  ];
  (wsLong as unknown as { "!views": unknown[] })["!views"] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsLong, "كل المحاولات");

  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="targeting-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
