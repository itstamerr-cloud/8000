import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";
import type { AttemptStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: AttemptStatus }) {
  return (
    <Badge className={cn(STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>
  );
}
