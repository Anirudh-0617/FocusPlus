import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Calendar, Check, X, Sparkles } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

interface ScheduleChange {
  task_id: string;
  task_title: string;
  original_date: string;
  new_due_date: string;
  reason: string;
}

interface ScheduleChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: ScheduleChange[];
  summary: string;
  onApply: () => void;
  applying: boolean;
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "Not set" || dateStr === "no_date") return "No date";
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return "No date";
    return format(date, "EEE, MMM d");
  } catch {
    return "No date";
  }
}

export function ScheduleChangesDialog({
  open,
  onOpenChange,
  changes,
  summary,
  onApply,
  applying,
}: ScheduleChangesDialogProps) {
  if (!changes || changes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Schedule Optimized
            </DialogTitle>
            <DialogDescription>
              {summary || "Your schedule is already well-balanced. No changes needed!"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Schedule Optimization
          </DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {changes.map((change, index) => (
              <Card key={index} className="p-4 bg-muted/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{change.task_title}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Badge variant="outline" className="text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(change.original_date)}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(change.new_due_date)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {change.reason}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onApply} disabled={applying}>
            {applying ? (
              <>Applying...</>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply {changes.length} Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
