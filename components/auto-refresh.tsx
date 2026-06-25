"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Keeps the employee page in sync with the latest distribution.
 *
 * - Manual button → a full page reload (guaranteed to fetch fresh data).
 * - Auto every `intervalMs`:
 *     • no accounts yet  → full reload (reliably picks up a new distribution),
 *     • has accounts     → silent router.refresh() so the employee's
 *       in-progress status/note edits are preserved.
 */
export function AutoRefresh({
  hasData,
  intervalMs = 30000,
}: {
  hasData: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (hasData) {
        router.refresh();
      } else {
        window.location.reload();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, hasData]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.location.reload()}
    >
      <RefreshCw className="h-4 w-4" />
      تحديث
    </Button>
  );
}
