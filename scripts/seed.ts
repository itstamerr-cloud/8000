/**
 * One-time setup script.
 *
 *   1. Reads the accounts file (CSV/XLSX) and inserts rows into `accounts`
 *      with `seq` following the file's row order and status = 'new'.
 *   2. Inserts the 14 employees with a unique random token each.
 *   3. Prints a table of "employee name + personal link".
 *
 * Usage:
 *   npm run seed -- ./accounts_source.xlsx
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) in .env.local.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const EMPLOYEES = [
  "LOAY.LUTFI",
  "RAMA.ABUSARA",
  "MALEK.ALWAWI",
  "MAJED.SULTAN",
  "Rashed.Dawada",
  "Mohammad.Shrouf",
  "Mutaz.Atawneh",
  "ASEM.MTOUR",
  "SALMA.SHAMMA",
  "Kamel.Tamimi",
  "Kamel.Ghrayeb",
  "HASNA.BAZZAR",
  "TAMER.ABUTUHFA",
  "YOUSEF.ABUEID",
];

function token() {
  return randomBytes(24).toString("base64url"); // ~32 url-safe chars
}

function pick(row: Record<string, any>, names: string[]): string | null {
  for (const key of Object.keys(row)) {
    const norm = key.trim().toLowerCase();
    if (names.some((n) => norm === n || norm.includes(n))) {
      const v = row[key];
      return v === undefined || v === null ? null : String(v).trim();
    }
  }
  return null;
}

async function main() {
  if (!URL || !SERVICE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const file = process.argv[2] ?? "./accounts_source.xlsx";
  const supabase = createClient(URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ---- 1) Accounts ----
  const wb = XLSX.read(readFileSync(file));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });

  const accounts = rows.map((row, i) => ({
    seq: i + 1, // file order — the basis of sequential distribution
    name:
      pick(row, ["company", "name", "service number", "service", "اسم"]) ??
      String(Object.values(row)[0] ?? "").trim(),
    region: pick(row, ["region", "district", "cabinet district", "منطقة"]),
    sector: pick(row, ["sector", "data prod name", "product", "قطاع"]),
    phone: pick(row, ["phone", "mobile", "هاتف", "جوال"]),
    status: "new" as const,
  }));

  const { count: existing } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true });
  if ((existing ?? 0) > 0) {
    console.log(`accounts already has ${existing} rows — skipping account import.`);
  } else {
    for (let i = 0; i < accounts.length; i += 500) {
      const chunk = accounts.slice(i, i + 500);
      const { error } = await supabase.from("accounts").insert(chunk);
      if (error) throw error;
      console.log(`inserted accounts ${i + 1}..${i + chunk.length}`);
    }
    console.log(`Imported ${accounts.length} accounts.`);
  }

  // ---- 2) Employees ----
  const { data: existingEmps } = await supabase.from("employees").select("name");
  const have = new Set((existingEmps ?? []).map((e) => e.name));
  const toInsert = EMPLOYEES.filter((n) => !have.has(n)).map((name, i) => ({
    name,
    token: token(),
    // preserve order for distribution: stagger created_at
    created_at: new Date(Date.now() + i).toISOString(),
  }));
  if (toInsert.length > 0) {
    const { error } = await supabase.from("employees").insert(toInsert);
    if (error) throw error;
  }

  // ---- 3) Print links ----
  const { data: emps } = await supabase
    .from("employees")
    .select("name, token")
    .order("created_at", { ascending: true });

  console.log("\n================ روابط الموظفين ================");
  for (const e of emps ?? []) {
    console.log(`${e.name.padEnd(18)} ${APP_URL}/${e.token}`);
  }
  console.log("================================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
