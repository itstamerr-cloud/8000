"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS } from "@/lib/constants";
import type { AttemptStatus } from "@/lib/types";

export interface TrailHop {
  day: number;
  employee: string;
  date: string;
}

export interface TimelineItem {
  day: number;
  employee: string;
  status: AttemptStatus;
  note: string;
  updated_at: string;
}

export interface AccountDetail {
  seq: number;
  name: string;
  region: string | null;
  sector: string | null;
  phone: string | null;
  status: string;
  trail: TrailHop[];
  timeline: TimelineItem[];
}

export function AccountDrawer({ detail }: { detail: AccountDetail | null }) {
  const router = useRouter();
  const params = useSearchParams();

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete("account");
    router.replace(`/accounts?${next.toString()}`);
  }

  if (!detail) return null;

  return (
    <Sheet
      open
      onClose={close}
      title={`الحساب ${detail.name}`}
      description={`تسلسل #${detail.seq} · ${detail.region ?? "—"} · ${detail.sector ?? "—"}`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="border-slate-200 bg-slate-100 text-slate-700">
            الحالة: {detail.status === "distributed" ? "موزّع" : "جديد"}
          </Badge>
          {detail.phone && (
            <Badge className="border-slate-200 bg-slate-100 text-slate-700" dir="ltr">
              {detail.phone}
            </Badge>
          )}
        </div>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            مسار المجموعة
          </h3>
          {detail.trail.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تُوزَّع بعد.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {detail.trail.map((hop, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm">
                    <span className="font-medium">{hop.employee}</span>
                    <span className="mr-2 text-xs text-muted-foreground">
                      يوم {hop.day}
                    </span>
                  </div>
                  {i < detail.trail.length - 1 && (
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            سجل المحاولات ({detail.timeline.length})
          </h3>
          {detail.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد محاولات.</p>
          ) : (
            <ol className="relative space-y-4 border-r border-border pr-4">
              {detail.timeline.map((item, i) => (
                <li key={i} className="relative">
                  <span className="absolute -right-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.employee}</span>
                    <span className="text-xs text-muted-foreground">
                      يوم {item.day}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.note ? (
                    <p className="mt-1 rounded-md bg-muted/60 px-3 py-2 text-sm">
                      {item.note}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {STATUS_LABELS[item.status]} — بدون ملاحظة
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Sheet>
  );
}
