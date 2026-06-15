"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Shuffle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { redistributeGroupAction } from "@/app/actions";

export interface GroupCardData {
  id: string;
  number: number;
  accounts: { name: string; region: string | null }[];
  trail: { employee: string; day: number }[];
  triedEmployeeIds: string[];
}

export function RedistributeCard({
  group,
  employees,
  defaultDay,
}: {
  group: GroupCardData;
  employees: { id: string; name: string }[];
  defaultDay: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const available = employees.filter(
    (e) => !group.triedEmployeeIds.includes(e.id)
  );
  const [employeeId, setEmployeeId] = useState(available[0]?.id ?? "");
  const [day, setDay] = useState(defaultDay);

  function submit() {
    if (!employeeId) {
      toast.error("اختر موظفاً متاحاً");
      return;
    }
    startTransition(async () => {
      const res = await redistributeGroupAction(group.id, employeeId, day);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>المجموعة #{group.number}</CardTitle>
        <Badge className="border-slate-200 bg-slate-100 text-slate-600">
          {group.accounts.length} حسابات
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {group.accounts.map((a, i) => (
            <span
              key={i}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
            >
              {a.name}
              <span className="mr-1 text-muted-foreground">{a.region ?? ""}</span>
            </span>
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            مسار التنقّل
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {group.trail.map((hop, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                  {hop.employee} · يوم {hop.day}
                </span>
                {i < group.trail.length - 1 && (
                  <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>الموظف</Label>
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={available.length === 0}
            >
              {available.length === 0 ? (
                <option value="">لا يوجد موظف متاح</option>
              ) : (
                available.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))
              )}
            </Select>
          </div>
          <div className="flex w-24 flex-col gap-1.5">
            <Label>اليوم</Label>
            <Input
              type="number"
              min={1}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
          </div>
          <Button onClick={submit} disabled={pending || available.length === 0}>
            <Shuffle className="h-4 w-4" />
            {pending ? "جارٍ…" : "حوّل المجموعة"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
