"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Lock, MapPin, Package } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

// The employee answers with a real status only (never "pending").
const ANSWER_OPTIONS = STATUS_OPTIONS.filter((o) => o.value !== "pending");

export function EmployeeCard({
  token,
  attempt,
  index,
}: {
  token: string;
  attempt: EmployeeAttempt;
  index: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AttemptStatus | "">("");
  const [note, setNote] = useState(attempt.note);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function commit() {
    if (!status) {
      toast.error("اختر حالة الرد أولاً");
      return;
    }
    startTransition(async () => {
      const res = await saveAttemptAction(token, attempt.id, status, note);
      if (res.ok) {
        toast.success(`تم اعتماد الحساب ${attempt.accountName}`);
      } else {
        toast.error(res.message);
        setConfirming(false);
      }
      // Refresh either way: on success the card disappears (only unanswered
      // accounts are shown); on a race it re-syncs with the server.
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
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
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as AttemptStatus)}
          disabled={pending || confirming}
        >
          <option value="" disabled>
            — اختر حالة الرد —
          </option>
          {ANSWER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ملاحظة / رد العميل…"
          disabled={pending || confirming}
        />

        {!confirming ? (
          <Button
            onClick={() => {
              if (!status) {
                toast.error("اختر حالة الرد أولاً");
                return;
              }
              setConfirming(true);
            }}
            disabled={pending || !status}
            className="w-full"
          >
            <Check className="h-4 w-4" />
            اعتماد الرد
          </Button>
        ) : (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-center text-xs font-medium text-amber-800">
              ⚠️ بعد الاعتماد لا يمكنك تعديل الرد أو الرجوع. تأكيد؟
            </p>
            <div className="flex gap-2">
              <Button onClick={commit} disabled={pending} className="flex-1">
                <Lock className="h-4 w-4" />
                {pending ? "جارٍ الاعتماد…" : "نعم، اعتمد نهائياً"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="flex-1"
              >
                تراجع
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
