import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  subject: string | null;
  priority: string | null;
  status: string | null;
  estimated_minutes: number | null;
}

interface UpcomingEventsPanelProps {
  tasks: Task[];
}

const getTypeLabel = (subject: string | null): { label: string; color: string } => {
  if (!subject) return { label: "TASK", color: "bg-muted text-muted-foreground" };
  
  const lower = subject.toLowerCase();
  if (lower.includes("lab")) return { label: "LAB", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" };
  if (lower.includes("lecture") || lower.includes("class")) return { label: "LECTURE", color: "bg-destructive/10 text-destructive border-destructive/30" };
  if (lower.includes("practice") || lower.includes("study")) return { label: "SELF-STUDY", color: "bg-muted text-muted-foreground border-muted" };
  if (lower.includes("exam") || lower.includes("test")) return { label: "EXAM", color: "bg-warning/10 text-warning border-warning/30" };
  return { label: "TASK", color: "bg-primary/10 text-primary border-primary/30" };
};

export function UpcomingEventsPanel({ tasks }: UpcomingEventsPanelProps) {
  const now = new Date();
  
  const upcomingTasks = tasks
    .filter((task) => {
      if (!task.due_date) return false;
      if (task.status === "completed") return false;
      return isAfter(parseISO(task.due_date), now);
    })
    .sort((a, b) => {
      if (!a.due_date || !b.due_date) return 0;
      return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Upcoming</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming tasks
          </p>
        ) : (
          upcomingTasks.map((task) => {
            const typeInfo = getTypeLabel(task.subject);
            const dueDate = task.due_date ? parseISO(task.due_date) : null;

            return (
              <div
                key={task.id}
                className="rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                    {typeInfo.label}
                  </Badge>
                  {dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {format(dueDate, "EEE")}
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-sm">{task.title}</h4>
                {(dueDate || task.estimated_minutes) && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {dueDate && format(dueDate, "h:mm a")}
                    {task.estimated_minutes && (
                      <span>• {task.estimated_minutes}m</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
