"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { distributeDayAction } from "@/app/actions";

export function DistributeButton({ nextDay }: { nextDay: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run() {
    startTransition(async () => {
      const res = await distributeDayAction(nextDay);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      setConfirming(false);
      router.replace(`/?day=${nextDay}`);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          توزيع اليوم {nextDay}؟
        </span>
        <Button size="sm" onClick={run} disabled={pending}>
          {pending ? "جارٍ التوزيع…" : "تأكيد"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          إلغاء
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => setConfirming(true)}>
      <Send className="h-4 w-4" />
      وزّع خمسات اليوم
    </Button>
  );
}
