import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/constants";
import type { AttemptStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AttemptRow {
  day: number;
  status: AttemptStatus;
  note: string | null;
  updated_at: string | null;
  accounts: { seq: number; name: string; region: string | null; sector: string | null } | null;
  employees: { name: string } | null;
  groups: { number: number } | null;
}

/**
 * Admin-only Excel export of every targeted account.
 * One row per attempt → an account targeted on multiple days (by different
 * employees) appears as multiple rows, capturing the full history + notes.
 * Optional ?day=N narrows the export to a single day.
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dayParam = request.nextUrl.searchParams.get("day");
  const day = dayParam !== null && dayParam !== "" ? Number(dayParam) : null;

  // Pull every attempt, paginating to bypass the 1000-row PostgREST cap.
  const pageSize = 1000;
  let fromIdx = 0;
  const rows: AttemptRow[] = [];
  for (;;) {
    let q = supabase
      .from("attempts")
      .select(
        "day, status, note, updated_at, accounts ( seq, name, region, sector ), employees ( name ), groups ( number )"
      )
      .order("day", { ascending: true })
      .range(fromIdx, fromIdx + pageSize - 1);
    if (day !== null && !Number.isNaN(day)) q = q.eq("day", day);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const batch = (data ?? []) as unknown as AttemptRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    fromIdx += pageSize;
  }

  // Group an account's attempts together, ordered by day within the account.
  rows.sort((a, b) => {
    const sa = a.accounts?.seq ?? 0;
    const sb = b.accounts?.seq ?? 0;
    if (sa !== sb) return sa - sb;
    return a.day - b.day;
  });

  const header = [
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

  const body = rows.map((r) => [
    r.accounts?.seq ?? "",
    r.accounts?.name ?? "",
    r.accounts?.region ?? "",
    r.accounts?.sector ?? "",
    r.groups?.number ?? "",
    r.day,
    r.employees?.name ?? "",
    STATUS_LABELS[r.status] ?? r.status,
    r.note ?? "",
    // Plain string slice — robust, no timezone/Date parsing surprises.
    r.updated_at ? r.updated_at.replace("T", " ").slice(0, 16) : "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = [
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
  // Right-to-left sheet view (ignored gracefully if unsupported).
  (ws as unknown as { "!views": unknown[] })["!views"] = [{ RTL: true }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الحسابات المستهدفة");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10);
  const filename =
    day !== null && !Number.isNaN(day)
      ? `targeting-day-${day}-${today}.xlsx`
      : `targeting-all-${today}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
