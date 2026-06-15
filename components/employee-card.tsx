"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, MapPin, Package } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_OPTIONS } from "@/lib/constants";
import type { AttemptStatus } from "@/lib/types";
import { saveAttemptAction } from "@/app/[token]/actions";

export interface EmployeeAttempt {
  id: string;
  accountName: string;
  region: string | null;
  sector: string | null;
  status: AttemptStatus;
  note: string;
}

export function EmployeeCard({
  token,
  attempt,
  index,
}: {
  token: string;
  attempt: EmployeeAttempt;
  index: number;
}) {
  const [status, setStatus] = useState<AttemptStatus>(attempt.status);
  const [note, setNote] = useState(attempt.note);
  const [pending, startTransition] = useTransition();
  const [savedStatus, setSavedStatus] = useState<AttemptStatus>(attempt.status);

  const dirty = status !== savedStatus || note !== attempt.note;

  function save() {
    startTransition(async () => {
      const res = await saveAttemptAction(token, attempt.id, status, note);
      if (res.ok) {
        toast.success(`تم حفظ الحساب ${attempt.accountName}`);
        setSavedStatus(status);
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {index}
          </span>
          <div>
            <p className="font-bold">{attempt.accountName}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {attempt.region ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {attempt.sector ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={savedStatus} />
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as AttemptStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ملاحظة / رد العميل…"
        />
        <Button onClick={save} disabled={pending || !dirty} className="w-full">
          <Check className="h-4 w-4" />
          {pending ? "جارٍ الحفظ…" : dirty ? "حفظ" : "محفوظ"}
        </Button>
      </CardContent>
    </Card>
  );
}
