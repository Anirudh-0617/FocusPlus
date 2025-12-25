import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { AgendaTaskCard } from "./AgendaTaskCard";
import { Calendar, Loader2 } from "lucide-react";
import { startOfDay, endOfDay, isToday, parseISO } from "date-fns";
import { TaskReviewDialog } from "@/components/tasks/TaskReviewDialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  status: string | null;
  priority: string | null;
}

export function TodaysAgenda() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      fetchTodaysTasks();
    }
  }, [user]);

  const fetchTodaysTasks = async () => {
    try {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      // Fetch tasks due today OR tasks without due date that are pending
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user!.id)
        .or(`due_date.gte.${start},due_date.lte.${end},and(due_date.is.null,status.eq.pending)`)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Filter to only include tasks that are for today or have no due date
      const todaysTasks = (data || []).filter(task => {
        if (!task.due_date) return task.status === "pending";
        return isToday(parseISO(task.due_date));
      });

      setTasks(todaysTasks);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== "completed") {
      setReviewTask(task);
    }
  };

  const completeTaskWithReview = async (taskId: string, difficultyRating: number, comments: string) => {
    try {
      // Save the review
      const { error: reviewError } = await supabase.from("task_reviews").insert({
        task_id: taskId,
        user_id: user!.id,
        difficulty_rating: difficultyRating,
        comments: comments || null,
      });

      if (reviewError) throw reviewError;

      // Complete the task
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);

      if (taskError) throw taskError;

      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: "completed" } : t
      ));
      setReviewTask(null);
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const skipReviewAndComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: "completed" } : t
      ));
      setReviewTask(null);
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== "completed");

  return (
    <>
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t("dashboard.todaysAgenda")}
            </CardTitle>
            <Link to="/planner">
              <Button variant="link" size="sm" className="text-primary">
                {t("dashboard.viewCalendar")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t("dashboard.noTasksToday")}</p>
              <Link to="/tasks">
                <Button variant="link" className="mt-2">{t("tasks.addTask")}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <AgendaTaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskReviewDialog
        open={!!reviewTask}
        onOpenChange={(open) => !open && setReviewTask(null)}
        onSubmit={(rating, comments) => {
          if (reviewTask) {
            completeTaskWithReview(reviewTask.id, rating, comments);
          }
        }}
        onSkip={() => {
          if (reviewTask) {
            skipReviewAndComplete(reviewTask.id);
          }
        }}
        taskTitle={reviewTask?.title || ""}
        taskSubject={reviewTask?.subject || null}
      />
    </>
  );
}
