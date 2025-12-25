import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface SessionChange {
  session_id: string;
  subject: string;
  original_date: string;
  new_date: string;
  reason: string;
}

interface MissedSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: SessionChange[];
  summary: string;
}

export function MissedSessionDialog({
  open,
  onOpenChange,
  changes,
  summary,
}: MissedSessionDialogProps) {
  if (changes.length === 0) return null;

  const change = changes[0];
  const originalDate = parseISO(change.original_date);
  const newDate = parseISO(change.new_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Session Rescheduled
          </DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Before → After comparison */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            {/* Before */}
            <div className="text-center flex-1">
              <Badge variant="outline" className="mb-2 text-xs">
                BEFORE
              </Badge>
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {format(originalDate, "EEE, MMM d")}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{format(originalDate, "h:mm a")}</span>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />

            {/* After */}
            <div className="text-center flex-1">
              <Badge variant="default" className="mb-2 text-xs">
                AFTER
              </Badge>
              <div className="flex items-center justify-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {format(newDate, "EEE, MMM d")}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{format(newDate, "h:mm a")}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-lg border p-3">
            <h4 className="text-sm font-medium mb-1">{change.subject}</h4>
            <p className="text-xs text-muted-foreground">{change.reason}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
