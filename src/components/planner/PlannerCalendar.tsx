import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  subject: string | null;
  priority: string | null;
  status: string | null;
}

interface PlannerCalendarProps {
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function PlannerCalendar({ tasks, selectedDate, onSelectDate }: PlannerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), day);
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    onSelectDate(new Date());
  };

  return (
    <div className="rounded-xl border bg-card p-4 overflow-x-auto">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2" style={{ minWidth: "700px" }}>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1" style={{ minWidth: "700px" }}>
        {days.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative min-h-[120px] p-2 rounded-lg border border-border/50 transition-all text-left",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                !isCurrentMonth && "opacity-40",
                isSelected && "border-primary bg-primary/10",
                isDayToday && !isSelected && "bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                  isDayToday && "bg-primary text-primary-foreground",
                  isSelected && !isDayToday && "bg-secondary text-secondary-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Task Indicators */}
              {dayTasks.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "truncate rounded px-1.5 py-1 text-xs font-medium",
                        task.priority === "high" && "bg-destructive/30 text-foreground",
                        task.priority === "medium" && "bg-primary/30 text-foreground",
                        task.priority === "low" && "bg-success/30 text-foreground",
                        !task.priority && "bg-secondary text-foreground"
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1.5">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
